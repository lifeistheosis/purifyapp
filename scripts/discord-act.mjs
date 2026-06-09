// Discord act helper. Posts replies and closes threads according to a
// JSON plan file. Read-only counterpart is discord-scan.mjs; this one
// makes visible, public changes to your Discord — so it defaults to
// dry-run and only fires with --execute.
//
// Usage:
//   node scripts/discord-act.mjs <plan.json>            Dry-run (default)
//   node scripts/discord-act.mjs <plan.json> --execute  Actually post + close
//
// Plan file shape (array of action objects):
//   [
//     {
//       "thread_id": "1234567890",
//       "thread_name": "(optional, for human-readable diff)",
//       "post": "Message to send. NO em-dashes.",
//       "close": false
//     },
//     {
//       "thread_id": "987654321",
//       "post": "Optional message before close.",
//       "close": true
//     }
//   ]
//
// Behaviour:
//   - If `post` is set, sends that as a message to the thread first.
//   - If `close` is true, archives AND locks the thread (the Discord
//     definition of "closed" for forum threads).
//   - Post happens BEFORE close, so the final word in the thread is
//     the bot's confirmation message rather than a silent lock.
//   - Em-dash check: if any plan message contains "—" the script
//     refuses to execute (project house style: no em-dashes).
//
// Required Discord permissions on the bot's role:
//   View Channels (1024)             — already have
//   Read Message History (65536)     — already have
//   Send Messages (2048)             — NEW
//   Send Messages in Threads (274877906944)  — NEW
//   Manage Threads (17179869184)     — NEW (to archive + lock)

import fs from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.discord");
const API = "https://discord.com/api/v10";

// Reverent, em-dash-free response templates. `m` is the optional mention
// prefix ("<@authorId> " or ""). `v` is the action's `vars` object.
// Pick one with `"template": "<name>"` in the plan; freeform `post` overrides.
const TEMPLATES = {
  ship: (v, m) =>
    `${m}Shipped in ${v.version ?? "the latest update"}. ${v.feature ? v.feature + ". " : ""}${v.link ? v.link + " " : ""}Thank you for the suggestion.`,
  confirm: (v, m) =>
    `${m}Confirmed for ${v.version ?? "an upcoming update"}. We will ping this thread when it ships. Thank you for the suggestion.`,
  defer: (v, m) =>
    `${m}Thank you for this. It is a good idea, and we are holding it for a later patch so we can give it the care it deserves. We will keep the thread in view.`,
  reject: (v, m) =>
    `${m}Thank you for taking the time to share this. After prayerful thought we have decided not to take it forward, for this reason: ${v.reason ?? "it falls outside what Purify is meant to be"}. We hope you understand, and we are grateful for your love for Purify and the Church.`,
  thanks: (v, m) => `${m}Thank you, this is noted and under consideration.`,
  info: (v, m) =>
    `${m}Thank you. Could you say a little more about ${v.ask ?? "what you have in mind"}? It will help us scope it well.`,
};

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const planPath = args.find((a) => !a.startsWith("--"));

if (!planPath) {
  console.error(
    "Usage: node scripts/discord-act.mjs <plan.json> [--execute]\n" +
      "Default is dry-run; --execute actually posts and closes threads.",
  );
  process.exit(2);
}

/* ─── Load env ─────────────────────────────────────────────────────────── */

async function loadEnv() {
  let text;
  try {
    text = await fs.readFile(ENV_PATH, "utf8");
  } catch {
    console.error("Missing .env.discord.");
    process.exit(1);
  }
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    env[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return env;
}

/* ─── Load plan ────────────────────────────────────────────────────────── */

async function loadPlan() {
  const raw = await fs.readFile(planPath, "utf8");
  const plan = JSON.parse(raw);
  if (!Array.isArray(plan)) {
    throw new Error(
      `Plan file ${planPath} must contain a JSON array of actions.`,
    );
  }
  // Structural validation only. The em-dash guard runs later, on the FINAL
  // rendered message (so template `vars` like `reason` are checked too).
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i];
    if (typeof a !== "object" || a === null) {
      throw new Error(`Action ${i} is not an object.`);
    }
    if (!a.thread_id) {
      throw new Error(`Action ${i} missing thread_id.`);
    }
    if (a.post && typeof a.post !== "string") {
      throw new Error(`Action ${i} 'post' must be a string.`);
    }
    if (a.template && !TEMPLATES[a.template]) {
      throw new Error(
        `Action ${i} unknown template "${a.template}". Use one of: ${Object.keys(TEMPLATES).join(", ")}.`,
      );
    }
  }
  return plan;
}

/* ─── Discord helpers ──────────────────────────────────────────────────── */

