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
  // House style: no em-dashes in posted messages.
  const violations = [];
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
    if (a.post && a.post.includes("—")) {
      violations.push({ idx: i, name: a.thread_name ?? a.thread_id });
    }
  }
  if (violations.length) {
    console.error(
      "Refusing to run: the following actions contain em-dashes ('—'):",
    );
    for (const v of violations) {
      console.error(`  action[${v.idx}]: ${v.name}`);
    }
    console.error("Replace each em-dash with a period or a comma and re-run.");
    process.exit(1);
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

  for (let i = 0; i < plan.length; i++) {
    const a = plan[i];
    let meta;
    try {
      meta = await getThread(a.thread_id, token);
    } catch (e) {
      console.log(
        `[${i + 1}/${plan.length}]  ✗  cannot reach thread ${a.thread_id}: ${e.message}`,
      );
      continue;
    }
    const label = a.thread_name ?? meta.name ?? a.thread_id;
    console.log(`[${i + 1}/${plan.length}]  ${label}  (${a.thread_id})`);
    if (a.post) {
      console.log(`         post:  ${a.post.replace(/\n/g, " ").slice(0, 200)}`);
    }
    if (a.close) {
      console.log(`         close: archive + lock`);
    }

    if (!execute) {
      console.log("");
      continue;
    }

    try {
      // If the thread is already archived and we need to post or close,
      // unarchive first. Without this, POST returns 403 even with Send
      // Messages permission — Discord refuses any write on archived
      // threads until they are revived.
      const wasArchived = Boolean(meta.thread_metadata?.archived);
      if (wasArchived && (a.post || a.close)) {
        await unarchiveThread(a.thread_id, token);
        await new Promise((r) => setTimeout(r, 250));
      }
      if (a.post) {
        await postMessage(a.thread_id, a.post, token);
        await new Promise((r) => setTimeout(r, 250)); // courtesy spacing
      }
      if (a.close) {
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
