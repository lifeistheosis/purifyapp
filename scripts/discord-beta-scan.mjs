// One-off: read every #ticket-* channel, extract email addresses and the
// Discord user who posted each. Read-only (View Channels + Read Message
// History). Output JSON to stdout. Reuses .env.discord.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://discord.com/api/v10";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env.discord");
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadEnv() {
  const text = await fs.readFile(ENV_PATH, "utf8");
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

async function discord(p, token) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API}${p}`, {
      headers: { Authorization: `Bot ${token}`, "User-Agent": "PurifyBetaScan/1.0" },
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after")) || 1;
      await sleep(Math.ceil(retry * 1000) + 50);
      continue;
    }
    if (!res.ok) throw new Error(`Discord ${res.status} on ${p}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
  throw new Error(`Rate limited on ${p}`);
}

async function allMessages(channelId, token) {
  const out = [];
  let before = null;
  for (let i = 0; i < 20; i++) {
    const q = `?limit=100${before ? `&before=${before}` : ""}`;
    const batch = await discord(`/channels/${channelId}/messages${q}`, token);
    if (!batch.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
    before = batch[batch.length - 1].id;
    await sleep(120);
  }
  return out;
}

const env = await loadEnv();
const token = env.DISCORD_BOT_TOKEN;
const guildId = env.DISCORD_GUILD_ID;
if (!token || !guildId) throw new Error("Missing DISCORD_BOT_TOKEN / DISCORD_GUILD_ID in .env.discord");

const channels = await discord(`/guilds/${guildId}/channels`, token);
const tickets = channels
  .filter((c) => typeof c.name === "string" && /^ticket-\d+/i.test(c.name))
  .sort((a, b) => a.name.localeCompare(b.name));

const results = [];
for (const ch of tickets) {
  let msgs;
  try {
    msgs = await allMessages(ch.id, token);
  } catch (e) {
    results.push({ ticket: ch.name, error: String(e.message || e) });
    continue;
  }
  const opener = msgs.length ? msgs[msgs.length - 1].author : null; // oldest msg
  const found = [];
  for (const m of msgs) {
    // Gather text from message content AND any embeds (Ticket Tool posts the
    // opener's form answers — often the email — inside an embed, not content).
    let text = m.content || "";
    for (const emb of m.embeds || []) {
      text += "\n" + [emb.title, emb.description, emb.footer?.text].filter(Boolean).join("\n");
      for (const f of emb.fields || []) text += "\n" + (f.name || "") + "\n" + (f.value || "");
    }
    const emails = text.match(EMAIL_RE) || [];
    for (const e of emails) {
      // Attribute to the message author, unless this is a Ticket Tool/bot
      // embed — then attribute to the ticket opener (mentioned in the embed).
      const mentioned = m.mentions?.find((u) => !u.bot);
      const who = m.author?.bot ? (mentioned || null) : m.author;
      found.push({
        email: e.toLowerCase(),
        userId: who?.id ?? null,
        username: who?.username ?? null,
        global_name: who?.global_name ?? null,
        fromBotEmbed: !!m.author?.bot,
      });
    }
  }
  results.push({
    ticket: ch.name,
    channelId: ch.id,
    messageCount: msgs.length,
    opener: opener ? { userId: opener.id, username: opener.username, global_name: opener.global_name ?? null } : null,
    emails: found,
  });
  await sleep(150);
}

console.log(JSON.stringify(results, null, 2));
