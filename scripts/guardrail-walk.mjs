// The pre-build gate, part 2: every screen of the export through every rule
// checkMock keeps (docs/1.9-build/notes/build-93.md, "The pre-build gate";
// CLAUDE.md, "No test build reaches him until it passes the pre-build gate").
//
// One page of every route the export carries (scripts/lib/screens.mjs), on a
// phone, reached the app's way (scripts/lib/shell-server.mjs: a cold start at
// the front door, then the router, nothing from outside the bundle, which is
// also the app with no network). Each is held, whole, to checkMock's rules
// (scripts/mock-check.mjs): contrast and placeholders on all five palettes,
// 44px to the touch, no glyph for an icon, colours that follow the palette,
// no gold, no side stripe, mirrored in Arabic, no em dash, no rays, no
// sparkle, the three looks build 93 added: no empty picture, no dashed
// placeholder box, no keyboard hint on a phone, and no control's name cut
// short.
//
// The gate walks the export cut the house's way, which sells Plus on
// Android, twice (scripts/lib/sells-plus.mjs): SELLS_PLUS=1 makes the page
// the Android shell, a new reader with no Plus, as he walks; without it the
// same export locks nothing.
//
// A piece meant to break a rule says so on itself, with its reason
// (data-mock-allow, data-mock-why), and is listed as allowed. Screens drawn
// only after a tap (a sheet, a menu) are reached by the tap walk
// (scripts/tap-walk.mjs), not here.
//
// --online lets the app read the main web as a reader's phone does (GET
// only, the main web alone, never a write): the pictures it streams rather
// than carries (lib/media/streamed.ts) then arrive, as they do for a reader
// with a signal. Without it the walk is the app with no network.
//
//   npm run build:android, then:
//   NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs [out dir] [--only /path,/path] [--workers 3] [--json file] [--online]

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { checkMock } from "./mock-check.mjs";
import { screens } from "./lib/screens.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";
import { SELLS_PLUS, asAndroidShell, checkSells, readerWords } from "./lib/sells-plus.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const ONLY = flag("--only")?.split(",") ?? null;
const WORKERS = Math.max(1, Number(flag("--workers") ?? 3));
const JSON_OUT = flag("--json");
const ONLINE = argv.includes("--online");
if (ONLINE) argv.splice(argv.indexOf("--online"), 1);
const OUT = path.resolve(argv[0] ?? "out");
checkSells(OUT);
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

const list = ONLY ?? screens(OUT);
console.log(`${list.length} screens on a phone, ${WORKERS} at a time, ${ONLINE ? "reading the main web" : "with no network"}, ${readerWords()}`);

// The main web, read as a phone reads it: GET only, each address once.
const fetched = new Map();
async function mainWeb(route) {
  const req = route.request();
  if (req.method() !== "GET") return route.abort();
  const url = req.url();
  try {
    if (!fetched.has(url)) {
      fetched.set(
        url,
        (async () => {
          const headers = Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !["host", "connection"].includes(k.toLowerCase())));
          const r = await fetch(url, { headers });
          const kept = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k.toLowerCase())));
          return { status: r.status, headers: kept, body: Buffer.from(await r.arrayBuffer()) };
        })(),
      );
    }
    return route.fulfill(await fetched.get(url));
  } catch {
    return route.abort();
  }
}

// The cloud sessions carry their own Chromium (as openPhone in scripts/mock-check.mjs); elsewhere Playwright's.
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

