#!/usr/bin/env node
// Cut the native export as the store build is cut (shop and community on, Plus
// enforced with a stand-in key), with the main web's PUBLIC Supabase address
// and anon key read from purifyapp.net's own scripts into this one command's
// environment (the owner's word, 2026-11-13: "yes key always"). The key is
// checked to be the anon role and is never printed, written or committed.
import { spawnSync } from "node:child_process";

const SITE = "https://purifyapp.net";
const get = async (u) => {
  const r = await fetch(u, { headers: { "user-agent": "export-builder" } });
  if (!r.ok) throw new Error(`${u}: ${r.status}`);
  return r.text();
};

const html = await get(SITE + "/");
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/[^"'\\ )]+\.js/g)].map((m) => m[0]))];
let url = null;
let key = null;
for (const c of chunks) {
  if (url && key) break;
  let js;
  try { js = await get(SITE + c); } catch { continue; }
  url ??= js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0] ?? null;
  for (const m of js.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const body = JSON.parse(Buffer.from(m[0].split(".")[1], "base64url").toString("utf8"));
      if (body.role === "anon") { key = m[0]; break; }
      if (body.role) throw new Error(`a key of role ${body.role} is in the site's scripts: stopping`);
    } catch (e) { if (String(e.message).includes("stopping")) throw e; }
  }
}
if (!url || !key) throw new Error(`not found (address: ${Boolean(url)}, anon key: ${Boolean(key)}) in ${chunks.length} scripts`);
console.log("address found, key found, role anon");

const r = spawnSync("node", ["scripts/native-build.mjs", "--platform", "android"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
    NEXT_PUBLIC_SITE_URL: SITE,
    NEXT_PUBLIC_SHOP_ENABLED: "1",
    NEXT_PUBLIC_COMMUNITY_ENABLED: "1",
    NEXT_PUBLIC_PLUS_ENFORCED_ANDROID: "1",
    NEXT_PUBLIC_REVENUECAT_ANDROID_KEY: "walk",
  },
});
process.exit(r.status ?? 1);