async function discord(method, p, token, body) {
  const init = {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent":
        "PurifyDiscordAct/1.0 (+https://github.com/lifeistheosis/purifyapp)",
    },
  };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${p}`, init);
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after")) || 1;
      if (attempt === 2) throw new Error("Rate limited; gave up after retries.");
      await new Promise((r) => setTimeout(r, retry * 1000 + 100));
      continue;
    }
    if (res.status === 403) {
      throw new Error(
        "Discord refused (403). The bot's role lacks the permission it needs. " +
          "Re-invite with broader perms or grant Send Messages, Send Messages " +
          "in Threads, and Manage Threads on the bot's role in Server Settings → Roles.",
      );
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Discord ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
      );
    }
    // Some endpoints return empty body (204); guard accordingly.
    const t = await res.text();
    return t ? JSON.parse(t) : {};
  }
}

async function getThread(id, token) {
  return discord("GET", `/channels/${id}`, token);
}

async function postMessage(threadId, content, token) {
  return discord("POST", `/channels/${threadId}/messages`, token, { content });
}

async function unarchiveThread(threadId, token) {
  // Older forum threads get auto-archived after their inactivity window.
  // Discord refuses POST on archived threads, even with Send Messages
  // perms; you have to unarchive (PATCH archived:false) first. Requires
  // Manage Threads on the bot's role.
  return discord("PATCH", `/channels/${threadId}`, token, {
    archived: false,
  });
}

async function starterAuthorId(threadId, token) {
  // For forum threads the opening post's message id equals the thread id, so
  // this fetches the original author for an @mention.
  try {
    const msg = await discord("GET", `/channels/${threadId}/messages/${threadId}`, token);
    return msg?.author?.id ?? null;
  } catch {
    return null;
  }
}

// Resolve an action's final message: freeform `post` wins; else render the
// named template with its vars and the mention prefix.
function renderMessage(action, mentionPrefix) {
  if (action.post) return action.post;
  if (action.template) return TEMPLATES[action.template](action.vars ?? {}, mentionPrefix);
  return null;
}

async function closeThread(threadId, token) {
  // Archive AND lock so no further replies can post and Discord moves the
  // thread to the archived list.
  return discord("PATCH", `/channels/${threadId}`, token, {
    archived: true,
    locked: true,
  });
}

/* ─── Main ─────────────────────────────────────────────────────────────── */

(async () => {
  const env = await loadEnv();
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("DISCORD_BOT_TOKEN missing in .env.discord.");
    process.exit(1);
  }

  const plan = await loadPlan();

  console.log(
    `Plan: ${plan.length} action${plan.length === 1 ? "" : "s"}  (mode: ${
      execute ? "EXECUTE" : "DRY-RUN"
    })\n`,
  );

  // Pass 1: resolve each action's thread, mention prefix, final message, and
  // close behavior. Then guard the RENDERED text for em-dashes before anything
  // posts. `reject` closes by default; an explicit `close` always overrides.
  const resolved = [];
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i];
    const r = { idx: i, action: a, meta: null, message: null, close: false, error: null };
    try {
      r.meta = await getThread(a.thread_id, token);
    } catch (e) {
      r.error = `cannot reach thread: ${e.message}`;
      resolved.push(r);
      continue;
    }
    let mention = "";
    if (a.mention) {
      const id = await starterAuthorId(a.thread_id, token);
      if (id) mention = `<@${id}> `;
    }
    r.message = renderMessage(a, mention);
    r.close = a.close ?? a.template === "reject";
    resolved.push(r);
  }

  const dashHits = resolved.filter((r) => r.message && r.message.includes("—"));
  if (dashHits.length) {
    console.error("Refusing to run: rendered messages contain em-dashes ('—'):");
    for (const r of dashHits) {
      console.error(`  action[${r.idx}]: ${r.action.thread_name ?? r.action.thread_id}`);
    }
    console.error("Replace each em-dash with a period or a comma and re-run.");
    process.exit(1);
  }

  // Pass 2: print (and, with --execute, perform) each action.
  for (const r of resolved) {
    const a = r.action;
    const label = a.thread_name ?? r.meta?.name ?? a.thread_id;
    console.log(`[${r.idx + 1}/${plan.length}]  ${label}  (${a.thread_id})`);
    if (r.error) {
      console.log(`         ✗ ${r.error}\n`);
      continue;
    }
    if (r.message) {
      console.log(`         post:  ${r.message.replace(/\n/g, " ").slice(0, 220)}`);
    }
    if (r.close) {
      console.log(`         close: archive + lock`);
    }

    if (!execute) {
      console.log("");
      continue;
    }

    try {
      // If the thread is already archived and we need to post or close,
      // unarchive first. Discord refuses any write on archived threads
      // (even with Send Messages) until they are revived.
      const wasArchived = Boolean(r.meta.thread_metadata?.archived);
      if (wasArchived && (r.message || r.close)) {
        await unarchiveThread(a.thread_id, token);
        await new Promise((res) => setTimeout(res, 250));
      }
      if (r.message) {
        await postMessage(a.thread_id, r.message, token);
        await new Promise((res) => setTimeout(res, 250)); // courtesy spacing
      }
      if (r.close) {
        await closeThread(a.thread_id, token);
      }
      console.log("         ✓ done\n");
    } catch (e) {
      console.log(`         ✗ failed: ${e.message}\n`);
    }
  }

  if (!execute) {
    console.log(
      "(dry-run finished, nothing posted. Add --execute to actually send.)",
    );
  }
})().catch((e) => {
  console.error(`discord-act: ${e.message}`);
  process.exit(1);
});
