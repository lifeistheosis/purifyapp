// Discord scan helper. Polls the Discord REST API for recent messages in
// text channels and forum threads of a configured guild, on demand.
//
// Usage:
//   node scripts/discord-scan.mjs <channel>       Scan one channel by name
//   node scripts/discord-scan.mjs all              Scan every readable surface
//   node scripts/discord-scan.mjs --list           List every channel + forum
//
// Flags:
//   --limit N        Max messages per channel/thread (default 25; cap 100)
//   --since ISO      Only messages newer than this timestamp
//   --json           Emit JSON instead of the human-readable feed
//   --full           When scanning a forum, also dive into each thread's replies
//                    (default just shows the opening post)
//
// Examples:
//   node scripts/discord-scan.mjs suggestions
//   node scripts/discord-scan.mjs all --since 2026-06-01T00:00:00Z
//   node scripts/discord-scan.mjs forum --full --limit 50
//   node scripts/discord-scan.mjs --list
//
// What this exists for: Claude (the assistant collaborating on this codebase)
// calls this script during dev sessions to see what the Purify Discord
// community has been asking for. No long-running bot, no hosting; just a
// registered Discord application's bot token used against the REST API.

import fs from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.discord");
const API = "https://discord.com/api/v10";
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

// Discord channel types (https://discord.com/developers/docs/resources/channel)
const TYPE = {
  GUILD_TEXT: 0,
  DM: 1,
  GUILD_VOICE: 2,
  GROUP_DM: 3,
  GUILD_CATEGORY: 4,
  GUILD_ANNOUNCEMENT: 5,
  ANNOUNCEMENT_THREAD: 10,
  PUBLIC_THREAD: 11,
  PRIVATE_THREAD: 12,
  GUILD_STAGE_VOICE: 13,
  GUILD_DIRECTORY: 14,
  GUILD_FORUM: 15,
  GUILD_MEDIA: 16,
};

const TEXT_LIKE = new Set([TYPE.GUILD_TEXT, TYPE.GUILD_ANNOUNCEMENT]);
const FORUM_LIKE = new Set([TYPE.GUILD_FORUM, TYPE.GUILD_MEDIA]);
const THREAD_LIKE = new Set([
  TYPE.PUBLIC_THREAD,
  TYPE.PRIVATE_THREAD,
  TYPE.ANNOUNCEMENT_THREAD,
]);

/* ─── Args ─────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
let listOnly = false;
let asJson = false;
let full = false;
let allHistory = false; // paginate through every page (no per-call cap)
let limit = DEFAULT_LIMIT;
let since = null;
let positional = null;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--list") listOnly = true;
  else if (a === "--json") asJson = true;
  else if (a === "--full") full = true;
  else if (a === "--all-history") allHistory = true;
  else if (a === "--limit") limit = parseInt(argv[++i], 10);
  else if (a === "--since") since = argv[++i];
  else if (!a.startsWith("--") && positional === null) positional = a;
  else if (!a.startsWith("--")) {
    console.error(`Unexpected positional: ${a}`);
    process.exit(2);
  } else {
    console.error(`Unknown flag: ${a}`);
    process.exit(2);
  }
}

if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
limit = Math.min(MAX_LIMIT, limit);

if (!listOnly && !positional) {
  console.error(
    "Usage:\n" +
      "  node scripts/discord-scan.mjs <channel>     Scan one channel by name\n" +
      "  node scripts/discord-scan.mjs all            Scan every readable surface\n" +
      "  node scripts/discord-scan.mjs --list         List every channel + forum\n" +
      "Flags: --limit N  --since ISO  --json  --full\n" +
      "See scripts/discord-scan.SETUP.md.",
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
      "Missing .env.discord. See scripts/discord-scan.SETUP.md for setup.",
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
    const v = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    env[k] = v;
  }
  return env;
}

function manualChannels(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    const m = k.match(/^DISCORD_CHANNEL_(.+)$/);
    if (m && v) out[m[1].toLowerCase()] = v;
  }
  return out;
}

/* ─── Discord REST helpers ─────────────────────────────────────────────── */

