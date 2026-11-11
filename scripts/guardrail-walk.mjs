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
// only, the main web and the public pictures it keeps in its storage, never
// a write): the pictures it streams rather than carries (lib/media/streamed.ts)
// and a reader's profile picture then arrive, as they do for a reader with a
// signal. Without it the walk is the app with no network.
//
//   npm run build:android, then:
//   NODE_USE_ENV_PROXY=1 node scripts/guardrail-walk.mjs [out dir] [--only /path,/path] [--workers 3] [--json file] [--online] [--looks dir]
//   node scripts/guardrail-walk.mjs --self-test    (the carried-picture check's own proof)
//
// And what is asked of the website (the arbiter, 2026-11-11 16:59 UTC): a
// picture the app asks the website for while the export carries it, at the
// same address or the same name in another format, is a picture a reader
// with no signal never sees ("carried" in the report). Theology's council
// marks asked for /history/media/<council>.v1.jpg while the apps carry the
// .v1.avif (lib/media/carried.ts), and showed only their blurred preview with
// no signal; the picture rule, which judges only a picture a reader can see,
// could not name them. Every picture the screen asks for counts, the lazy
// ones too. A picture the export does not carry is the website's by design
// (lib/media/streamed.ts) and is not named.
//
// Words over a picture, or with one drawn across them, have no one colour under
// them, so checkMock measures each on the pixels under its letters, on every
// palette (its pixels pass, scripts/words-on-pictures.mjs' method): a shortfall
// is a contrast fail like any other. One with no pixels to read (past the
// screen's edge, not drawn) is left for the eye, with a still in --looks. From
// the gate's final run no "look" stands unanswered (the arbiter, 2026-11-11):
// the report counts them, and the record names the answers.

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
// Where to keep a still of each word over a picture that had no pixels to read (the gate's rule
// that no "look" stands unanswered: these are answered by eye).
const LOOKS = flag("--looks");
const ONLINE = argv.includes("--online");
if (ONLINE) argv.splice(argv.indexOf("--online"), 1);
const SELF_TEST = argv.includes("--self-test");
if (SELF_TEST) argv.splice(argv.indexOf("--self-test"), 1);
const OUT = path.resolve(argv[0] ?? "out");
if (!SELF_TEST) checkSells(OUT);
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

const list = SELF_TEST ? [] : (ONLY ?? screens(OUT));
if (!SELF_TEST) console.log(`${list.length} screens on a phone, ${WORKERS} at a time, ${ONLINE ? "reading the main web" : "with no network"}, ${readerWords()}`);

// The website, as the apps name it: purifyapp.net in the store builds, its Render address in an export
// built without NEXT_PUBLIC_SITE_URL (lib/site.ts).
const WEBSITES = ["https://purifyapp.net", "https://purifyapp.onrender.com"];
const PICTURE_FORMATS = [".avif", ".webp", ".jpg", ".jpeg", ".png"];

