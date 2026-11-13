// The gate's export: cut as the store builds cut theirs (the arbiter,
// 2026-11-13). Every NEXT_PUBLIC value the store workflow writes, as written;
// for each it takes from a secret, the gate's named stand-in
// (scripts/lib/store-switches.mjs); the main web's public address and anon key
// read from purifyapp.net's own scripts into this one command's environment
// (his standing word, "yes key always"), checked to be the anon role, printed
// and written nowhere. It builds the export the way the workflow does
// (scripts/native-build.mjs), then says what it matched and what it stood in
// for, with the release-day switches it found in the tree.
//
//   node scripts/gate/export.mjs [--platform android|ios] [--cwd <checkout>] [--dry] [--allow-dirty]
//
// --cwd cuts from another checkout (a worktree at the head the arbiter names),
// reading that checkout's own workflows. --dry says what it would use and cuts
// nothing. A tree that is not clean is refused unless --allow-dirty.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { gateSwitches } from "../lib/store-switches.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const PLATFORM = flag("--platform") ?? "android";
const CWD = path.resolve(flag("--cwd") ?? process.cwd());
const DRY = argv.includes("--dry");
const DIRTY = argv.includes("--allow-dirty");
const SITE = "https://purifyapp.net";
const REF = "avbqyvjgcrucjwevwixt"; // the main web's project (AGENTS.md)

const head = spawnSync("git", ["-C", CWD, "rev-parse", "--short=9", "HEAD"], { encoding: "utf8" }).stdout.trim();
const dirty = spawnSync("git", ["-C", CWD, "status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }).stdout.trim();
if (dirty && !DIRTY && !DRY) throw new Error(`${CWD} is not clean; the gate cuts from a named head (--allow-dirty to cut anyway)`);

const { env: wanted, said } = gateSwitches(PLATFORM, CWD);

/** The release-day switches in the tree being cut, as the record names them. */
function releaseSwitches() {
  const read = (file, re) => {
    const f = path.join(CWD, file);
    return fs.existsSync(f) ? re.exec(fs.readFileSync(f, "utf8"))?.[1] ?? "?" : "?";
  };
  return [
    `CAMPAIGNS_OPENING ${read("lib/campaigns/flags.ts", /export const CAMPAIGNS_OPENING[^=]*=\s*("[^"]+")/)}`,
    `PICTURES_IN_STORE_BUILDS ${read("lib/campaigns/flags.ts", /export const PICTURES_IN_STORE_BUILDS[^=]*=\s*(\w+)/)}`,
    `CAMPAIGN_NOTICES ${read("lib/campaigns/noticesOn.ts", /export const CAMPAIGN_NOTICES[^=]*=\s*(\w+)/)}`,
    `JULY_GROUPS_GO ${read("lib/campaigns/julyRows.ts", /export const JULY_GROUPS_GO[^=]*=\s*(\w+)/)}`,
    `CARE_NOTE_SEND ${read("lib/campaigns/careOn.ts", /export const CARE_NOTE_SEND[^=]*=\s*(\w+)/)}`,
  ];
}

/** The main web's public address and anon key, from its own scripts; refused unless the anon role of its project. */
async function mainWebKey() {
  const html = await (await fetch(`${SITE}/`)).text();
  const chunks = [...new Set(html.match(/\/_next\/static\/chunks\/[^"']+\.js/g) ?? [])];
  let url = null;
  let key = null;
  for (const c of chunks) {
    const js = await (await fetch(SITE + c)).text();
    url ??= js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0] ?? null;
    for (const jwt of js.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []) {
      let p = null;
      try {
        p = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
      } catch {
        continue;
      }
      if (p.role && p.role !== "anon") throw new Error(`refused: the main web's scripts carry a key with the role ${p.role}; only the anon role is read`);
      if (p.role === "anon" && p.ref === REF) key = jwt;
    }
    if (url && key) break;
  }
  if (!url || !key || !url.includes(REF)) throw new Error("the main web's public address and anon key were not found in its own scripts");
  return { url, key };
}

console.log(`The gate's export for ${PLATFORM}, cut from ${head}${dirty ? " (not clean)" : ""} in ${CWD}, with the store workflow's own switches:`);
for (const l of said) console.log(`  ${l}`);
console.log(`The release-day switches in the tree: ${releaseSwitches().join(", ")}`);
if (DRY) process.exit(0);

const env = { ...process.env };
for (const [k, v] of Object.entries(wanted)) {
  if (v === null) delete env[k];
  else if (v !== "main web") env[k] = v;
}
const { url, key } = await mainWebKey();
env.NEXT_PUBLIC_SUPABASE_URL = url;
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
console.log(`The key: the anon role of the main web's project (${REF}), read from its own scripts; not printed, not saved.`);
const child = spawn(process.execPath, ["scripts/native-build.mjs", "--platform", PLATFORM], { cwd: CWD, env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