async function discord(p, token) {
  // Auto-retry on 429 with the server-supplied delay, up to twice.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${p}`, {
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent":
          "PurifyDiscordScan/1.0 (+https://github.com/lifeistheosis/purifyapp)",
      },
    });
    if (res.status === 401) {
      throw new Error(
        "Discord rejected the token (401). Check DISCORD_BOT_TOKEN in .env.discord.",
      );
    }
    if (res.status === 403) {
      throw new Error(
        "Discord refused the request (403). The bot probably is not invited or lacks " +
          "View Channels / Read Message History on this channel.",
      );
    }
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after")) || 1;
      if (attempt === 2) throw new Error(`Rate limited; gave up after retries.`);
      await sleep(Math.ceil(retry * 1000) + 50);
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Discord ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
      );
    }
    return res.json();
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchGuildChannels(guildId, token) {
  return discord(`/guilds/${guildId}/channels`, token);
}

async function fetchActiveThreads(guildId, token) {
  const j = await discord(`/guilds/${guildId}/threads/active`, token);
  return j.threads ?? [];
}

async function fetchArchivedPublicThreads(forumId, token) {
  try {
    const j = await discord(
      `/channels/${forumId}/threads/archived/public?limit=20`,
      token,
    );
    return j.threads ?? [];
  } catch {
    return []; // 403 / 404 on some forums is fine; skip silently
  }
}

async function fetchChannelMeta(channelId, token) {
  return discord(`/channels/${channelId}`, token);
}

async function fetchMessages(channelId, token, opts = {}) {
  const lim = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT));
  const url = `/channels/${channelId}/messages?limit=${lim}`;
  const messages = await discord(url, token);
  return messages.reverse(); // newest-last → chronological
}

// Paginate to the start of the channel's history. Discord returns
// newest-first in batches of up to 100; we walk backwards via the
// `?before=<message_id>` parameter until a short page comes back.
// `sinceMs` allows early exit once we've crossed the cutoff date.
async function fetchAllMessages(channelId, token, sinceMs) {
  const collected = [];
  let before = null;
  while (true) {
    let url = `/channels/${channelId}/messages?limit=${MAX_LIMIT}`;
    if (before) url += `&before=${before}`;
    const page = await discord(url, token); // newest-first
    if (page.length === 0) break;
    let stopAfter = false;
    for (const m of page) {
      if (sinceMs && new Date(m.timestamp).getTime() < sinceMs) {
        stopAfter = true;
        continue; // skip this and everything older
      }
      collected.push(m);
    }
    if (stopAfter || page.length < MAX_LIMIT) break;
    before = page[page.length - 1].id;
    await sleep(80); // courtesy spacing
  }
  return collected.reverse(); // newest-last → chronological
}

// Skip rules for full audits: logs, tickets, automod, voice transcripts.
// These produce huge volumes of system noise that drown out actual
// conversation. Pattern set by name; the user can grep the live list
// with `discord:list` and refine.
const AUDIT_SKIP_NAME = /(-log$|-logs$|^ticket-|^automod$|^jail-log$|^messages-logs$|^server-logs$|^events-logs$|^hi-bye-logs$|^channels-logs$|^roles-logs$|^emojis-logs$|^voice-logs$|^invites-logs$|^users-logs$)/i;
const AUDIT_SKIP_CATEGORY = /(logs?|:mods)/i;

function shouldSkipForAudit(channel, categoriesById) {
  if (AUDIT_SKIP_NAME.test(channel.name || "")) return true;
  if (channel.parent_id) {
    const cat = categoriesById.get(channel.parent_id);
    if (cat && AUDIT_SKIP_CATEGORY.test(cat.name || "")) return true;
  }
  return false;
}

/* ─── Rendering ────────────────────────────────────────────────────────── */

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function shortType(t) {
  if (t === TYPE.GUILD_TEXT) return "text";
  if (t === TYPE.GUILD_ANNOUNCEMENT) return "announce";
  if (t === TYPE.GUILD_FORUM) return "forum";
  if (t === TYPE.GUILD_MEDIA) return "media";
  if (t === TYPE.GUILD_CATEGORY) return "cat";
  if (t === TYPE.PUBLIC_THREAD) return "thread";
  if (t === TYPE.PRIVATE_THREAD) return "thread(priv)";
  return `?(${t})`;
}

function renderChannelHeader(meta, messageCount, indent = "") {
  const lines = [];
  lines.push(`${indent}# #${meta.name || "(unknown)"}  [${shortType(meta.type)}]  (${meta.id})`);
  if (meta.topic) lines.push(`${indent}# topic: ${meta.topic}`);
  lines.push(
    `${indent}# ${messageCount} message${messageCount === 1 ? "" : "s"}`,
  );
  return lines.join("\n");
}