/** The export's own copy of a picture asked of the website: the same address, or the same name in another format. */
function carriedCopy(pathname) {
  const has = (p) => {
    const file = path.join(OUT, p);
    return file.startsWith(OUT + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile();
  };
  if (has(pathname)) return pathname;
  const m = /^(.*)\.(avif|webp|jpe?g|png)$/i.exec(pathname);
  if (!m) return null;
  return PICTURE_FORMATS.map((ext) => m[1] + ext).find((p) => p !== pathname && has(p)) ?? null;
}

/**
 * Run `work` on the page, noting every picture the page asks of the website meanwhile; then ask for the
 * lazy pictures too (a picture below the fold is asked for when a reader comes to it), and give them a
 * moment to be asked for.
 */
async function picturesAsked(page, work) {
  const asked = new Set();
  const onRequest = (q) => {
    if (q.resourceType() !== "image") return;
    try {
      const u = new URL(q.url());
      if (WEBSITES.includes(u.origin)) asked.add(decodeURIComponent(u.pathname));
    } catch {}
  };
  page.on("request", onRequest);
  try {
    const result = await work();
    await page.evaluate(() => {
      for (const img of document.querySelectorAll("img[loading='lazy']")) img.loading = "eager";
    });
    await page.waitForTimeout(800);
    return { result, asked };
  } finally {
    page.off("request", onRequest);
  }
}

/** What was asked of the website while the export carries it, as the walk's findings. */
function carriedFailures(asked) {
  return [...asked]
    .map((p) => ({ p, copy: carriedCopy(p) }))
    .filter(({ copy }) => copy)
    .map(({ p, copy }) => ({
      check: "carried",
      palette: null,
      what: `picture ${p}`,
      detail: `asked of the website while the export carries ${copy === p ? "it" : copy}: a reader with no signal never sees it`,
    }));
}

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
const launch = () => chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
let browser = await launch();
// A browser that went away is started again, once for every worker that finds it gone (Fable
// Theology's walk of 2026-11-11 died at 120 of 127 with "Failed to open a new tab").
let relaunching = null;
async function liveBrowser() {
  if (browser.isConnected()) return browser;
  relaunching ??= launch().then((b) => {
    browser = b;
    relaunching = null;
    return b;
  });
  return relaunching;
}

/** One screen's verdict: what failed, what could not be measured, what is allowed by name. */
async function walkOne(page, at) {
  try {
    const { result: r, asked } = await picturesAsked(page, async () => {
      await go(page, at, { timeout: 15000 });
      await page.waitForTimeout(1500);
      // Words over a picture are measured on the pixels under their letters, on every palette.
      const r = await checkMock(page, "body", { pixels: true });
      const left = r.looks.filter((l) => l.left);
      if (LOOKS && left.length) {
        fs.mkdirSync(LOOKS, { recursive: true });
        for (const l of left) {
          const file = path.join(LOOKS, `${at.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home"}-${l.at}.png`);
          const el = page.locator(`[data-mock-look="${l.at}"]`).first();
          await el.evaluate((n) => n.scrollIntoView({ block: "center", inline: "center", behavior: "instant" })).catch(() => {});
          l.still = (await el.screenshot({ path: file }).then(() => path.basename(file)).catch(() => null)) ?? undefined;
        }
      }
      return r;
    });
    return { at, failures: [...r.failures, ...carriedFailures(asked)], unmeasured: r.unmeasured, allowed: r.allowed, looks: r.looks };
  } catch (e) {
    return { at, error: String(e).split("\n")[0].slice(0, 160), failures: [], unmeasured: [], allowed: [], looks: [] };
  }
}

const results = [];
let done = 0;
const queue = [...list];
async function phone() {
  const ctx = await (await liveBrowser()).newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
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
  // With them, the public pictures the main web keeps in its storage (a reader's profile picture),
  // which a phone with a signal loads from there: read, never written.
  if (ONLINE) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  return ctx;
}

// A page lives for a dozen screens at most, so what the app keeps in memory as it is walked does not
// grow without end. A screen that would not settle leaves the next one a fresh page. A page that
// cannot be had is asked of a new phone (context), and of a browser started again if it went away;
// a worker that still has none stops, and the screens it would have walked go to the others.
const PAGE_LIFE = 12;

/**
 * The carried-picture check's own proof, on the export's front door: three of the councils' pictures the
 * export carries as AVIF (lib/media/carried.ts). One asked of the website as a JPEG, as a component that
 * misses its carried copy asks (Theology's council marks before Fable Theology's mend), is named; one
 * offered as the carried AVIF first with the JPEG behind it, as the mend offers it, is not; one asked of
 * the website below the fold, lazily, is named; and a picture the export does not carry, the website's by
 * design, is not.
 */
async function selfTest() {
  const carried = fs.existsSync(path.join(OUT, "history/media"))
    ? fs.readdirSync(path.join(OUT, "history/media")).filter((f) => f.endsWith(".avif")).map((f) => f.replace(/\.avif$/, ""))
    : [];
  if (carried.length < 3) throw new Error(`the self-test needs three carried AVIFs in ${OUT}/history/media; found ${carried.length}`);
  const [missed, offered, lazy] = carried;
  const site = WEBSITES[1];
  const ctx = await phone();
  const page = await ctx.newPage();
  try {
    await go(page, "/", { timeout: 20000 });
    await page.waitForTimeout(1500);
    const html = `<div data-carried-self-test style="padding:16px">
      <img alt="" width="96" height="64" src="${site}/history/media/${missed}.jpg">
      <picture><source type="image/avif" srcset="/history/media/${offered}.avif"><img alt="" width="96" height="64" src="${site}/history/media/${offered}.jpg"></picture>
      <img alt="" width="96" height="64" src="${site}/covers/authors/carried-self-test-not-carried.v1.jpg">
      <div style="height:4000px"></div>
      <img alt="" width="96" height="64" loading="lazy" src="${site}/history/media/${lazy}.jpg">
    </div>`;
    const { asked } = await picturesAsked(page, async () => {
      await page.evaluate((h) => document.body.insertAdjacentHTML("beforeend", h), html);
      await page.waitForTimeout(600);
    });
    const named = carriedFailures(asked).map((f) => f.what);
    const cases = [
      [`a picture asked of the website as a JPEG while the export carries ${missed}.avif is named`, named.includes(`picture /history/media/${missed}.jpg`)],
      [`the carried AVIF offered first (${offered}) is not named`, !named.some((w) => w.includes(offered))],
      [`a lazy picture below the fold (${lazy}) is asked for and named`, named.includes(`picture /history/media/${lazy}.jpg`)],
      ["a picture the export does not carry (the website's by design) is not named", !named.some((w) => w.includes("carried-self-test-not-carried"))],
      ["nothing else is named", named.length === 2],
    ];
    for (const [what, ok] of cases) console.log(`  ${ok ? "ok    " : "MISSED"} ${what}`);
    const ok = cases.every(([, good]) => good);
    console.log(ok ? "\nself-test: the carried-picture check names what it should and nothing else" : `\nself-test FAILED: named ${JSON.stringify(named)}`);
    return ok;
  } finally {
    await ctx.close().catch(() => {});
  }
}
if (SELF_TEST) {
  const ok = await selfTest();
  await browser.close().catch(() => {});
  process.exit(ok ? 0 : 1);
}
async function worker() {
  let ctx = null;
  let page = null;
  const fresh = async () => {
    await page?.close().catch(() => {});
    page = null;
    for (let tries = 0; tries < 3 && !page; tries++) {
      try {
        ctx ??= await phone();
        page = await ctx.newPage();
      } catch {
        await ctx?.close().catch(() => {});
        ctx = null;
      }
    }
    return Boolean(page);
  };
  if (!(await fresh())) return;
  let walked = 0;
  for (let at = queue.shift(); at; at = queue.shift()) {
    const r = await walkOne(page, at);
    results.push(r);
    done += 1;
    walked += 1;
    if (done % 20 === 0) console.log(`  ${done} of ${list.length}`);
    if ((r.error || walked % PAGE_LIFE === 0) && !(await fresh())) break;
  }
  await ctx?.close().catch(() => {});
}
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close().catch(() => {});
// Screens no worker could reach (every worker lost its page and could not have another).
for (const at of queue.splice(0)) results.push({ at, error: "not walked: no page could be had for it", failures: [], unmeasured: [], allowed: [], looks: [] });

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
// What no measure vouched for (words on a picture, or with one drawn across them), said by screen: each
// reason once, with how many words carry it and the first of them, so a hundred lines on eleven screens
// read as eleven. It does not fail the walk: it is the list a picture's own measure works from
// (scripts/words-on-pictures.mjs).
const said = results.filter((r) => r.unmeasured.length);
if (said.length) {
  console.log(`\nnot measured, to be looked at: ${said.reduce((n, r) => n + r.unmeasured.length, 0)} line(s) on ${said.length} screen(s)`);
  for (const r of said) {
    const by = new Map();
    for (const u of r.unmeasured) {
      const m = /^"(.*)": (.*)$/s.exec(u);
      by.set(m ? m[2] : u, [...(by.get(m ? m[2] : u) ?? []), m ? m[1] : ""]);
    }
    console.log(`  ${r.at}`);
    for (const [why, words] of by) console.log(`    ${words.length} word(s), ${why}: ${words.slice(0, 3).map((w) => `"${w}"`).join(", ")}${words.length > 3 ? ", ..." : ""}`);
  }
}
if (errors.length) {
  console.log(`\nnot measured (${errors.length}):`);
  for (const r of errors) console.log(`  ${r.at}: ${r.error}`);
}
// Words over a picture or with one across them: each measured on its pixels on every palette, or
// left for the eye with a still (the gate's rule, the arbiter, 2026-11-11 15:28 UTC).
const looks = results.flatMap((r) => r.looks.map((l) => ({ ...l, screen: r.at })));
const lookLeft = looks.filter((l) => l.left);
const lookShort = looks.filter((l) => !l.left && l.need !== null && Object.values(l.ratios).some((v) => v + 1e-9 < l.need));
console.log(`\nwords over a picture ("look"): ${looks.length}; answered by their pixels on every palette: ${looks.length - lookLeft.length}, of which ${lookShort.length} under their need (in contrast above); left for the eye: ${lookLeft.length}${LOOKS && lookLeft.length ? ` (stills in ${LOOKS})` : ""}`);
for (const l of lookLeft) console.log(`  ${l.screen} "${l.text}": ${l.why}${l.still ? ` [${l.still}]` : ""}`);

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
  fs.writeFileSync(JSON_OUT, JSON.stringify({ screens: results.length, measured: results.length - errors.length, clean: clean.length, findings: plain, looks: { found: looks.length, answered: looks.length - lookLeft.length, short: lookShort.length, left: lookLeft.length }, errors, results }, null, 1));
  console.log(`\nwritten: ${JSON_OUT}`);
}
process.exit(findings.size || errors.length ? 1 : 0);
