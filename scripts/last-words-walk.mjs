// A page's last words can be read on every look (1.9: app/globals.css,
// "The page ends above its foot").
//
// A look draws its picture once more over the foot of the screen, from
// --foot-clear above the screen's foot (240px on most looks), by an eased
// share: a line passing through it goes quiet into the scene, as the look
// means it to. But a page's LAST words cannot pass. Where they rest when the
// page is at its end is the highest they will ever stand, and the app's
// frame used to leave room under a page for the bars alone. So on a look the
// last row of Settings rested half taken by the picture, and the sign-in
// page's "Continue with Google" with it: 88 of the export's 123 screens,
// measured on 2026-11-10, 68 of them below the foot's quarter.
//
// This walks one page of every route the export carries
// (scripts/lib/screens.mjs), on a phone, wearing a look the reader's own way,
// each page scrolled to its end. It finds the lowest thing a reader reads or
// taps in the page's own flow: a word, or a control (a button, a link, a
// field). Not a bar or a chip pinned over the page, and nothing the browser
// is not drawing (a closed answer in a list of questions). It fails if that
// rests inside the foot: below where the foot begins.
//
// Two looks by default, one of each height of foot: Mosaic, whose foot is
// the tallest (246px), and Olive, a light one, of the twelve at 240px. (Patmos
// was the third, the one light look at 244px, until the two looks of the sea
// came out on 2026-11-13.) The room is each look's own --foot-clear, so a
// look's height is all that differs. A look with no foot (Night sky, Linen)
// has nothing to walk.
//
// What it does not reach: a screen drawn only after a tap (a sheet, a
// question of the welcome), and the website, which the apps' export is not.
//
// The measure proves itself on pages of its own before every walk, and alone
// with --self-test (no export needed): a saint card's life clamped to three
// lines, its hidden lines laid out down into the foot, passes (the measure
// failed it until 2026-11-13, when it read clipping from the boxes around
// the words and not from the words' own box); words and a button resting in
// the foot fail.
//
//   npm run build:android, then: node scripts/last-words-walk.mjs [out dir] [--look mosaic,olive] [--only /path/,/path/]
//   node scripts/last-words-walk.mjs --self-test

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { screens } from "./lib/screens.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const argv = process.argv.slice(2);
const take = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const SELF_TEST = argv.includes("--self-test");
if (SELF_TEST) argv.splice(argv.indexOf("--self-test"), 1);
const ONLY = take("--only")?.split(",") ?? null;
const LOOKS = (take("--look") ?? "mosaic,olive").split(",");
const OUT = path.resolve(argv[0] ?? "out");
if (!SELF_TEST && !fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

const H = 844;
const SHEET = fs.readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** Where a look's foot begins, from the top of the screen: --foot-clear from its foot. Null for a look with no foot. */
function footBegins(look) {
  const hasFoot = !/html\[data-look\]:not\(([^)]*)\) body::after/.exec(SHEET)?.[1].includes(`[data-look="${look}"]`);
  const clear = hasFoot ? parseFloat(new RegExp(`html\\[data-look="${look}"\\] \\{[^}]*--foot-clear:\\s*(\\d+)px`).exec(SHEET)?.[1] ?? "0") : 0;
  return clear ? H - clear : null;
}

/** How far inside the foot a bottom edge rests, in whole pixels; more than 1 is a fault. */
const insideFoot = (bottom, begins) => Math.round(bottom - begins);

/** A screen whose last words rest in the foot on purpose: its address, and why. None today. */
const BY_DESIGN = [];