function renderMessages(messages, indent = "") {
  const out = [];
  for (const m of messages) {
    const author = m.author?.global_name || m.author?.username || "unknown";
    const handle = m.author?.username ? `@${m.author.username}` : "";
    out.push(`${indent}── ${fmtDate(m.timestamp)}  ${author} ${handle}`.trimEnd());
    const content = (m.content || "").trim();
    if (content) {
      for (const line of content.split("\n")) out.push(`${indent}   ${line}`);
    }
    if (m.attachments?.length) {
      for (const a of m.attachments)
        out.push(`${indent}   [attachment] ${a.filename}  ${a.url}`);
    }
    if (m.embeds?.length) {
      for (const e of m.embeds) {
        const title = e.title || e.author?.name || "(embed)";
        const url = e.url ? `  ${e.url}` : "";
        out.push(`${indent}   [embed] ${title}${url}`);
      }
    }
    if (m.reactions?.length) {
      const r = m.reactions
        .map((x) => `${x.emoji?.name ?? "?"}×${x.count}`)
        .join("  ");
      out.push(`${indent}   [reactions] ${r}`);
    }
    out.push("");
  }
  return out.join("\n");
}

function applySince(messages) {
  if (!since) return messages;
  const sinceMs = new Date(since).getTime();
  if (Number.isNaN(sinceMs)) return messages;
  return messages.filter((m) => new Date(m.timestamp).getTime() >= sinceMs);
}

/* ─── List mode ────────────────────────────────────────────────────────── */

async function runList(env) {
  const token = env.DISCORD_BOT_TOKEN;
  const guild = env.DISCORD_GUILD_ID;
  if (!guild) {
    // Fall back to listing the manual overrides only.
    const channels = manualChannels(env);
    const names = Object.keys(channels).sort();
    if (names.length === 0) {
      console.error(
        "No DISCORD_GUILD_ID set, and no DISCORD_CHANNEL_* overrides. Set the " +
          "guild ID for auto-discovery, or add at least one channel override.",
      );
      process.exit(1);
    }
    console.log("Configured channels (manual overrides):");
    for (const name of names) {
      const id = channels[name];
      try {
        const meta = await fetchChannelMeta(id, token);
        console.log(`  ${name.padEnd(14)}  #${meta.name}  [${shortType(meta.type)}]  (${id})`);
      } catch (e) {
        console.log(`  ${name.padEnd(14)}  [error: ${e.message}]  (${id})`);
      }
    }
    return;
  }

  const channels = await fetchGuildChannels(guild, token);
  const byParent = new Map();
  for (const c of channels) {
    const p = c.parent_id || "_root";
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(c);
  }
  const categories = channels
    .filter((c) => c.type === TYPE.GUILD_CATEGORY)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const rootChildren = (byParent.get("_root") ?? [])
    .filter((c) => c.type !== TYPE.GUILD_CATEGORY)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  console.log(`Guild ${guild} — readable surfaces`);
  console.log("");
  if (rootChildren.length) {
    console.log("(uncategorised)");
    for (const c of rootChildren) {
      console.log(`  #${c.name.padEnd(28)} [${shortType(c.type)}]  ${c.id}`);
    }
  }
  for (const cat of categories) {
    const children = (byParent.get(cat.id) ?? []).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    console.log(`\n[${cat.name}]`);
    for (const c of children) {
      console.log(`  #${c.name.padEnd(28)} [${shortType(c.type)}]  ${c.id}`);
    }
  }

  // Surface forum threads under their parent forum.
  const forums = channels.filter((c) => FORUM_LIKE.has(c.type));
  if (forums.length) {
    console.log("\n— Forum threads —");
    const activeThreads = await fetchActiveThreads(guild, token);
    for (const f of forums) {
      const threads = activeThreads.filter((t) => t.parent_id === f.id);
      const archived = await fetchArchivedPublicThreads(f.id, token);
      console.log(`\n  ${f.name}  (active: ${threads.length}, archived sample: ${archived.length})`);
      for (const t of threads) {
        console.log(`    🟢 ${t.name}  ${t.id}`);
      }
      for (const t of archived) {
        console.log(`    ⚪ ${t.name}  ${t.id}`);
      }
    }
  }
}

