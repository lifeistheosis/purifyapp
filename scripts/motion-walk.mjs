// The pre-build gate's motion walk (the arbiter, 2026-11-13, after build 95's
// walk: Discover's search opened with a glitch, not smoothly (note 5), and the
// Bible's "Highlighted" toast stood over the reader's pill (note 7); the gate had
// passed both. His word that night: "after all of these checks and all this
// time").
//
// On the native export, on a phone (390 by 844 unless --size names another) with
// real touch, with the app's motion on as a reader's phone has it (pinned and
// asserted on every screen, scripts/lib/motion.mjs), one page of every route the
// export carries (scripts/lib/screens.mjs), each reached the app's way. On each:
//
//   1. the page switch into it, from the front door (from Discover, for the
//      front door itself), recorded frame by frame;
//   2. at rest, at its top, its middle and its end: the floating layers
//      (scripts/gate/layers.mjs) and the page's edge (scripts/gate/page-edge.mjs);
//   3. where it has verses or a Father's paragraphs, a double tap and a hold on
//      one in the middle of the screen (the highlight and its Undo, the verse's
//      own window), each recorded, then the layers and the edge;
//   4. every control a finger can reach (up to --max, in reading order, the
//      tap walk's own way: scripts/lib/tap.mjs), each from the screen as it
//      first stood, tapped and recorded frame by frame (scripts/gate/frames.mjs:
//      a cut, a blank frame, a flash, a box drawn in the wrong place, a jump;
//      and a card that opens a page showing its picture without carrying the
//      picture into it, CLAUDE.md's rule (a picture the page does not show
//      leaves with its page, app/globals.css's own rule above
//      `::view-transition-group(carried)`); a screen slow to answer is listed
//      for the eye),
//      with the layers measured twice on the way (a crossing in passing is
//      listed for the eye: the house's sheets rise as the bars behind them
//      sink) and once at rest (a meeting there fails), and the edge at rest. The tab bar's and the top bar's own controls are the same on
//      every screen: each is walked on the first three screens it is met on.
//
// --reduced is the second, shorter pass: the app's motion pinned to its still
// path (a phone it judges slow), six controls a screen, the bars' controls on
// the first screen only. There a cut is allowed, and anything that moves fails.
//
// Never a write anywhere: with no network the shell answers nothing outside the
// bundle; with --online the main web and the public pictures in its storage are
// read (GET) and nothing is sent.
//
//   node scripts/gate/export.mjs (the gate's export, cut with the store workflow's own
//   switches, scripts/lib/store-switches.mjs), then, once for each reader:
//   [SELLS_PLUS=1] NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs [out dir] [--only /a/,/b/]
//     [--workers 2] [--max 30] [--json file] [--shots dir] [--online] [--reduced] [--size 390x844]
//   node scripts/motion-walk.mjs --self-test [out dir]   (the four checks' own self-tests, in turn)
//
// Two workers by default: the screencast sends a frame for every frame that
// changes only while it keeps up, and a frame it misses makes a step "unsure"
// (recorded again once), never a pass.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import sharp from "sharp";

import { judgeFrames, recordFrames, stripOf, stripTimes } from "./gate/frames.mjs";
import { installGate } from "./gate/inpage.mjs";
import { measureLayers, sayMeeting } from "./gate/layers.mjs";
import { measureEdge, sayCut } from "./gate/page-edge.mjs";
import { mainWeb } from "./lib/main-web.mjs";
import { pageFileOf } from "./lib/route-files.mjs";
import { assertMotion, motionOptions, motionWords, pinMotion } from "./lib/motion.mjs";
import { screens } from "./lib/screens.mjs";
import { SELLS_PLUS, asAndroidShell, checkSells, readerWords } from "./lib/sells-plus.mjs";
import { checkStoreExport } from "./lib/store-switches.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";
import { aimOf, firstTouch, fresh, markControls, reach, tapAt } from "./lib/tap.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const has = (name) => {
  const at = argv.indexOf(name);
  if (at >= 0) argv.splice(at, 1);
  return at >= 0;
};
const ONLY = flag("--only")?.split(",") ?? null;
const WORKERS = Math.max(1, Number(flag("--workers") ?? 2));
const REDUCED = has("--reduced");
const MODE = REDUCED ? "reduce" : "on";
const MAX = Math.max(1, Number(flag("--max") ?? (REDUCED ? 6 : 30)));
const JSON_OUT = flag("--json");
const SHOTS = flag("--shots");
const SIZE = (flag("--size") ?? "390x844").split("x").map(Number);
if (SIZE.length !== 2 || SIZE.some((n) => !Number.isInteger(n) || n < 300 || n > 3000)) throw new Error("--size takes a width and a height, as 800x1280");
const [WIDTH, HEIGHT] = SIZE;
const ONLINE = has("--online");
const SELF_TEST = has("--self-test");
const OUT = path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