/** The lowest thing read or tapped in the page's own flow, as it stands now. Runs in the page. */
function lowest() {
  const pinned = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const position = getComputedStyle(p).position;
      if (position === "fixed" || position === "sticky") return true;
    }
    return false;
  };
  /** How far down a box is really shown: a box that hides what spills, itself
      or an ancestor, cuts it short. The element the words are in is read too,
      not only its ancestors: a three-line blurb (-webkit-line-clamp with
      overflow hidden) holds the whole saint's life in the DOM and lays every
      line out, but shows three; the rest is clipped by the blurb's own box,
      and a reader never sees it. Starting at the ancestors alone measured a
      saint card's clamped life down into the foot on /saints/ (805px on a
      844 screen), words no reader reads. */
  const shown = (el, top, bottom) => {
    let [y0, y1] = [top, bottom];
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const r = p.getBoundingClientRect();
      y0 = Math.max(y0, r.top);
      y1 = Math.min(y1, r.bottom);
    }
    return y1 - y0 >= 2 ? y1 : null;
  };
  const drawn = (el) => el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  let low = null;
  const keep = (bottom, what) => {
    if (bottom !== null && (!low || bottom > low.bottom)) low = { bottom, what };
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.replace(/\s+/g, " ").trim();
    const el = t.parentElement;
    if (!text || !el || el.closest(".sr-only, [hidden], style, script, noscript, [aria-hidden='true']")) continue;
    if (!drawn(el) || pinned(el)) continue;
    let strength = 1;
    for (let p = el; p; p = p.parentElement) strength *= Number(getComputedStyle(p).opacity);
    if (strength < 0.05) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.right < 0 || r.left > innerWidth) continue;
      keep(shown(el, r.top, r.bottom), `"${text.slice(0, 44)}"`);
    }
  }
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea, [role='button'], [role='switch'], [role='slider']")) {
    if (!drawn(el) || pinned(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.right < 0 || r.left > innerWidth) continue;
    const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
    keep(shown(el, r.top, r.bottom), `the ${el.tagName.toLowerCase()} "${name.slice(0, 36)}"`);
  }
  return {
    low,
    look: document.documentElement.getAttribute("data-look"),
    foot: getComputedStyle(document.body, "::after").content !== "none",
    scrolls: document.documentElement.scrollHeight > innerHeight + 1,
  };
}

// ── The measure's own proof ─────────────────────────────────────────────
// Pages of its own on the walk's phone, a 240px foot (the foot of twelve
// looks), so the foot begins at 604. Each case says whether its last words
// rest in the foot.
const LIFE =
  "Born in Syria in the third century, he became a physician and, with his brother, healed without payment, " +
  "asking of the sick only that they believe in Christ. Under Diocletian both were seized, tried and beheaded, " +
  "and the Church remembers them as unmercenaries, who took no silver for the gift they were given freely.";
const CASES = [
  [
    "a saint card's life clamped to three lines, its hidden lines laid out down into the foot (/saints/, 2026-11-13)",
    `<div style="height:480px"></div><p style="margin:0 16px;font:16px/22px serif;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden">${LIFE} ${LIFE}</p>`,
    false,
  ],
  [
    "a name cut to one line inside its own box",
    `<div style="height:540px"></div><div style="width:160px;margin:0 16px;font:16px/22px serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Saints Cyrus and John, Unmercenaries of Alexandria</div>`,
    false,
  ],
  [
    "words in a box that scrolls, out of sight below its own foot",
    `<div style="height:400px"></div><div style="height:120px;overflow-y:auto;margin:0 16px;font:16px/22px serif"><p style="margin:0">${LIFE} ${LIFE} ${LIFE}</p></div>`,
    false,
  ],
  [
    "a bar pinned over the foot",
    `<div style="height:400px"></div><p style="margin:0 16px;font:16px/22px serif">Today</p><nav style="position:fixed;left:0;right:0;bottom:0;height:64px"><a href="#" style="display:block;padding:20px">Prayers</a></nav>`,
    false,
  ],
  [
    "a closed answer, which the browser does not draw",
    `<div style="height:520px"></div><details style="margin:0 16px;font:16px/22px serif"><summary>Is it free?</summary><p>${LIFE} ${LIFE}</p></details>`,
    false,
  ],
  [
    "a paragraph whose last line rests in the foot",
    `<div style="height:560px"></div><p style="margin:0 16px;font:16px/22px serif">${LIFE}</p>`,
    true,
  ],
  [
    "a button resting in the foot (the sign-in page's Continue with Google, 2026-11-10)",
    `<div style="height:600px"></div><button style="display:block;margin:0 16px;height:48px;font:16px sans-serif">Continue with Google</button>`,
    true,
  ],
];