/* ─── Single-channel scan ──────────────────────────────────────────────── */

async function runOne(env, name) {
  const token = env.DISCORD_BOT_TOKEN;
  const guild = env.DISCORD_GUILD_ID;
  const manual = manualChannels(env);

  // Resolve name → channel ID.
  // Priority: manual override > exact channel-name match > startsWith match.
  let id = manual[name.toLowerCase()];
  let resolvedFrom = "manual override";

  if (!id && guild) {
    const channels = await fetchGuildChannels(guild, token);
    const lc = name.toLowerCase();
    const exact = channels.find((c) => c.name?.toLowerCase() === lc);
    const partial = channels.find((c) => c.name?.toLowerCase().includes(lc));
    const hit = exact || partial;
    if (hit) {
      id = hit.id;
      resolvedFrom = `guild lookup → #${hit.name}`;
    }
  }

  if (!id) {
    const known = Object.keys(manual);
    console.error(
      `Unknown channel "${name}". ` +
        (guild
          ? `Tried guild lookup and ${known.length ? "manual overrides (" + known.join(", ") + ")" : "no overrides set"}.\n`
          : `No DISCORD_GUILD_ID set for auto-discovery; manual overrides: ${known.join(", ") || "(none)"}.\n`) +
        "Either set DISCORD_GUILD_ID or add a DISCORD_CHANNEL_* row.",
    );
    process.exit(1);
  }

  const meta = await fetchChannelMeta(id, token);

  // Forum / media → enumerate threads, scan each.
  if (FORUM_LIKE.has(meta.type)) {
    await scanForum(meta, token, guild);
    return;
  }

  // Regular text-like or thread.
  const messages = applySince(await fetchMessages(id, token, { limit }));
  if (asJson) {
    console.log(
      JSON.stringify({ resolvedFrom, channel: meta, messages }, null, 2),
    );
  } else {
    console.log(`(resolved from: ${resolvedFrom})\n`);
    console.log(renderChannelHeader(meta, messages.length));
    console.log("");
    console.log(renderMessages(messages));
  }
}

async function scanForum(meta, token, guildId) {
  const activeAll = guildId ? await fetchActiveThreads(guildId, token) : [];
  const active = activeAll.filter((t) => t.parent_id === meta.id);
  const archived = await fetchArchivedPublicThreads(meta.id, token);
  const threads = [...active, ...archived];

  const collected = [];
  for (const t of threads) {
    try {
      const msgs = applySince(
        await fetchMessages(t.id, token, { limit: full ? limit : 1 }),
      );
      collected.push({ thread: t, messages: msgs });
      await sleep(60);
    } catch (e) {
      collected.push({ thread: t, messages: [], error: e.message });
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ forum: meta, threads: collected }, null, 2));
    return;
  }
  console.log(
    `# Forum ${meta.name}  (${meta.id}) — ${threads.length} thread${threads.length === 1 ? "" : "s"} ` +
      `(${active.length} active, ${archived.length} archived sample)`,
  );
  if (meta.topic) console.log(`# topic: ${meta.topic}`);
  console.log("");
  for (const c of collected) {
    const t = c.thread;
    console.log(`── thread: ${t.name}  (${t.id})`);
    if (c.error) {
      console.log(`   [skipped: ${c.error}]`);
      console.log("");
      continue;
    }
    if (c.messages.length === 0) {
      console.log(`   [no messages in window]`);
      console.log("");
      continue;
    }
    console.log(renderMessages(c.messages, "   "));
  }
}

/* ─── Scan-all ─────────────────────────────────────────────────────────── */

