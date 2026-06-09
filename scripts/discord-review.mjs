// Discord review helper. One command that gathers the four community surfaces
// since the last review so the assistant can read, discern, and draft replies:
//   - #purify-suggestions (forum, with thread bodies)
//   - #pdf-library (forum)
//   - #dogma-exegesis (forum)
//   - #main (text, the daily chat — to hear what people say about Purify)
//
// Read-only against Discord. The only thing it ever writes is the local
// review-state file, and only when you pass --mark.
//
// Usage:
//   node scripts/discord-review.mjs                 Review since last --mark (or 24h)
//   node scripts/discord-review.mjs --since ISO     Review since a specific time
//   node scripts/discord-review.mjs --mark          Review, then advance the cursor
//   node scripts/discord-review.mjs --json          Machine-readable output
//
// This is the read/discern half of the system. To respond, compose a plan for
// scripts/discord-act.mjs (see scripts/discord-review.README.md).

import fs from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.discord");
const STATE_PATH = path.join(process.cwd(), "scripts", ".discord-review-state.json");
const API = "https://discord.com/api/v10";

// The surfaces to review, in display order. `full` pulls each thread's replies.
const SURFACES = [
  { key: "SUGGESTIONS", id: "1506045471242846340", kind: "forum", full: true },
  { key: "PDF LIBRARY", id: "1513271235403059434", kind: "forum", full: false },
  { key: "DOGMA & EXEGESIS", id: "1513367980791300116", kind: "forum", full: true },
  { key: "MAIN CHAT", id: "1505301333278982184", kind: "text", full: false },
];

/* ─── Args ─────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
let asJson = false;
let mark = false;
let sinceArg = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--json") asJson = true;
  else if (a === "--mark") mark = true;
  else if (a === "--since") sinceArg = argv[++i];
  else {
    console.error(`Unknown argument: ${a}`);
    process.exit(2);
  }
}

/* ─── Env + state ──────────────────────────────────────────────────────── */

async function loadEnv() {
  let text;
  try {
    text = await fs.readFile(ENV_PATH, "utf8");
  } catch {
    console.error("Missing .env.discord. See scripts/discord-scan.SETUP.md.");
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

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function writeState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

/* ─── Discord REST ─────────────────────────────────────────────────────── */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function discord(p, token) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${p}`, {
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent":
          "PurifyDiscordReview/1.0 (+https://github.com/lifeistheosis/purifyapp)",
      },
    });
    if (res.status === 401) throw new Error("Token rejected (401).");
    if (res.status === 403) throw new Error("Refused (403): missing perms.");
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after")) || 1;
      if (attempt === 2) throw new Error("Rate limited; gave up.");
      await sleep(Math.ceil(retry * 1000) + 50);
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Discord ${res.status}: ${body.slice(0, 160)}`);
    }
    return res.json();
  }
}

async function recentMessages(channelId, token, sinceMs, cap = 50) {
  const page = await discord(
    `/channels/${channelId}/messages?limit=${Math.min(100, cap)}`,
    token,
  );
  return page
    .filter((m) => new Date(m.timestamp).getTime() >= sinceMs)
    .reverse(); // chronological
}

async function activeThreads(guildId, parentId, token) {
  const j = await discord(`/guilds/${guildId}/threads/active`, token);
  return (j.threads ?? []).filter((t) => t.parent_id === parentId);
}

async function archivedThreads(forumId, token) {
  try {
    const j = await discord(
      `/channels/${forumId}/threads/archived/public?limit=20`,
      token,
    );
    return j.threads ?? [];
  } catch {
    return [];
  }
}

/* ─── Gather ───────────────────────────────────────────────────────────── */

function newestTs(thread, messages) {
  let t = thread?.thread_metadata?.create_timestamp
    ? new Date(thread.thread_metadata.create_timestamp).getTime()
    : 0;
  for (const m of messages) t = Math.max(t, new Date(m.timestamp).getTime());
  return t;
}

