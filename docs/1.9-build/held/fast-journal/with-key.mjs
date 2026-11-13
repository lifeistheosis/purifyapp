// Runs one command with the main web's public Supabase address and anon key in its environment,
// read from purifyapp.net's own scripts (CLAUDE.md, "The public key for an export, always").
// The key is checked to be the anon role, and is printed and written nowhere.
import { spawn } from "node:child_process";
const SITE = "https://purifyapp.net";
const get = async (u) => (await fetch(u, { headers: { "user-agent": "Mozilla/5.0" } })).text();
const html = await get(SITE + "/");
const srcs = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]))];
let url = null, key = null;
const role = (jwt) => { try { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).role; } catch { return null; } };
for (const s of srcs) {
  const js = await get(SITE + s);
  url ??= /https:\/\/[a-z0-9]{20}\.supabase\.co/.exec(js)?.[0] ?? null;
  for (const m of js.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) if (role(m[0]) === "anon") key ??= m[0];
  if (url && key) break;
}
if (!url || !key) { console.error(`not found: address ${url ? "yes" : "no"}, anon key ${key ? "yes" : "no"} (${srcs.length} scripts read)`); process.exit(2); }
console.error(`the public address and an anon key were read from ${SITE}'s own scripts (role checked: anon); neither is printed`);
const [cmd, ...args] = process.argv.slice(2);
const child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } });
child.on("exit", (code) => process.exit(code ?? 1));