async function runAll(env) {
  const token = env.DISCORD_BOT_TOKEN;
  const guild = env.DISCORD_GUILD_ID;
  if (!guild) {
    console.error(
      "Cannot scan all without DISCORD_GUILD_ID. Add it to .env.discord " +
        "(right-click the server icon in Discord → Copy Server ID).",
    );
    process.exit(1);
  }

  const channels = await fetchGuildChannels(guild, token);
  const categoriesById = new Map();
  for (const c of channels) {
    if (c.type === TYPE.GUILD_CATEGORY) categoriesById.set(c.id, c);
  }
  const allTextLike = channels.filter((c) => TEXT_LIKE.has(c.type));
  const allForums = channels.filter((c) => FORUM_LIKE.has(c.type));

  // For full-history audits, drop log channels / tickets / automod /
  // mod-private surfaces so the synthesis isn't drowned in system noise.
  const textLike = allHistory
    ? allTextLike.filter((c) => !shouldSkipForAudit(c, categoriesById))
    : allTextLike;
  const forums = allHistory
    ? allForums.filter((c) => !shouldSkipForAudit(c, categoriesById))
    : allForums;
  const skipped = allHistory
    ? [...allTextLike, ...allForums].filter((c) =>
        shouldSkipForAudit(c, categoriesById),
      )
    : [];

  const sinceMs = since ? new Date(since).getTime() : null;
  const sinceValid = sinceMs && !Number.isNaN(sinceMs) ? sinceMs : null;

  const result = { textChannels: [], forums: [], skipped };

  // Text-like channels. In --all-history mode we paginate to the start
  // of the channel (or to `--since`); otherwise just the latest `limit`.
  for (const c of textLike) {
    try {
      const messages = allHistory
        ? await fetchAllMessages(c.id, token, sinceValid)
        : applySince(await fetchMessages(c.id, token, { limit }));
      result.textChannels.push({ channel: c, messages });
      await sleep(80);
    } catch (e) {
      result.textChannels.push({ channel: c, messages: [], error: e.message });
    }
  }

  // Forums: enumerate threads, then scan each. In --all-history mode every
  // thread is paginated to its start; otherwise just the latest few.
  const activeAll = await fetchActiveThreads(guild, token);
  for (const f of forums) {
    const active = activeAll.filter((t) => t.parent_id === f.id);
    const archived = await fetchArchivedPublicThreads(f.id, token);
    const threads = [...active, ...archived];
    const collected = [];
    for (const t of threads) {
      try {
        const msgs = allHistory
          ? await fetchAllMessages(t.id, token, sinceValid)
          : applySince(
              await fetchMessages(t.id, token, { limit: full ? limit : 1 }),
            );
        collected.push({ thread: t, messages: msgs });
        await sleep(80);
      } catch (e) {
        collected.push({ thread: t, messages: [], error: e.message });
      }
    }
    result.forums.push({ forum: f, threads: collected });
  }

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human-readable feed.
  console.log(
    `Full scan of guild ${guild}: ${textLike.length} text channel(s), ${forums.length} forum(s)${allHistory ? "  [all history]" : ""}`,
  );
  if (since) console.log(`Since: ${since}`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} log/ticket/mod surface(s):`);
    for (const s of skipped) console.log(`  - #${s.name}  (${s.id})`);
  }
  console.log("");

  for (const { channel, messages, error } of result.textChannels) {
    console.log(renderChannelHeader(channel, messages.length));
    if (error) console.log(`# [skipped: ${error}]`);
    else if (messages.length === 0) console.log(`# [no messages in window]`);
    else {
      console.log("");
      console.log(renderMessages(messages));
    }
    console.log("");
  }

  for (const { forum, threads } of result.forums) {
    const total = threads.reduce((n, t) => n + t.messages.length, 0);
    console.log(
      `# Forum ${forum.name}  (${forum.id}) — ${threads.length} thread(s), ${total} message(s)`,
    );
    if (forum.topic) console.log(`# topic: ${forum.topic}`);
    console.log("");
    for (const { thread, messages, error } of threads) {
      console.log(`── thread: ${thread.name}  (${thread.id})`);
      if (error) {
        console.log(`   [skipped: ${error}]`);
        console.log("");
        continue;
      }
      if (messages.length === 0) {
        console.log(`   [no messages in window]`);
        console.log("");
        continue;
      }
      console.log(renderMessages(messages, "   "));
    }
    console.log("");
  }
}

/* ─── Main ─────────────────────────────────────────────────────────────── */

(async () => {
  const env = await loadEnv();
  if (!env.DISCORD_BOT_TOKEN) {
    console.error("DISCORD_BOT_TOKEN is empty in .env.discord.");
    process.exit(1);
  }

  if (listOnly) return runList(env);
  if (positional?.toLowerCase() === "all") return runAll(env);
  return runOne(env, positional);
})().catch((e) => {
  console.error(`discord-scan: ${e.message}`);
  process.exit(1);
});
