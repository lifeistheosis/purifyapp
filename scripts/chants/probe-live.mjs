// Asks the live website and the bucket for everything an installed app needs
// to play a chant, the way each app asks: as its own origin, and a recording
// in parts. Read-only. Run it after a push to main, and whenever a reader
// says a chant will not play:
//
//   node scripts/chants/probe-live.mjs [--site https://purifyapp.net]
//
// It exits 1 and names what failed. What it asks for is the record in
// scripts/chants/store-builds.json, the same one
// lib/chants/__tests__/storeBuilds.test.ts holds the repository to: a test
// can say the repository is right, only this says the website is.
//
// A plain request that answers 200 proves little. An app is another origin
// (https://localhost on Android, capacitor://localhost on the iPhone), so its
// web view refuses a list the server sent without Access-Control-Allow-Origin
// and a recording sent without Cross-Origin-Resource-Policy, and a phone's
// player asks for a recording in parts and needs a 206 back.
import fs from "node:fs";

const record = JSON.parse(fs.readFileSync(new URL("./store-builds.json", import.meta.url), "utf8"));
const at = process.argv.indexOf("--site");
const SITE = (at > 0 ? process.argv[at + 1] : record.site).replace(/\/$/, "");
const TIMEOUT_MS = 20000;

let failures = 0;
const ok = (what) => console.log(`  ok    ${what}`);
const bad = (what, why) => {
  failures += 1;
  console.log(`  FAIL  ${what}: ${why}`);
};

async function ask(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual" });
  return res;
}

/** The server lets this origin read the answer. */
function readableBy(res, origin) {
  const allow = res.headers.get("access-control-allow-origin");
  return allow === "*" || allow === origin;
}

function listAsStoreBuildsReadIt(value) {
  if (!value || typeof value !== "object") return null;
  const strings = (a) => Array.isArray(a) && a.every((s) => typeof s === "string");
  if (value.v !== 1 || !strings(value.live) || !strings(value.pulled)) return null;
  return value;
}

function timingAsOldBuildsReadIt(v) {
  return Boolean(v) && v.v === 1 && typeof v.durationSec === "number" && Array.isArray(v.lines) &&
    v.lines.every((l) => l && typeof l.at === "number" && typeof l.end === "number" && typeof l.text === "string");
}

console.log(`The list, ${SITE}${record.list.path}`);
let list = null;
for (const origin of record.appOrigins) {
  const what = `as ${origin}`;
  try {
    const res = await ask(`${SITE}${record.list.path}`, { Origin: origin });
    const body = res.status === 200 ? listAsStoreBuildsReadIt(await res.json().catch(() => null)) : null;
    const kept = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? NaN);
    if (res.status !== 200) bad(what, `answered ${res.status}`);
    else if (!body) bad(what, "the answer is not the list as the store builds read it (version 1)");
    else if (!readableBy(res, origin)) bad(what, `Access-Control-Allow-Origin is ${res.headers.get("access-control-allow-origin") ?? "missing"}, so the app's web view refuses it`);
    else if (!(kept <= record.list.keptAtMostSeconds)) bad(what, `kept ${kept} seconds, so a takedown is slow to spread`);
    else ok(`${what}: ${body.live.length} live, ${body.pulled.length} taken down`);
    list = body ?? list;
  } catch (e) {
    bad(what, e.message);
  }
}

/** What each address answered, so a build that asks for the same one says so again without asking again. */
const seen = new Map();
const again = (key) => {
  const line = seen.get(key);
  if (line) console.log(`  ${line.startsWith("FAIL") ? "FAIL " : "ok   "} ${line.replace(/^(FAIL|ok)\s+/, "")} (asked above)`);
  return Boolean(line);
};
for (const build of record.builds) {
  console.log(`\n${build.name}`);
  for (const r of build.recordings) {
    if (list && list.pulled.includes(r.ref)) {
      console.log(`  down  ${r.ref} (taken down in the list)`);
      continue;
    }
    if (list && !list.live.includes(r.ref)) {
      bad(r.ref, "in neither list: the app shows it as not available");
      continue;
    }
    const audio = r.audio.startsWith("/") ? `${SITE}${r.audio}` : r.audio;
    for (const origin of record.appOrigins) {
      const key = `${audio} ${origin}`;
      if (again(key)) continue;
      const what = `${r.ref} recording as ${origin}`;
      const before = failures;
      try {
        // The first two bytes, as a phone's player asks before it plays.
        const res = await ask(audio, { Origin: origin, Range: "bytes=0-1" });
        await res.arrayBuffer();
        const type = res.headers.get("content-type") ?? "";
        const corp = res.headers.get("cross-origin-resource-policy");
        if (res.status !== 206) bad(what, `answered ${res.status}, not a part of the file (206)`);
        else if (!/^audio\//.test(type)) bad(what, `is ${type}, not sound`);
        else if (!readableBy(res, origin) && corp !== "cross-origin") bad(what, "neither Access-Control-Allow-Origin nor Cross-Origin-Resource-Policy lets the app have it");
        else ok(what);
      } catch (e) {
        bad(what, e.message);
      }
      seen.set(key, `${failures > before ? "FAIL" : "ok"} ${what}`);
    }
    if (!r.timing) continue;
    for (const origin of record.appOrigins) {
      const key = `${r.timing} ${origin}`;
      if (again(key)) continue;
      const what = `${r.ref} timing as ${origin}`;
      const before = failures;
      try {
        const res = await ask(`${SITE}${r.timing}`, { Origin: origin });
        const body = res.status === 200 ? await res.json().catch(() => null) : null;
        if (res.status !== 200) bad(what, `answered ${res.status}`);
        else if (!timingAsOldBuildsReadIt(body)) bad(what, "not a version 1 timing file, the only kind this build reads");
        else if (!readableBy(res, origin)) bad(what, "no Access-Control-Allow-Origin for the app");
        else ok(what);
      } catch (e) {
        bad(what, e.message);
      }
      seen.set(key, `${failures > before ? "FAIL" : "ok"} ${what}`);
    }
  }
}

console.log(failures ? `\n${failures} failed.` : "\nEvery installed build can read what it asks for.");
process.exit(failures ? 1 : 0);