async function selfTest(browser) {
  const begins = H - 240;
  const ctx = await browser.newContext({ viewport: { width: 390, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  let ok = true;
  for (const [name, html, fault] of CASES) {
    // The app's own viewport: without it a phone lays a page out 980px wide.
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">${html}</body></html>`);
    const { low } = await page.evaluate(lowest);
    const by = low ? insideFoot(low.bottom, begins) : -Infinity;
    const failed = by > 1;
    const right = failed === fault;
    ok &&= right;
    console.log(`  ${right ? "ok  " : "WRONG"} ${name}: ${low ? `${low.what} ends at ${Math.round(low.bottom)}, ${by > 0 ? `${by}px inside the foot` : `${-by}px above it`}` : "nothing read"}${right ? "" : fault ? " (should fail)" : " (should pass)"}`);
  }
  await ctx.close();
  console.log(ok ? "self-test: the measure fails last words that rest in the foot, and passes words no reader sees there" : "self-test FAILED");
  return ok;
}

// The cloud sessions carry their own Chromium (as openPhone in scripts/mock-check.mjs); elsewhere Playwright's.
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const proved = await selfTest(browser);
if (SELF_TEST || !proved) {
  await browser.close();
  process.exit(proved ? 0 : 1);
}
const list = ONLY ?? screens(OUT);
console.log(`${list.length} screens on a phone, each at its end, in ${LOOKS.join(" and ")}`);
const failures = [];
const allowed = [];
let measured = 0;
for (const look of LOOKS) {
  const begins = footBegins(look);
  if (begins === null) {
    console.log(`  ${look} has no foot: nothing to walk`);
    continue;
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: H }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript((id) => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("purify.motion", "off");
      // The chant's own question rises over a prayer page's foot once a day: turned off, as a reader turns it off.
      localStorage.setItem("purify:chant.ask", "off");
      // The app's own way of wearing a look: the reader's stored choice.
      localStorage.setItem("purify.reader.theme", id);
    } catch {}
  }, look);
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  let deepest = { by: -Infinity, at: "" };
  for (const [i, at] of list.entries()) {
    if (i % 25 === 0) console.log(`  ${look}: ${i} of ${list.length}`);
    try {
      await go(page, at, { timeout: 15000 });
      await page.waitForTimeout(1100);
      // To the page's end, and again for as long as it grows (a list that fills as it is reached).
      let height = -1;
      for (let k = 0; k < 40; k++) {
        const now = await page.evaluate(() => {
          scrollTo(0, document.documentElement.scrollHeight);
          return document.documentElement.scrollHeight;
        });
        if (now === height) break;
        height = now;
        await page.waitForTimeout(350);
      }
      const found = await page.evaluate(lowest);
      measured += 1;
      if (found.look !== look) {
        failures.push(`${look} ${at}: the look is not worn (data-look is ${found.look ?? "absent"})`);
        continue;
      }
      if (!found.foot) {
        failures.push(`${look} ${at}: the look has no foot on this screen`);
        continue;
      }
      if (!found.low) continue;
      const by = insideFoot(found.low.bottom, begins);
      if (by > deepest.by) deepest = { by, at };
      if (by <= 1) continue;
      const named = BY_DESIGN.find(([address]) => address === at);
      if (named) allowed.push(`${at}: ${named[1]}`);
      else failures.push(`${look} ${at}: ${found.low.what} rests ${by}px inside the foot (at ${Math.round(found.low.bottom)} of ${H}; the foot begins at ${begins})${found.scrolls ? "" : ", and the page does not scroll"}`);
    } catch (e) {
      failures.push(`${look} ${at}: the walk could not measure it (${String(e).split("\n")[0].slice(0, 120)})`);
    }
  }
  console.log(`  ${look}: the foot begins at ${begins}px; the lowest last word of any screen rests ${deepest.by <= 0 ? `${-deepest.by}px above it` : `${deepest.by}px inside it`} (${deepest.at})`);
  await ctx.close();
}
await browser.close();

console.log(`\n${measured} screens measured`);
if (allowed.length) {
  console.log(`\nresting in the foot by design, by name and reason (${allowed.length}):`);
  for (const a of [...new Set(allowed)]) console.log(`  ${a}`);
}
console.log(failures.length ? `\n${failures.length} fault(s):` : "\nevery screen's last words rest clear of the look's foot");
for (const f of failures) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