async function gatherForum(surface, guildId, token, sinceMs, full) {
  const active = await activeThreads(guildId, surface.id, token);
  const archived = await archivedThreads(surface.id, token);
  const threads = [...active, ...archived];
  const out = [];
  for (const t of threads) {
    try {
      const msgs = await recentMessages(t.id, token, sinceMs, full ? 50 : 1);
      const created = t.thread_metadata?.create_timestamp
        ? new Date(t.thread_metadata.create_timestamp).getTime()
        : 0;
      const isNew = created >= sinceMs;
      // Include a thread if it was created in-window or has new messages.
      if (isNew || msgs.length > 0) {
        out.push({ thread: t, messages: msgs, isNew });
      }
      await sleep(60);
    } catch {
      /* skip unreadable thread */
    }
  }
  // Newest activity first.
  out.sort((a, b) => newestTs(b.thread, b.messages) - newestTs(a.thread, a.messages));
  return out;
}

/* ─── Render ───────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + "Z";
}

function renderMsg(m, indent) {
  const who = m.author?.username ? `@${m.author.username}` : "unknown";
  const lines = [`${indent}${fmtDate(m.timestamp)}  ${who}`];
  const content = (m.content || "").trim();
  if (content) for (const l of content.split("\n")) lines.push(`${indent}  ${l}`);
  if (m.embeds?.length)
    for (const e of m.embeds)
      lines.push(`${indent}  [embed] ${e.title || e.url || "(embed)"}`);
  if (m.attachments?.length)
    for (const a of m.attachments) lines.push(`${indent}  [file] ${a.filename}`);
  if (m.reactions?.length)
    lines.push(
      `${indent}  [reactions] ${m.reactions
        .map((r) => `${r.emoji?.name ?? "?"}x${r.count}`)
        .join(" ")}`,
    );
  return lines.join("\n");
}

/* ─── Main ─────────────────────────────────────────────────────────────── */

(async () => {
  const env = await loadEnv();
  const token = env.DISCORD_BOT_TOKEN;
  const guild = env.DISCORD_GUILD_ID;
  if (!token || !guild) {
    console.error("DISCORD_BOT_TOKEN and DISCORD_GUILD_ID required in .env.discord.");
    process.exit(1);
  }

  const state = await readState();
  const sinceMs = sinceArg
    ? new Date(sinceArg).getTime()
    : state.lastReview
      ? new Date(state.lastReview).getTime()
      : Date.now() - 24 * 60 * 60 * 1000;
  if (Number.isNaN(sinceMs)) {
    console.error(`Bad --since value: ${sinceArg}`);
    process.exit(2);
  }
  const sinceIso = new Date(sinceMs).toISOString();

  const result = { since: sinceIso, surfaces: [] };

  for (const s of SURFACES) {
    if (s.kind === "forum") {
      const threads = await gatherForum(s, guild, token, sinceMs, s.full);
      result.surfaces.push({ key: s.key, kind: "forum", threads });
    } else {
      const messages = await recentMessages(s.id, token, sinceMs, 100);
      result.surfaces.push({ key: s.key, kind: "text", messages });
    }
  }

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Discord review since ${sinceIso}\n${"=".repeat(60)}`);
    for (const s of result.surfaces) {
      console.log(`\n## ${s.key}`);
      if (s.kind === "forum") {
        if (s.threads.length === 0) {
          console.log("  (no new or active threads in window)");
          continue;
        }
        for (const { thread, messages, isNew } of s.threads) {
          console.log(
            `\n-- ${isNew ? "NEW " : ""}thread: ${thread.name}  (${thread.id})`,
          );
          if (messages.length === 0) console.log("     (no messages in window)");
          else for (const m of messages) console.log(renderMsg(m, "     "));
        }
      } else {
        if (s.messages.length === 0) {
          console.log("  (no messages in window)");
          continue;
        }
        for (const m of s.messages) console.log(renderMsg(m, "  "));
      }
    }
    console.log(`\n${"=".repeat(60)}`);
  }

  if (mark) {
    await writeState({ ...state, lastReview: new Date().toISOString() });
    if (!asJson) console.log(`Marked. Next review starts from ${new Date().toISOString()}.`);
  }
})().catch((e) => {
  console.error(`discord-review: ${e.message}`);
  process.exit(1);
});