// ── The self-test: the four checks' own, in turn ──────────────────────

if (SELF_TEST) {
  const runs = [
    ["the motion pin", ["scripts/gate/motion.mjs", "--self-test", OUT]],
    ["the floating layers", ["scripts/gate/layers.mjs", "--self-test"]],
    ["the page's edge", ["scripts/gate/page-edge.mjs", "--self-test"]],
    ["the transitions", ["scripts/gate/frames.mjs", "--self-test"]],
  ];
  let ok = true;
  for (const [name, args] of runs) {
    console.log(`\n${name}:`);
    const r = spawnSync(process.execPath, args, { stdio: "inherit" });
    ok &&= r.status === 0;
  }
  console.log(ok ? "\nself-test: all four checks fail what they should and pass the rest" : "\nself-test FAILED");
  process.exit(ok ? 0 : 1);
}

checkSells(OUT);
// An export cut without the store's own switches is not the app he walks (scripts/lib/store-switches.mjs).
checkStoreExport(OUT);
const list = ONLY ?? screens(OUT);
const ON = WIDTH === 390 && HEIGHT === 844 ? "on a phone" : `at ${WIDTH} by ${HEIGHT}`;
console.log(`${list.length} screens ${ON}, up to ${MAX} controls each, ${WORKERS} at a time, ${ONLINE ? "reading the main web" : "with no network"}, ${motionWords(MODE)}, ${readerWords()}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (at) => at.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home";
const RECORD = { moves: REDUCED, width: WIDTH, height: HEIGHT, minMs: 900, stillMs: 450, maxMs: 2600 };
/** The tab bar's and the top bar's controls: the same on every screen. */
const CHROME = "[data-tab-bar], [data-mobile-topbar], [data-plates], [data-plates-row]";
const CHROME_SCREENS = REDUCED ? 1 : 3;
const chromeSeen = new Map();

// ── Stills ─────────────────────────────────────────────────────────────

/** The screen as it stands, a box ringed in red (a meeting, a cut). */
async function ringed(page, box, file) {
  try {
    const shot = await page.screenshot();
    if (!box) {
      fs.writeFileSync(file, shot);
      return path.basename(file);
    }
    const l = Math.max(0, box.left - 3);
    const t = Math.max(0, box.top - 3);
    const w = Math.max(6, Math.min(WIDTH, box.right + 3) - l);
    const h = Math.max(6, Math.min(HEIGHT, box.bottom + 3) - t);
    const ring = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><rect x="${l + 1.5}" y="${t + 1.5}" width="${w - 3}" height="${h - 3}" fill="none" stroke="#ff2d55" stroke-width="3"/></svg>`);
    await sharp(shot).composite([{ input: ring, left: 0, top: 0 }]).png().toFile(file);
    return path.basename(file);
  } catch {
    return null;
  }
}

// ── What a moment shows ────────────────────────────────────────────────

/** The layers and the edge where the page now stands, each fail with a still. */
async function standing(page, at, tag, { y = null } = {}) {
  const out = { meetings: [], cuts: [] };
  const L = await measureLayers(page, { width: WIDTH, height: HEIGHT });
  for (const m of L.meetings) {
    const still = SHOTS ? await ringed(page, m.box, path.join(SHOTS, `${slug(at)}-${tag}-layers-${out.meetings.length}.png`)) : null;
    out.meetings.push({ ...m, y, still });
  }
  const C = await measureEdge(page, { width: WIDTH, height: HEIGHT });
  for (const c of C) {
    const still = SHOTS ? await ringed(page, c.box && { left: Math.max(0, c.box.left), right: Math.min(WIDTH, c.box.right), top: Math.max(0, c.box.top), bottom: Math.min(HEIGHT, c.box.bottom) }, path.join(SHOTS, `${slug(at)}-${tag}-edge-${out.cuts.length}.png`)) : null;
    out.cuts.push({ ...c, y, still });
  }
  return out;
}

