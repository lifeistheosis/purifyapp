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
//     [--controls '"Terms"|1 reply']   (only the controls whose name holds one of these,
//     split on |: a gate measuring named findings again; Gate 3c, 2026-11-15)
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
const CONTROLS = flag("--controls")?.split("|").filter(Boolean) ?? null;
const WORKERS = Math.max(1, Number(flag("--workers") ?? 2));
const REDUCED = has("--reduced");
const MODE = REDUCED ? "reduce" : "on";
const MAX = Math.max(1, Number(flag("--max") ?? (REDUCED ? 6 : 30)));
// With --controls the names are the limit: every control on the screen is marked,
// so a named one further down than the lane's limit is still reached. Before this
// the limit was taken first and the names applied after, so the reduced lane's six
// never reached EIKON's door (0 taps in Updates 86's four runs) nor the library's
// creed row, "Terms of Service", "Psalm 14:1" and "2 Peter 1:3-4" (Updates 90).
// Gate 4, 2026-11-15.
const MARK = CONTROLS ? 1000 : MAX;
const JSON_OUT = flag("--json");
const SHOTS = flag("--shots");
const SIZE = (flag("--size") ?? "390x844").split("x").map(Number);
if (SIZE.length !== 2 || SIZE.some((n) => !Number.isInteger(n) || n < 300 || n > 3000)) throw new Error("--size takes a width and a height, as 800x1280");
const [WIDTH, HEIGHT] = SIZE;
const ONLINE = has("--online");
const SELF_TEST = has("--self-test");
// --loaded track | sound (build 98 notes 14 and 8): no screen walk; instead every tab switch, both
// ways, with a track loaded in the player, or with a sound playing alone. --cpu slows the page as a
// phone is for Now Playing's timings (4 by default).
const LOADED = flag("--loaded");
const CPU = Math.max(1, Number(flag("--cpu") ?? 4));
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
console.log(`${list.length} screens ${ON}, ${CONTROLS ? "every named control" : `up to ${MAX} controls`} on each, ${WORKERS} at a time, ${ONLINE ? "reading the main web" : "with no network"}, ${motionWords(MODE)}, ${readerWords()}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (at) => at.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home";
const RECORD = { moves: REDUCED, width: WIDTH, height: HEIGHT, minMs: 900, stillMs: 450, maxMs: 2600 };
/** The tab bar's and the top bar's controls: the same on every screen. */
const CHROME = "[data-tab-bar], [data-mobile-topbar], [data-plates], [data-plates-row]";
const CHROME_SCREENS = REDUCED ? 1 : 3;
const chromeSeen = new Map();
if (LOADED) process.exit(await loadedTour());

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
  return { fails, unsure: v.unsure, dips: v.dips ?? [], glides: v.glides ?? [], change: v.change, frames: v.frames, answered: v.answered, vtNames: v.vtNames ?? [], error: rec.error };
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
          row.glides = r.v.glides;
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
    const marked = await page.evaluate(markControls, MARK);
    result.found = marked.found;
    const inChrome = await page.evaluate((sel) => [...document.querySelectorAll("[data-tapwalk]")].sort((a, b) => Number(a.dataset.tapwalk) - Number(b.dataset.tapwalk)).map((el) => Boolean(el.closest(sel))), CHROME);
    for (const c of marked.controls) {
      const row = { name: c.name, verdict: "pass", fails: [], meetings: [], cuts: [], passing: [] };
      if (CONTROLS && !CONTROLS.some((t) => c.name.includes(t))) {
        row.verdict = "skipped";
        row.why = "not named by --controls";
        result.controls.push(row);
        continue;
      }
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
          const again = (await page.evaluate(markControls, MARK)).controls[c.i];
          if (!again || again.name !== c.name) return "the screen drew differently on its second visit";
          await firstTouch(page, cdp);
          if ((await reach(page, c, MARK)) === "redrawn") return "the screen kept drawing it again as it was reached";
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
        // Gate 3 (2026-11-14, Updates 73's open 1): the picture the app itself marks to carry
        // (data-carry, found as lib/ui/routeMotion.ts's pictureOf finds it), whatever its file's name.
        const carryKey = await page.evaluate((i) => {
          const el = document.querySelector(`[data-tapwalk="${i}"]`);
          if (!el) return null;
          const pic = el.matches("[data-carry]") ? el : (el.querySelector("[data-carry]") ?? (el.children.length === 0 ? el.parentElement?.querySelector("[data-carry]") : null));
          return pic ? (pic.getAttribute("data-carry") ?? "") : null;
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
        // A link whose picture wears data-carry, opening a page whose picture takes it (data-carry-into,
        // with its key or with none), must carry it, where the same-file check above cannot see it.
        if (row.went && carryKey !== null && MODE === "on") {
          const taker = await page
            .evaluate((key) => {
              const all = [...document.querySelectorAll("[data-carry-into]")];
              const t = (key ? all.find((e) => e.getAttribute("data-carry-into") === key) : undefined) ?? all.find((e) => e.getAttribute("data-carry-into") === "");
              return t ? t.getAttribute("data-carry-into") || "(any)" : null;
            }, carryKey)
            .catch(() => null);
          const carried = r.v.vtNames.some((n) => /\(carried/.test(n));
          row.carry = { key: carryKey, taker, carried };
          if (taker && !carried && !row.fails.some((f) => f.kind === "carried"))
            row.fails = [...row.fails, { kind: "carried", detail: `the card's picture wears data-carry="${carryKey}" and ${row.went} takes it (data-carry-into="${taker}"), and no View Transition carried it` }];
        }
        row.unsure = r.v.unsure;
        row.dips = r.v.dips;
        row.glides = r.v.glides;
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
// A step that carried half the change in its first frame as content glided (scripts/gate/frames.mjs,
// "A glide is not a cut"): listed for the eye, not failed.
const glides = results.flatMap((r) => [
  ...(r.arrival?.glides ?? []).map((d) => `${r.at} the page switch from ${r.arrival.from}: ${d}`),
  ...r.gestures.flatMap((g) => (g.glides ?? []).map((d) => `${r.at} ${g.name}: ${d}`)),
  ...r.controls.flatMap((c) => (c.glides ?? []).map((d) => `${r.at} tap ${c.name}${c.went ? ` (went to ${c.went})` : ""}: ${d}`)),
]);
if (glides.length) {
  console.log(`\nglides, half the change in their first frame and then part of the way along in three or more (not failed; for the eye) (${glides.length}):`);
  for (const d of glides.slice(0, 40)) console.log(`  ${d}`);
  if (glides.length > 40) console.log(`  ... and ${glides.length - 40} more (in --json)`);
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
  fs.writeFileSync(JSON_OUT, JSON.stringify({ mode: MODE, size: SIZE, reader: SELLS_PLUS ? "new reader, no Plus" : "open reader", screens: results.length, tapped, findings: plain, slow, dips, glides, unsure, errors, controlErrors, results }, null, 1));
  console.log(`\nwritten: ${JSON_OUT}`);
}
process.exit([...findings.values()].some((f) => f.check !== "layers in passing") || errors.length ? 1 : 0);

