// One-off: pull the full message history for a single thread/channel ID.
// Bot-token + REST only, paginates via ?before=. Writes JSON to stdout.
//
//   node scripts/discord-pull-thread.mjs <threadId> > out.json
//
// Used during research / dogma audit when scanForum's per-thread cap (100)
// is too small. Not wired into npm scripts; called by hand.

import fs from "node:fs/promises";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.discord");
const API = "https://discord.com/api/v10";

async function loadEnv() {
  const txt = await fs.readFile(ENV_PATH, "utf8");
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

async function discord(p, token) {
  const r = await fetch(API + p, {
    headers: { Authorization: `Bot ${token}`, "User-Agent": "PurifyAudit/1.0" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${p}`);
  return r.json();
}

async function pullAll(channelId, token) {
  const out = [];
  let before = null;
  while (true) {
    let url = `/channels/${channelId}/messages?limit=100`;
    if (before) url += `&before=${before}`;
    const page = await discord(url, token);
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < 100) break;
    before = page[page.length - 1].id;
    await new Promise((r) => setTimeout(r, 80));
  }
  return out.reverse();
}

const id = process.argv[2];
if (!id) {
  console.error("usage: node scripts/discord-pull-thread.mjs <threadId>");
  process.exit(1);
}

const env = await loadEnv();
const meta = await discord(`/channels/${id}`, env.DISCORD_BOT_TOKEN);
const messages = await pullAll(id, env.DISCORD_BOT_TOKEN);
process.stdout.write(JSON.stringify({ channel: meta, messages }, null, 2));