/** The screen at rest: its top, its middle and its end. */
async function atRest(page, at) {
  const out = { meetings: [], cuts: [] };
  const heights = await page.evaluate(() => {
    const s = document.scrollingElement || document.documentElement;
    const far = s.scrollHeight - innerHeight;
    return far > innerHeight / 2 ? [0, Math.round(far / 2), far] : [0];
  });
  for (const y of heights) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(400);
    const s = await standing(page, at, `rest${y}`, { y });
    out.meetings.push(...s.meetings);
    // What spills sideways spills at every height: said once.
    for (const c of s.cuts) if (!out.cuts.some((d) => d.name === c.name && d.side === c.side)) out.cuts.push(c);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  return out;
}

/** A recording, judged, its fails each with a still of the frames that show it. */
async function judged(rec, at, tag) {
  const v = await judgeFrames(rec, { motion: MODE });
  const fails = [];
  for (const [n, f] of v.fails.entries()) {
    const still = SHOTS ? await stripOf(rec, f.frames, path.join(SHOTS, `${slug(at)}-${tag}-${f.kind}-${n}.png`)).catch(() => null) : null;
    fails.push({ kind: f.kind, detail: f.detail, still, times: stripTimes(rec, f.frames), ...(f.node ? { node: f.node } : {}) });
  }
  return { fails, unsure: v.unsure, dips: v.dips ?? [], change: v.change, frames: v.frames, answered: v.answered, vtNames: v.vtNames ?? [], error: rec.error };
}

/** A tap (or a gesture) recorded, the layers measured twice on the way; recorded again once if it was unsure. */
async function recordAct(page, cdp, act, at, tag, again) {
  let last = null;
  for (let tries = 0; tries < 2; tries++) {
    if (tries) await again();
    const passing = [];
    const rec = await recordFrames(
      page,
      cdp,
      async () => {
        await act();
        for (const wait of [90, 140]) {
          await sleep(wait);
          const L = await measureLayers(page, { width: WIDTH, height: HEIGHT }).catch(() => null);
          if (L) passing.push(...L.meetings);
        }
      },
      RECORD,
    );
    const v = await judged(rec, at, tag);
    last = { v, passing };
    if (!v.unsure.length || v.fails.length) break;
  }
  return last;
}

