// Discord scan helper. Polls the Discord REST API for recent messages in
// channels listed in `.env.discord` and prints them as either a compact
// human-readable feed or as JSON.
//
// Usage:
//   node scripts/discord-scan.mjs <channel> [--limit N] [--json] [--since ISO]
//   node scripts/discord-scan.mjs --list
//
// `<channel>` is the suffix of any `DISCORD_CHANNEL_*` line in .env.discord
// (case-insensitive). `--list` enumerates the channels the bot can see.
//
// Examples:
//   node scripts/discord-scan.mjs suggestions
//   node scripts/discord-scan.mjs forum --limit 100
//   node scripts/discord-scan.mjs general --json
//   node scripts/discord-scan.mjs bugs --since 2026-06-01T00:00:00Z
//   node scripts/discord-scan.mjs --list
//
// Why this exists: Claude (the assistant collaborating on this codebase)
// calls this script during dev sessions to see what the Purify Discord
// community has been asking for, then folds the requests into the work in
// flight. No long-running bot, no hosting — just a registered Discord
// application's bot token used against the REST API on demand.

import fs from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.discord");
const API_BASE = "https://discord.com/api/v10";
const MAX_LIMIT = 100; // Discord's per-call cap; paginate for more.

/* ─── Args ─────────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
let listOnly = false;
let asJson = false;
let limit = 50;
let since = null;
let channelArg = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--list") listOnly = true;
  else if (a === "--json") asJson = true;
  else if (a === "--limit") limit = parseInt(args[++i], 10);
  else if (a === "--since") since = args[++i];
  else if (!a.startsWith("--")) channelArg = a;
  else {
    console.error(`Unknown flag: ${a}`);
    process.exit(2);
  }
}

if (!listOnly && !channelArg) {
  console.error(
    "Usage: node scripts/discord-scan.mjs <channel> [--limit N] [--json] [--since ISO]\n" +
      "       node scripts/discord-scan.mjs --list\n" +
      "See .env.discord.example for setup.",
  );
  process.exit(2);
}

/* ─── Env loading ──────────────────────────────────────────────────────── */

async function loadEnv() {
  let text;
  try {
    text = await fs.readFile(ENV_PATH, "utf8");
  } catch {
    console.error(
      `Missing .env.discord. Copy .env.discord.example to .env.discord and ` +
        `fill in DISCORD_BOT_TOKEN plus your channel IDs.`,
    );
    process.exit(1);
  }
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    env[k] = v;
  }
  return env;
}

function channelMap(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    const m = k.match(/^DISCORD_CHANNEL_(.+)$/);
    if (m && v) out[m[1].toLowerCase()] = v;
  }
  return out;
}

/* ─── Discord REST helpers ─────────────────────────────────────────────── */

async function discord(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": "PurifyDiscordScan/1.0 (+https://github.com/lifeistheosis/purifyapp)",
    },
  });
  if (res.status === 401) {
    throw new Error(
      "Discord rejected the token (401). Check DISCORD_BOT_TOKEN in .env.discord, " +
        "and confirm you copied the bot token (not the application client secret).",
    );
  }
  if (res.status === 403) {
    throw new Error(
      "Discord refused the request (403). The bot is probably not invited to the " +
        "server or lacks View Channels / Read Message History on the channel.",
    );
  }
  if (res.status === 429) {
    const retry = res.headers.get("retry-after") || "?";
    throw new Error(`Rate limited; retry after ${retry}s.`);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchChannelMeta(channelId, token) {
  return discord(`/channels/${channelId}`, token);
}

async function fetchMessages(channelId, token, opts = {}) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? 50));
  let url = `/channels/${channelId}/messages?limit=${limit}`;
  if (opts.before) url += `&before=${opts.before}`;
  const messages = await discord(url, token);
  // Discord returns newest-first; reverse so the caller sees chronological.
  return messages.reverse();
}

/* ─── Rendering ────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function renderHuman(meta, messages) {
  const out = [];
  out.push(`# #${meta.name || "(unknown)"}  (${meta.id})`);
  if (meta.topic) out.push(`# topic: ${meta.topic}`);
  out.push(`# ${messages.length} message${messages.length === 1 ? "" : "s"}`);
  out.push("");
  for (const m of messages) {
    const author = m.author?.global_name || m.author?.username || "unknown";
    const handle = m.author?.username ? `@${m.author.username}` : "";
    out.push(`── ${fmtDate(m.timestamp)}  ${author} ${handle}`.trimEnd());
    const content = (m.content || "").trim();
    if (content) {
      for (const line of content.split("\n")) out.push(`   ${line}`);
    }
    // Surface attachments + embeds + reactions briefly.
    if (m.attachments?.length) {
      for (const a of m.attachments)
        out.push(`   [attachment] ${a.filename}  ${a.url}`);
    }
    if (m.embeds?.length) {
      for (const e of m.embeds) {
        const title = e.title || e.author?.name || "(embed)";
        const url = e.url ? `  ${e.url}` : "";
        out.push(`   [embed] ${title}${url}`);
      }
    }
    if (m.reactions?.length) {
      const r = m.reactions
        .map((x) => `${x.emoji?.name ?? "?"}×${x.count}`)
        .join("  ");
      out.push(`   [reactions] ${r}`);
    }
    if (m.thread) {
      out.push(`   [thread] ${m.thread.name} (${m.thread.id})`);
    }
    out.push("");
  }
  return out.join("\n");
}

/* ─── Main ─────────────────────────────────────────────────────────────── */

(async () => {
  const env = await loadEnv();
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("DISCORD_BOT_TOKEN is empty in .env.discord.");
    process.exit(1);
  }
  const channels = channelMap(env);

  if (listOnly) {
    const names = Object.keys(channels).sort();
    if (names.length === 0) {
      console.error(
        "No DISCORD_CHANNEL_* entries in .env.discord. Add at least one " +
          "(e.g. DISCORD_CHANNEL_SUGGESTIONS=<id>) and re-run.",
      );
      process.exit(1);
    }
    console.log("Configured channels:");
    for (const name of names) {
      const id = channels[name];
      try {
        const meta = await fetchChannelMeta(id, token);
        console.log(`  ${name.padEnd(14)}  #${meta.name}  (${id})`);
      } catch (e) {
        console.log(`  ${name.padEnd(14)}  [error: ${e.message}]  (${id})`);
      }
    }
    return;
  }

  const key = channelArg.toLowerCase();
  const channelId = channels[key];
  if (!channelId) {
    console.error(
      `Unknown channel "${channelArg}". Known: ${Object.keys(channels).join(", ") || "(none)"}.\n` +
        `Add DISCORD_CHANNEL_${channelArg.toUpperCase()}=<id> to .env.discord.`,
    );
    process.exit(1);
  }

  const [meta, messages] = await Promise.all([
    fetchChannelMeta(channelId, token),
    fetchMessages(channelId, token, { limit }),
  ]);

  let filtered = messages;
  if (since) {
    const sinceMs = new Date(since).getTime();
    if (!Number.isNaN(sinceMs)) {
      filtered = messages.filter(
        (m) => new Date(m.timestamp).getTime() >= sinceMs,
      );
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ channel: meta, messages: filtered }, null, 2));
  } else {
    console.log(renderHuman(meta, filtered));
  }
})().catch((e) => {
  console.error(`discord-scan: ${e.message}`);
  process.exit(1);
});
