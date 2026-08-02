// Assign the "Beta Testers" role to the Discord users who provided an email
// in their support ticket (read from beta-scan.json). Idempotent: re-adding
// an existing role is a no-op. Requires the bot to have Manage Roles (the
// Purify bot has Administrator) and a higher role position than the target.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://discord.com/api/v10";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env.discord");
const SCAN_PATH = path.join(__dirname, "..", "beta-scan.json");
const ROLE_ID = "1516906693160734760"; // "Beta Testers"
const REASON = "Beta tester signup via support ticket (email provided)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const env = Object.fromEntries(
  (await fs.readFile(ENV_PATH, "utf8"))
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const token = env.DISCORD_BOT_TOKEN;
const guild = env.DISCORD_GUILD_ID;

const scan = JSON.parse(await fs.readFile(SCAN_PATH, "utf8"));
const users = new Map();
for (const t of scan)
  for (const e of t.emails || [])
    if (e.userId && !users.has(e.userId))
      users.set(e.userId, { username: e.username, email: e.email, ticket: t.ticket });

console.log(`Assigning "Beta Testers" to ${users.size} users...\n`);
for (const [uid, info] of users) {
  const res = await fetch(`${API}/guilds/${guild}/members/${uid}/roles/${ROLE_ID}`, {
    method: "PUT",
    headers: { Authorization: `Bot ${token}`, "User-Agent": "PurifyBetaScan/1.0", "X-Audit-Log-Reason": REASON },
  });
  const ok = res.status === 204;
  console.log(`${ok ? "OK " : `FAIL(${res.status})`}  @${info.username}  (${info.email})  ${ok ? "" : (await res.text()).slice(0, 120)}`);
  await sleep(350);
}