/** In the page: the first of `names` (pictures' file names) that the page shows in its first screen and a half, or null. */
function pictureOnPage(names) {
  const want = new Set(names);
  for (const p of document.querySelectorAll("img, [style*='background-image']")) {
    const r = p.getBoundingClientRect();
    if (r.width < 48 || r.height < 48 || r.top > innerHeight * 1.5 || r.bottom < 0) continue;
    const src = p.tagName === "IMG" ? p.currentSrc || p.src : (/url\(["']?([^"')]+)/.exec(p.style.backgroundImage) || [])[1];
    if (!src) continue;
    try {
      const name = decodeURIComponent(new URL(src, location.href).pathname.split("/").pop());
      if (want.has(name)) return name;
    } catch {}
  }
  return null;
}

// ── A screen ───────────────────────────────────────────────────────────

async function walkScreen(ctx, at, kept) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  page.on("popup", (p) => p.close().catch(() => {}));
  const result = { at, motion: null, arrival: null, rest: null, gestures: [], controls: [], found: 0, error: null };
  try {
    // 1. The page switch into it.
    const from = at === "/" ? "/discover/" : "/";
    await fresh(page, from, kept);
    const wrong = await assertMotion(page, MODE);
    if (wrong) {
      result.motion = wrong;
      throw new Error(wrong);
    }
    const arrival = await recordAct(page, cdp, () => go(page, at, { timeout: 15000 }), at, "arrival", async () => {
      await fresh(page, from, kept);
    });
    result.arrival = { from, ...arrival.v, passing: arrival.passing };
    await page.waitForTimeout(500);
    result.motion = await assertMotion(page, MODE);
    // 2. At rest.
    result.rest = await atRest(page, at);
    // 3. Its verses or a Father's paragraphs: a double tap and a hold.
    const surfaces = await page.evaluate(() => {
      const shown = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 40 && r.height > 14;
      };
      return ["[data-verse] p", "[data-paragraph-idx] p[data-own-press]"].filter((s) => [...document.querySelectorAll(s)].some(shown));
    });
    for (const sel of surfaces) {
      for (const gesture of ["double tap", "hold"]) {
        const tag = `${gesture.replace(" ", "")}`;
        const row = { name: `${gesture} on ${sel}`, fails: [], meetings: [], cuts: [] };
        try {
          const place = async () => {
            await fresh(page, at, kept);
            await firstTouch(page, cdp);
            // One already before the reader, as he double tapped John 1:5 where it stood: a scroll of
            // the walk's own after the first touch is a reader's scroll, and the reader puts its bars
            // away for it. Only where none stands in the screen's middle is one brought there.
            const spot = await page.evaluate((s) => {
              const els = [...document.querySelectorAll(s)].filter((el) => el.getBoundingClientRect().width > 40);
              let el = els.find((e) => {
                const r = e.getBoundingClientRect();
                return r.top >= innerHeight * 0.3 && r.top + 24 <= innerHeight * 0.66;
              });
              if (!el) {
                el = els[Math.min(4, els.length - 1)];
                el.scrollIntoView({ block: "center", behavior: "instant" });
              }
              const r = el.getBoundingClientRect();
              return { x: r.left + Math.min(60, r.width / 2), y: r.top + Math.min(12, r.height / 2) };
            }, sel);
            await page.waitForTimeout(700);
            return spot;
          };
          let spot = await place();
          const act = async () => {
            if (gesture === "double tap") {
              await tapAt(cdp, spot.x, spot.y);
              await sleep(120);
              await tapAt(cdp, spot.x, spot.y);
            } else {
              await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: spot.x, y: spot.y }] });
              await sleep(700);
              await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            }
          };
          const r = await recordAct(page, cdp, act, at, tag, async () => {
            spot = await place();
          });
          row.fails = r.v.fails;
          row.unsure = r.v.unsure;
          row.dips = r.v.dips;
          row.passing = r.passing;
          const s = await standing(page, at, tag);
          row.meetings = s.meetings;
          row.cuts = s.cuts;
        } catch (e) {
          row.error = String(e).split("\n")[0].slice(0, 160);
        }
        result.gestures.push(row);
      }
    }
    // 4. Every control.
    await fresh(page, at, kept);
    const marked = await page.evaluate(markControls, MAX);
    result.found = marked.found;
    const inChrome = await page.evaluate((sel) => [...document.querySelectorAll("[data-tapwalk]")].sort((a, b) => Number(a.dataset.tapwalk) - Number(b.dataset.tapwalk)).map((el) => Boolean(el.closest(sel))), CHROME);
    for (const c of marked.controls) {
      const row = { name: c.name, verdict: "pass", fails: [], meetings: [], cuts: [], passing: [] };
      try {
        if (inChrome[c.i]) {
          const n = chromeSeen.get(c.name) ?? 0;
          if (n >= CHROME_SCREENS) {
            row.verdict = "skipped";
            row.why = `a bar's own control, walked on ${CHROME_SCREENS} screen${CHROME_SCREENS === 1 ? "" : "s"} already`;
            result.controls.push(row);
            continue;
          }
          chromeSeen.set(c.name, n + 1);
        }
        let aim = null;
        const ready = async () => {
          await fresh(page, at, kept);
          const again = (await page.evaluate(markControls, MAX)).controls[c.i];
          if (!again || again.name !== c.name) return "the screen drew differently on its second visit";
          await firstTouch(page, cdp);
          if ((await reach(page, c, MAX)) === "redrawn") return "the screen kept drawing it again as it was reached";
          const handle = await page.$(`[data-tapwalk="${c.i}"]`);
          const box = handle && (await handle.boundingBox());
          if (!box) return "out of reach";
          aim = await aimOf(handle, box);
          return null;
        };
        const skip = await ready();
        if (skip) {
          row.verdict = "skipped";
          row.why = skip;
          result.controls.push(row);
          continue;
        }
        const before = await page.evaluate(() => location.pathname);
        // A card that opens its own page carries its picture into it (CLAUDE.md, "Every page switch
        // is a transition"): the pictures the control holds (not icons), by their file's name.
        row.own = await page.evaluate((i) => {
          const el = document.querySelector(`[data-tapwalk="${i}"]`);
          if (!el) return null;
          const trail = [];
          for (let q = el.parentElement, n = 0; q && q !== document.body && n < 14; q = q.parentElement, n++) {
            for (const a of q.attributes) if (a.name.startsWith("data-") && !/^data-(tapwalk|mock|gate|tour)/.test(a.name) && !trail.includes(a.name)) trail.push(a.name);
          }
          return { marks: [...el.attributes].filter((a) => a.name.startsWith("data-") && a.name !== "data-tapwalk").map((a) => a.name), trail, cls: typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 8).join(" ") : "" };
        }, c.i);
        const pictures = await page.evaluate((i) => {
          const el = document.querySelector(`[data-tapwalk="${i}"]`);
          if (!el) return [];
          return [...el.querySelectorAll("img, [style*='background-image']")]
            .filter((p) => {
              const r = p.getBoundingClientRect();
              return r.width >= 64 && r.height >= 64;
            })
            .map((p) => (p.tagName === "IMG" ? p.currentSrc || p.src : (/url\(["']?([^"')]+)/.exec(p.style.backgroundImage) || [])[1]))
            .filter(Boolean)
            .map((src) => {
              try {
                return decodeURIComponent(new URL(src, location.href).pathname.split("/").pop());
              } catch {
                return null;
              }
            })
            .filter(Boolean);
        }, c.i);
        const r = await recordAct(page, cdp, () => tapAt(cdp, aim.x, aim.y), at, `c${c.i}`, async () => {
          const again = await ready();
          if (again) throw new Error(again);
        });
        const after = await page.evaluate(() => location.pathname).catch(() => null);
        row.went = after && after !== before ? after : null;
        row.change = r.v.change;
        row.answered = r.v.answered;
        row.fails = r.v.fails;
        // Only where the page it opens shows the same picture in its first screen and a half: a card
        // whose picture the page does not show has nothing to carry.
        const shown = row.went && pictures.length && MODE === "on" ? await page.evaluate(pictureOnPage, pictures).catch(() => null) : null;
        if (shown && !r.v.vtNames.some((n) => /\(carried/.test(n))) {
          row.fails = [...row.fails, { kind: "carried", detail: `the card's picture (${shown}) is on ${row.went} and was not carried into it (no View Transition carried it; ${r.v.vtNames.length ? `it ran ${[...new Set(r.v.vtNames.map((n) => n.replace(/^::view-transition-\w+/, "")))].join(", ")}` : "none ran"})`, still: null, times: [] }];
        }
        row.unsure = r.v.unsure;
        row.dips = r.v.dips;
        row.passing = r.passing;
        const s = await standing(page, at, `c${c.i}`);
        row.meetings = s.meetings;
        row.cuts = s.cuts;
        // Meetings in passing are listed for the eye, not failed: the house's sheets rise as what stands
        // behind them sinks (app/globals.css, "What stands behind a sheet"), and the two cross in the
        // frames between. A meeting still there at rest (note 7's) fails.
        if (row.fails.length || row.meetings.length || row.cuts.length) row.verdict = "fail";
        else if (row.unsure.length) row.verdict = "unsure";
      } catch (e) {
        row.verdict = "error";
        row.why = String(e).split("\n")[0].slice(0, 160);
      }
      result.controls.push(row);
      for (const f of row.fails) console.log(`  FAIL ${at} ${c.name}: ${f.kind}: ${f.detail}`);
      for (const m of row.meetings) console.log(`  FAIL ${at} ${c.name}: layers: ${sayMeeting(m)}`);
      for (const k of row.cuts) console.log(`  FAIL ${at} ${c.name}: edge: ${sayCut(k)}`);
    }
  } catch (e) {
    result.error = String(e).split("\n")[0].slice(0, 200);
  }
  await page.close().catch(() => {});
  return result;
}

// ── The walk ───────────────────────────────────────────────────────────

const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
let done = 0;
const queue = [...list];
const started = Date.now();
async function worker() {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(MODE) });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  await pinMotion(ctx, MODE);
  await installGate(ctx);
  if (SELLS_PLUS) await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  if (ONLINE) for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
  // What the device keeps once the app has first opened: every screen and tap starts from it.
  const first = await ctx.newPage();
  await go(first, "/", { timeout: 60000 });
  await first.waitForTimeout(1500);
  const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
  await first.close();
  for (let at = queue.shift(); at; at = queue.shift()) {
    const r = await walkScreen(ctx, at, kept);
    results.push(r);
    done += 1;
    const tally = (k) => r.controls.filter((c) => c.verdict === k).length;
    console.log(`  ${done} of ${list.length} ${at}: ${r.error ? `not walked (${r.error})` : `${r.controls.length - tally("skipped")} tapped, ${tally("fail")} failed, ${tally("unsure")} unsure${r.arrival?.fails.length ? `; the switch into it: ${r.arrival.fails.map((f) => f.kind).join(", ")}` : ""}${r.rest?.meetings.length || r.rest?.cuts.length ? `; at rest: ${r.rest.meetings.length} meeting(s), ${r.rest.cuts.length} cut(s)` : ""}`} (${Math.round((Date.now() - started) / 60000)} min)`);
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: WORKERS }, worker));
await browser.close();
results.sort((a, b) => a.at.localeCompare(b.at));