/** One screen's verdict: what failed, what could not be measured, what is allowed by name. */
async function walkOne(page, at) {
  try {
    await go(page, at, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const r = await checkMock(page, "body");
    return { at, failures: r.failures, unmeasured: r.unmeasured, allowed: r.allowed };
  } catch (e) {
    return { at, error: String(e).split("\n")[0].slice(0, 160), failures: [], unmeasured: [], allowed: [] };
  }
}

const results = [];
let done = 0;
const queue = [...list];
async function worker() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  if (SELLS_PLUS) await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  // Registered after the shell's, so it answers the main web's addresses first.
  // The store builds read purifyapp.net; a local export without
  // NEXT_PUBLIC_SITE_URL reads the same service at its Render address.
  if (ONLINE) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**"]) await ctx.route(at, mainWeb);
  let page = await ctx.newPage();
  for (let at = queue.shift(); at; at = queue.shift()) {
    const r = await walkOne(page, at);
    results.push(r);
    done += 1;
    if (done % 20 === 0) console.log(`  ${done} of ${list.length}`);
    // A screen that would not settle leaves the next one a fresh page.
    if (r.error) {
      await page.close().catch(() => {});
      page = await ctx.newPage();
    }
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close();

results.sort((a, b) => a.at.localeCompare(b.at));

// The same thing failing in the same way on many screens is one finding (a
// shared bar, a shared card): said once, with the screens it was seen on.
// Contrast is one finding per piece: its palettes together, at its worst.
const findings = new Map();
for (const r of results) {
  for (const f of r.failures) {
    const measured = f.check === "contrast" || f.check === "placeholder";
    const key = `${f.check}\u0000${f.what}\u0000${measured ? "" : f.detail}`;
    const entry = findings.get(key) ?? { check: f.check, what: f.what, detail: f.detail, palettes: new Set(), screens: new Set() };
    if (measured) {
      const ratio = (d) => Number(/^([\d.]+):1/.exec(d)?.[1] ?? Infinity);
      if (ratio(f.detail) < ratio(entry.detail)) entry.detail = f.detail;
    }
    if (f.palette) entry.palettes.add(f.palette);
    entry.screens.add(r.at);
    findings.set(key, entry);
  }
}
const byCheck = new Map();
for (const f of findings.values()) byCheck.set(f.check, [...(byCheck.get(f.check) ?? []), f]);

const errors = results.filter((r) => r.error);
const clean = results.filter((r) => !r.error && r.failures.length === 0);
console.log(`\n${results.length - errors.length} screens measured, ${clean.length} with nothing failed`);
for (const [check, list] of [...byCheck].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${check}: ${list.length} finding(s)`);
  for (const f of list.sort((a, b) => b.screens.size - a.screens.size)) {
    const where = [...f.screens];
    const palettes = f.palettes.size ? ` [${[...f.palettes].join(", ")}]` : "";
    console.log(`  ${f.what}: ${f.detail}${palettes}`);
    console.log(`    on ${where.length} screen(s): ${where.slice(0, 6).join(" ")}${where.length > 6 ? " ..." : ""}`);
  }
}
if (errors.length) {
  console.log(`\nnot measured (${errors.length}):`);
  for (const r of errors) console.log(`  ${r.at}: ${r.error}`);
}
// Allowed by name and reason: said once per reason, with how many pieces carry it.
const allowed = new Map();
for (const r of results) {
  for (const a of r.allowed) {
    const m = /^(\S+) on (.*?): (.*)$/.exec(a);
    const key = m ? `${m[1]}: ${m[3]}` : a;
    const entry = allowed.get(key) ?? { count: 0, example: m ? m[2] : "", at: r.at };
    entry.count += 1;
    allowed.set(key, entry);
  }
}
console.log(`\nallowed by name and reason (${allowed.size} reasons)`);
for (const [key, e] of allowed) console.log(`  ${key}  (${e.count}x, e.g. ${e.example} on ${e.at})`);

if (JSON_OUT) {
  const plain = [...findings.values()].map((f) => ({ ...f, palettes: [...f.palettes], screens: [...f.screens] }));
  fs.writeFileSync(JSON_OUT, JSON.stringify({ screens: results.length, measured: results.length - errors.length, clean: clean.length, findings: plain, errors, results }, null, 1));
  console.log(`\nwritten: ${JSON_OUT}`);
}
process.exit(findings.size || errors.length ? 1 : 0);
