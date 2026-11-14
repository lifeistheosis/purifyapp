// The dev probe (Updates 40's gotcha): next dev as the native build, with the store's switches and the
// main web's public anon key read from purifyapp.net's own scripts into this one command's environment.
// proxy.ts must be set aside by the caller while it runs, and put back after.
import { spawn } from "node:child_process";
process.chdir("/home/user/purifyapp");
const { gateSwitches } = await import("/home/user/purifyapp/scripts/lib/store-switches.mjs");
const SITE = "https://purifyapp.net";
const REF = "avbqyvjgcrucjwevwixt";
const html = await (await fetch(`${SITE}/`)).text();
const chunks = [...new Set(html.match(/\/_next\/static\/chunks\/[^"']+\.js/g) ?? [])];
let url = null;
let key = null;
for (const c of chunks) {
  const js = await (await fetch(SITE + c)).text();
  url ??= js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0] ?? null;
  for (const jwt of js.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []) {
    let p = null;
    try { p = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")); } catch { continue; }
    if (p.role && p.role !== "anon") throw new Error(`refused: role ${p.role}`);
    if (p.role === "anon" && p.ref === REF) key = jwt;
  }
  if (url && key) break;
}
if (!url || !key || !url.includes(REF)) throw new Error("no public key found");
const { env: wanted } = gateSwitches("android", process.cwd());
const env = { ...process.env, BUILD_TARGET: "android", NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key };
for (const [k, v] of Object.entries(wanted)) {
  if (v === null) delete env[k];
  else if (v !== "main web") env[k] = v;
}
console.log("dev probe: anon key of the main web's project, not printed");
const child = spawn("npx", ["next", "dev", "-p", "3100"], { env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