// ── With something loaded (build 98 notes 14 and 8) ────────────────────
//
// His word of 2026-11-15: "a small stutter when switching between these screens", the reader's
// dock over the tab bar while a track was loaded. No walk had ever had anything loaded in the
// player, so no tab switch with the dock or the mini player was ever measured. Here every tab
// switch, both ways (twenty), is recorded and judged as any tap is (a cut, a blank frame, a box
// that jumps fail), with a track loaded (--loaded track: the dock on the Bible, the mini player
// everywhere else) or a sound playing alone (--loaded sound), and the foot is counted after each
// switch: one player shown, never two and never none. With a track, Now Playing's opening and
// closing are timed at --cpu, frame by frame in the page: the longest frame and every frame over
// 50ms (note 8). The track is John 10 read aloud, from the Bible's own Listen, its recording a stand-in: the
// export's own bell (out/audio/ambience/bell.mp3), served for the recordings' host, so the walk
// asks nothing of the network.

async function loadedTour() {
  const browser = await chromium.launch({ ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}), args: ["--autoplay-policy=no-user-gesture-required"] });
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
  const bell = fs.readFileSync(path.join(OUT, "audio/ambience/bell.mp3"));
  await ctx.route("https://audio.purifyapp.net/**/*.mp3", (r) => r.fulfill({ status: 200, contentType: "audio/mpeg", body: bell }));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const tabs = ["Today", "Bible", "Discover", "Prayers", "You"];
  const tapTab = async (i) => {
    const box = await page.evaluate((n) => {
      const a = document.querySelectorAll("[data-tab-bar] a")[n];
      const r = a?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, i);
    if (!box) throw new Error(`no tab ${tabs[i]}`);
    await tapAt(cdp, box.x, box.y);
  };
  const tapWhere = async (find) => {
    const box = await page.evaluate(find);
    if (!box) return false;
    await tapAt(cdp, box.x, box.y);
    return true;
  };
  /** Waits for `find` (a box in the page, or null) to find something, up to `ms`. */
  const until = async (find, ms) => {
    const end = Date.now() + ms;
    for (;;) {
      if (await page.evaluate(find)) return true;
      if (Date.now() > end) return false;
      await sleep(250);
    }
  };
  // The foot's players as they stand: the mini player and the reader's dock that are drawn.
  // The box of the foot's player that is drawn, or null.
  // The foot's surface: with a track, the dock on the Bible and the mini player everywhere else;
  // with a sound playing alone, the Bible's pill (which carries the sound's own button, lit) and
  // the mini player everywhere else (Updates 98e: the count expected a player on the Bible).
  const FOOT = LOADED === "sound" ? ["[data-mini-player]", "[data-reader-pill]"] : ["[data-mini-player]", "[data-reader-dock]"];
  const FACE = LOADED === "sound" ? ["[data-mini-player] .mini-player", "[data-reader-pill] [data-fit]"] : ["[data-mini-player] .mini-player", "[data-reader-dock] .reader-dock"];
  const footBox = () =>
    page.evaluate(({ foot, face }) => {
      const el = [...document.querySelectorAll(face.join(", "))].find((e) => getComputedStyle(e.closest(foot.join(", "))).display !== "none" && e.getBoundingClientRect().height > 0);
      const r = el?.getBoundingClientRect();
      return r ? { top: r.top, bottom: r.bottom } : null;
    }, { foot: FOOT, face: FACE });
  const footNow = () =>
    page.evaluate((foot) =>
      [...document.querySelectorAll(foot.join(", "))]
        .filter((el) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05 && r.height > 0;
        })
        .map((el) => (el.matches("[data-reader-dock]") ? "dock" : el.matches("[data-reader-pill]") ? "pill" : "mini player")),
    FOOT);
  const centre = (sel) => `(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.getBoundingClientRect().height > 0); const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`;
  const report = { loaded: LOADED, motion: MODE, switches: [], nowPlaying: null, setup: null };
  let failed = 0;
  try {
    await go(page, "/", { timeout: 60000 });
    await sleep(1500);
    await firstTouch(page, cdp);
    if (LOADED === "track") {
      await go(page, "/bible/john/10/", { timeout: 30000 });
      await sleep(1500);
      const played = await tapWhere(`(() => { const el = [...document.querySelectorAll("[data-reader-pill] button")].find((b) => /Listen/.test(b.textContent ?? "")); const r = el?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
      if (!played) throw new Error("no Listen on John 10's pill");
      await sleep(1500);
    } else {
      // The chapter the Bible's tab then opens, as with a track. Its pill comes with the chapter,
      // which in the apps is read after the page opens, so the walk waits for the pill's sound
      // button (Updates 98e: tapped 1.8s after the tab, it was not there yet, and the pass never ran).
      await go(page, "/bible/john/10/", { timeout: 30000 });
      const soundButton = centre("[data-reader-pill] button[aria-haspopup='dialog'][aria-label='Ambience']");
      if (!(await until(soundButton, 15000))) throw new Error("no sound button on the Bible's pill");
      await sleep(600);
      await tapWhere(soundButton);
      const aSound = centre("[role='dialog'] button[aria-pressed='false']");
      if (!(await until(aSound, 8000))) throw new Error("no sound in the ambience sheet");
      await sleep(500);
      await tapWhere(aSound);
      await sleep(900);
      await page.keyboard.press("Escape");
      await sleep(900);
    }
    await tapTab(0);
    await sleep(1500);
    report.setup = { foot: await footNow() };
    if (report.setup.foot.length !== 1) throw new Error(`after loading, the foot shows ${report.setup.foot.join(" and ") || "nothing"}`);
    for (let a = 0; a < tabs.length; a++) {
      for (let b = 0; b < tabs.length; b++) {
        if (a === b) continue;
        const back = async () => {
          await tapTab(a);
          await sleep(1500);
        };
        await back();
        const boxBefore = await footBox();
        // Frame by frame in the page, the foot's players while the switch runs: the dock and the
        // mini player are one surface, so every frame shows exactly one. Two at once is the mini
        // player left standing over the new page; none is the cut between them.
        await page.evaluate((foot) => {
          const w = window;
          w.__foot = [];
          w.__footOn = true;
          const shownOf = (el) => {
            const st = getComputedStyle(el);
            return st.display !== "none" && st.visibility !== "hidden" && Number(st.opacity) > 0.05 && el.getBoundingClientRect().height > 0;
          };
          const loop = () => {
            w.__foot.push([...document.querySelectorAll(foot.join(", "))].filter(shownOf).length);
            if (w.__footOn) requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        }, FOOT);
        const rec = await recordFrames(page, cdp, () => tapTab(b), RECORD);
        const r = { v: await judged(rec, `/loaded-${LOADED}/`, `${tabs[a]}-${tabs[b]}`) };
        await sleep(600);
        const foot = await footCut(rec, boxBefore, await footBox());
        // --shots: the foot's band in every frame from the tap, side by side (their times in the report).
        if (SHOTS && foot) foot.strip = await footStrip(rec, boxBefore, await footBox(), path.join(SHOTS, `foot-${LOADED}-${MODE}-${tabs[a]}-${tabs[b]}.png`)).catch(() => null);
        const counts = await page.evaluate(() => {
          window.__footOn = false;
          return window.__foot;
        });
        const shown = await footNow();
        const fails = r.v.fails.map((f) => `${f.kind}: ${f.detail}`);
        const two = counts.filter((c) => c > 1).length;
        const none = counts.filter((c) => c === 0).length;
        if (two) fails.push(`one surface: ${two} frame(s) with the dock and the mini player both drawn`);
        if (none) fails.push(`one surface: ${none} frame(s) with no player at the foot (a cut between them)`);
        // The foot as the reader sees it, which during a switch is the browser's pictures and not the
        // page: half or more of the change at the foot in one frame, outside reduced motion, is a cut.
        if (MODE !== "reduce" && foot && foot.total >= 4 && foot.share >= 0.5) fails.push(`cut at the foot: ${Math.round(foot.share * 100)}% of its change in one frame, ${foot.ms}ms after the tap`);
        if (shown.length !== 1) fails.push(`one surface: the foot shows ${shown.join(" and ") || "nothing"} after the switch`);
        const unsure = r.v.unsure.length > 0 && !fails.length;
        if (fails.length) failed += 1;
        report.switches.push({ from: tabs[a], to: tabs[b], foot: shown, fails, unsure, vtNames: r.v.vtNames, footChange: foot });
        console.log(`  ${tabs[a]} to ${tabs[b]}: ${fails.length ? `FAIL ${fails.join("; ")}` : unsure ? "unsure" : "pass"} (foot: ${shown.join(", ") || "none"})`);
      }
    }
    if (LOADED === "track") {
      // Now Playing, opened from the mini player on Prayers and closed with its own button, timed at --cpu.
      await tapTab(3);
      await sleep(1500);
      // Frame by frame from the tap: each frame's time, where the panel stands (its top, from the
      // foot of the screen up to 0), and whether a blurred layer is drawn in it while it moves
      // (Updates 98e: the slide's start, measured from the tap, and the blur that moved with it).
      const timed = async (act) => {
        await page.evaluate(() => {
          const w = window;
          w.__frames = [];
          w.__panel = [];
          w.__framesOn = true;
          w.__t0 = performance.now();
          let last = performance.now();
          const loop = (t) => {
            w.__frames.push(Math.round((t - last) * 10) / 10);
            last = t;
            const panel = document.querySelector("[data-now-playing] > .dark-island, [role='dialog'][aria-modal='true'][aria-label='Now playing'] > .dark-island");
            const r = panel?.getBoundingClientRect();
            const moving = Boolean(r && r.top > 1 && r.top < innerHeight - 1);
            w.__panel.push({ t: Math.round(t - w.__t0), top: r ? Math.round(r.top) : null, blur: moving && Boolean(panel.querySelector("[style*='blur(']")) });
            if (w.__framesOn) requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        });
        await act();
        await sleep(1200);
        const { frames, panel } = await page.evaluate(() => {
          window.__framesOn = false;
          return { frames: window.__frames, panel: window.__panel };
        });
        const moved = panel.find((p) => p.top !== null && p.top > 1 && p.top < HEIGHT - 1);
        const landed = [...panel].reverse().find((p) => p.top !== null && p.top > 1);
        return {
          frames: frames.length,
          longest: Math.max(0, ...frames),
          over50: frames.filter((f) => f > 50).length,
          first10: frames.slice(0, 10),
          movedAt: moved ? moved.t : null,
          lastMoving: landed ? landed.t : null,
          blurMoving: panel.filter((p) => p.blur).length,
          // Where the panel stood, every third frame (for the report).
          trace: panel.filter((_, i) => i % 3 === 0).slice(0, 24).map((p) => `${p.t}:${p.top ?? "-"}${p.blur ? "b" : ""}`).join(" "),
        };
      };
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
      const open = await timed(() => tapWhere(centre("[data-mini-player] button[aria-label^='Now playing']")));
      const openFoot = await page.evaluate(() => Boolean(document.querySelector("[role='dialog'][aria-modal='true']")));
      const close = await timed(() => tapWhere(centre("[role='dialog'] button[aria-label='Close'], [role='dialog'] button[aria-label^='Close']")));
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      report.nowPlaying = { cpu: CPU, opened: openFoot, open, close };
      console.log(`  Now Playing at CPU ${CPU}x: open ${open.frames} frames, longest ${open.longest}ms, ${open.over50} over 50ms (first: ${open.first10.join(" ")}); the slide moving from ${open.movedAt}ms to ${open.lastMoving}ms after the tap, a blurred layer moving in ${open.blurMoving} frame(s); close ${close.frames} frames, longest ${close.longest}ms, ${close.over50} over 50ms, a blurred layer moving in ${close.blurMoving} frame(s)`);
      if (!openFoot) failed += 1;
      // No blur moves with the sheet (CLAUDE.md; note 8): a blurred layer in a moving panel is the
      // costliest thing a phone's web view can be asked to move.
      if (MODE !== "reduce" && open.blurMoving + close.blurMoving > 0) {
        console.log(`  FAIL Now Playing: a blurred layer moved with the sheet in ${open.blurMoving + close.blurMoving} frame(s)`);
        failed += 1;
      }
    }
  } catch (e) {
    report.error = String(e?.message ?? e);
    console.log(`  not walked: ${report.error}`);
    failed += 1;
  }
  await ctx.close();
  await browser.close();
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  const n = report.switches.length;
  console.log(`\n${n} tab switches with ${LOADED === "track" ? "a track loaded" : "a sound playing alone"}, ${MODE === "reduce" ? "reduced motion" : "motion on"}: ${n - report.switches.filter((s) => s.fails.length).length} passed, ${report.switches.filter((s) => s.fails.length).length} failed${report.error ? `; stopped: ${report.error}` : ""}`);
  return failed ? 1 : 0;
}

/** The foot's player, the box it stands in before the switch and after it, frame by frame from the tap: its whole change, and the largest share of it in one frame. */
async function footCut(rec, a, b) {
  if (!a && !b) return null;
  const top = Math.max(0, Math.min(a?.top ?? HEIGHT, b?.top ?? HEIGHT) - 4) / HEIGHT;
  const bottom = Math.min(HEIGHT, Math.max(a?.bottom ?? 0, b?.bottom ?? 0) + 4) / HEIGHT;
  // In the order they were drawn: the screencast can hand a frame over after a later one.
  const after = rec.frames.filter((f) => f.t >= rec.tapped - 50).sort((x, y) => x.t - y.t);
  if (after.length < 3) return null;
  const px = await Promise.all(
    after.map(async (f) => {
      const buf = Buffer.from(f.data, "base64");
      const { width: w, height: h } = await sharp(buf).metadata();
      const y = Math.round(h * top);
      return sharp(buf).extract({ left: 0, top: y, width: w, height: Math.max(1, Math.round(h * bottom) - y) }).resize(96, 40, { fit: "fill" }).greyscale().raw().toBuffer();
    }),
  );
  const d = (a, b) => {
    let t = 0;
    for (let i = 0; i < a.length; i++) t += Math.abs(a[i] - b[i]);
    return t / a.length;
  };
  const total = d(px[0], px[px.length - 1]);
  let worst = 0;
  let at = 1;
  for (let i = 1; i < px.length; i++) {
    const step = d(px[i - 1], px[i]);
    if (step > worst) [worst, at] = [step, i];
  }
  return {
    total: Math.round(total * 10) / 10,
    worst: Math.round(worst * 10) / 10,
    share: total > 0 ? Math.round((worst / total) * 100) / 100 : 0,
    ms: Math.round(after[at].t - rec.tapped),
    frames: after.length,
    // Each frame's time from the tap and its step from the one before, as a share of the whole change.
    steps: px.map((p, i) => ({ ms: Math.round(after[i].t - rec.tapped), share: i && total > 0 ? Math.round((d(px[i - 1], p) / total) * 100) / 100 : 0 })),
  };
}

/** The foot's band (the boxes before and after, and 120px over them) in every frame from the tap to 900ms, side by side, full size. */
async function footStrip(rec, a, b, file) {
  const top = Math.max(0, Math.min(a?.top ?? HEIGHT, b?.top ?? HEIGHT) - 120);
  const bottom = Math.min(HEIGHT, Math.max(a?.bottom ?? 0, b?.bottom ?? 0) + 70);
  const after = rec.frames.filter((f) => f.t >= rec.tapped - 50 && f.t <= rec.tapped + 900).sort((x, y) => x.t - y.t);
  if (!after.length) return null;
  const tiles = await Promise.all(
    after.map(async (f) => {
      const buf = Buffer.from(f.data, "base64");
      const { width: w, height: h } = await sharp(buf).metadata();
      const k = h / HEIGHT;
      return sharp(buf).extract({ left: 0, top: Math.round(top * k), width: w, height: Math.max(1, Math.round((bottom - top) * k)) }).resize(WIDTH, Math.round(bottom - top), { fit: "fill" }).png().toBuffer();
    }),
  );
  const gap = 6;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width: tiles.length * WIDTH + (tiles.length - 1) * gap, height: Math.round(bottom - top), channels: 3, background: { r: 255, g: 0, b: 128 } } })
    .composite(tiles.map((input, n) => ({ input, left: n * (WIDTH + gap), top: 0 })))
    .png()
    .toFile(file);
  return { file: path.basename(file), times: after.map((f) => Math.round(f.t - rec.tapped)) };
}