// ── The report ─────────────────────────────────────────────────────────

// Where a finding lives in the code. A data mark leads to the file that sets it on an element (a
// JSX attribute: `data-x=` or a bare `data-x`, never a selector that reads it, "[data-x]"), the
// most particular first (the mark set in the fewest files): its own marks, then the marks of the
// boxes it stands in, nearest first. Without a mark, its words lead to where they are written, and
// a class of the house's own (one app/globals.css defines) to the files that use it. Tailwind's
// utility classes are shared by hundreds of files and lead nowhere, so they are not asked.
const SOURCES = [];
for (const dir of ["components", "app", "lib", "data"]) {
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      if (name === "__tests__" || name === "node_modules") continue;
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx|ts|css|json)$/.test(name)) SOURCES.push(full);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
}
const text = new Map();
const read = (f) => {
  if (!text.has(f)) text.set(f, fs.readFileSync(f, "utf8"));
  return text.get(f);
};
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const setters = new Map();
/** The .tsx files that set a data mark on an element. */
function settersOf(mark) {
  if (!setters.has(mark)) {
    const re = new RegExp(`(^|[\\s{(,])${escapeRe(mark)}(?=\\s*=|\\s*\\/?>|\\s*\\n|\\s+[a-zA-Z-]+=)`, "m");
    setters.set(mark, SOURCES.filter((f) => f.endsWith(".tsx") && re.test(read(f))));
  }
  return setters.get(mark);
}
const IGNORED_MARK = /^data-(tapwalk|mock|gate|state|hl|tour|place|testid|screen-edge|overlay|open|active|side|motion|theme|reading-mode)$/;
const houseClasses = new Set([...read("app/globals.css").matchAll(/^\.([a-z][a-z0-9-]{3,})\b/gm)].map((m) => m[1]));
function fileFor(marks = [], cls = "", trail = [], words = "", inner = []) {
  const fromMarks = (list) => {
    const asked = list.filter((m) => !IGNORED_MARK.test(m)).map((m) => ({ m, hit: settersOf(m) })).filter((x) => x.hit.length && x.hit.length <= 3);
    return asked;
  };
  const own = fromMarks(marks).sort((a, b) => a.hit.length - b.hit.length);
  if (own.length) return own[0].hit.join(", ");
  // The piece of it that was drawn in the meeting, and the boxes between that piece and it.
  const drawn = fromMarks(inner);
  if (drawn.length) return `${drawn[0].hit.join(", ")} (its piece carries ${drawn[0].m})`;
  const within = fromMarks(trail);
  if (within.length) return `in ${within[0].hit.join(", ")} (its box carries ${within[0].m})`;
  const said = (words || "").replace(/["\u201c\u201d]/g, "").trim();
  if (said.length >= 16) {
    const probe = said.slice(0, 28);
    const hit = SOURCES.filter((f) => read(f).includes(probe));
    if (hit.length && hit.length <= 3) return `its words are in ${hit.join(", ")}`;
  }
  const own2 = cls.split(/\s+/).filter((w) => houseClasses.has(w));
  for (const c of own2) {
    const hit = SOURCES.filter((f) => f.endsWith(".tsx") && new RegExp(`["'\`\\s]${escapeRe(c)}["'\`\\s]`).test(read(f)));
    if (hit.length && hit.length <= 3) return `${hit.join(", ")} (class ${c})`;
  }
  return "not found by its marks; see the still";
}
const sigOf = (marks, cls, name) => (marks?.filter((m) => !/^data-(tapwalk|mock|gate|state|hl|tour|place)/.test(m)).join("+") || cls?.split(/\s+/).slice(0, 4).join(" ") || name.replace(/".*$/, "").trim());

/** Where a transition's finding lives: the page it lands on (or the screen it stays on), the component holding the control tapped, and for a jump the box that jumped. */
function transitionFile(r, m, f) {
  const found = (x) => x && !/^not found/.test(x);
  const parts = [];
  if (f.kind === "jump" && f.node) {
    const jumped = fileFor(f.node.marks, f.node.cls, f.node.trail);
    if (found(jumped)) parts.push(`the box that jumped: ${jumped}`);
  }
  parts.push(m.went ? `lands on ${pageFileOf(m.went) ?? m.went}` : `on ${pageFileOf(r.at) ?? r.at}`);
  if (m.own) {
    const control = fileFor(m.own.marks, m.own.cls, m.own.trail);
    if (found(control)) parts.push(`the control: ${control}`);
  }
  return parts.join("; ");
}

const findings = new Map();
const note = (key, entry, at, still) => {
  const f = findings.get(key) ?? { ...entry, screens: new Set(), stills: [] };
  f.screens.add(at);
  if (still && f.stills.length < 2) f.stills.push(still);
  findings.set(key, f);
};
for (const r of results) {
  if (r.motion) note(`motion\u0000${r.motion}`, { check: "motion", what: r.motion, file: "scripts/lib/motion.mjs" }, r.at);
  const moments = [
    ...(r.arrival ? [{ where: `the page switch from ${r.arrival.from}`, went: r.at, fails: r.arrival.fails, passing: r.arrival.passing ?? [], meetings: [], cuts: [] }] : []),
    ...(r.rest ? [{ where: "at rest", fails: [], passing: [], meetings: r.rest.meetings, cuts: r.rest.cuts }] : []),
    ...r.gestures.map((g) => ({ where: g.name, fails: g.fails ?? [], passing: g.passing ?? [], meetings: g.meetings ?? [], cuts: g.cuts ?? [] })),
    ...r.controls.map((c) => ({ where: `tap ${c.name}${c.went ? ` (went to ${c.went})` : ""}`, went: c.went, own: c.own, fails: c.fails ?? [], passing: c.passing ?? [], meetings: c.meetings ?? [], cuts: c.cuts ?? [] })),
  ];
  for (const m of moments) {
    for (const f of m.fails) {
      const where = m.where.replace(/ \(went to .*\)$/, "");
      note(`transitions\u0000${f.kind}\u0000${where}\u0000${r.at.split("/")[1]}`, { check: "transitions", kind: f.kind, what: `${m.where}: ${f.detail}`, times: f.times, file: transitionFile(r, m, f) }, r.at, f.still);
    }
    for (const x of m.meetings) {
      const key = `layers\u0000${sigOf(x.aMarks, x.aClass, x.a)}\u0000${sigOf(x.bMarks, x.bClass, x.b)}`;
      note(key, { check: "layers", what: `${m.where}: ${sayMeeting(x)}`, file: [fileFor(x.aMarks, x.aClass, x.aTrail, "", x.aInner), fileFor(x.bMarks, x.bClass, x.bTrail, "", x.bInner)].join(" | ") }, r.at, x.still);
    }
    for (const x of m.passing) {
      const key = `layers in passing\u0000${sigOf(x.aMarks, x.aClass, x.a)}\u0000${sigOf(x.bMarks, x.bClass, x.b)}`;
      note(key, { check: "layers in passing", what: `${m.where}: ${sayMeeting(x)}`, file: [fileFor(x.aMarks, x.aClass, x.aTrail, "", x.aInner), fileFor(x.bMarks, x.bClass, x.bTrail, "", x.bInner)].join(" | ") }, r.at, null);
    }
    for (const x of m.cuts) {
      const key = `edge\u0000${sigOf(x.marks, x.cls, x.name)}\u0000${x.side.replace(/\d+px/g, "")}`;
      note(key, { check: "edge", what: `${m.where}: ${sayCut(x)}`, file: fileFor(x.marks, x.cls, x.trail, x.said || x.words) }, r.at, x.still);
    }
  }
}
const tapped = results.reduce((n, r) => n + r.controls.filter((c) => c.verdict !== "skipped").length, 0);
const unsure = results.flatMap((r) => r.controls.filter((c) => c.verdict === "unsure").map((c) => `${r.at} ${c.name}: ${c.unsure.join("; ")}`));
const errors = results.filter((r) => r.error);
const controlErrors = results.flatMap((r) => r.controls.filter((c) => c.verdict === "error").map((c) => `${r.at} ${c.name}: ${c.why}`));
console.log(`\n${results.length - errors.length} of ${results.length} screens walked, ${tapped} controls tapped, ${results.reduce((n, r) => n + r.gestures.length, 0)} gestures, in ${Math.round((Date.now() - started) / 60000)} minutes, ${motionWords(MODE)}`);
const byCheck = new Map();
for (const f of findings.values()) byCheck.set(f.check, [...(byCheck.get(f.check) ?? []), f]);
for (const check of ["motion", "transitions", "layers", "edge", "layers in passing"]) {
  const all = byCheck.get(check) ?? [];
  console.log(`\n${check}: ${all.length} ${check === "layers in passing" ? "seen (for the eye, not failed: two layers crossing while one moves)" : "finding(s)"}`);
  for (const f of all.sort((a, b) => b.screens.size - a.screens.size)) {
    const where = [...f.screens];
    console.log(`  ${f.what}`);
    console.log(`    on ${where.length} screen(s): ${where.slice(0, 6).join(" ")}${where.length > 6 ? " ..." : ""}${f.file ? `\n    in ${f.file}` : ""}${f.stills.length ? `\n    still: ${f.stills.join(", ")}${f.times ? ` (frames at ${f.times.join(", ")} after the tap)` : ""}` : ""}`);
  }
}
const slow = results.flatMap((r) => r.controls.filter((c) => c.went && c.answered !== null && c.answered !== undefined && c.answered > 350).map((c) => `${r.at} tap ${c.name} (went to ${c.went}): the screen first answered ${c.answered}ms after the tap`));
if (slow.length) {
  console.log(`\nslow to answer, nothing on the screen moved for more than 350ms after the tap (for the eye) (${slow.length}):`);
  for (const l of slow.slice(0, 40)) console.log(`  ${l}`);
  if (slow.length > 40) console.log(`  ... and ${slow.length - 40} more (in --json)`);
}
const dips = results.flatMap((r) => [
  ...(r.arrival?.dips ?? []).map((d) => `${r.at} the page switch from ${r.arrival.from}: ${d}`),
  ...r.gestures.flatMap((g) => (g.dips ?? []).map((d) => `${r.at} ${g.name}: ${d}`)),
  ...r.controls.flatMap((c) => (c.dips ?? []).map((d) => `${r.at} tap ${c.name}${c.went ? ` (went to ${c.went})` : ""}: ${d}`)),
]);
if (dips.length) {
  console.log(`\ndips through the ground, a fifth of a second or less at the foot of a fade (not failed; for the eye) (${dips.length}):`);
  for (const d of dips.slice(0, 40)) console.log(`  ${d}`);
  if (dips.length > 40) console.log(`  ... and ${dips.length - 40} more (in --json)`);
}
if (unsure.length) {
  console.log(`\nunsure, recorded twice and the frames fell behind both times (${unsure.length}):`);
  for (const u of unsure.slice(0, 30)) console.log(`  ${u}`);
}
if (errors.length || controlErrors.length) {
  console.log(`\nnot walked (${errors.length} screens, ${controlErrors.length} controls):`);
  for (const r of errors) console.log(`  ${r.at}: ${r.error}`);
  for (const c of controlErrors.slice(0, 30)) console.log(`  ${c}`);
}
if (JSON_OUT) {
  const plain = [...findings.values()].map((f) => ({ ...f, screens: [...f.screens] }));
  fs.writeFileSync(JSON_OUT, JSON.stringify({ mode: MODE, size: SIZE, reader: SELLS_PLUS ? "new reader, no Plus" : "open reader", screens: results.length, tapped, findings: plain, slow, dips, unsure, errors, controlErrors, results }, null, 1));
  console.log(`\nwritten: ${JSON_OUT}`);
}
process.exit([...findings.values()].some((f) => f.check !== "layers in passing") || errors.length ? 1 : 0);
