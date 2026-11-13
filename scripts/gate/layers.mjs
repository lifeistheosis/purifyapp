// The gate's floating-layers check (the arbiter, 2026-11-13, after build 95 note
// 7: the Bible's "Highlighted" toast stood over the reader's pill, whose rounded
// edge and white Listen button peeked out above it, "ui overlalping").
//
// While two floating layers are both on the screen (a toast, a sheet, a player,
// the tab bar, an action bar, a popover; any fixed box, a stuck sticky one, the
// top layer), their drawn boxes must not meet. A layer's drawn boxes are what it
// paints, each clipped as the screen clips it (scripts/gate/inpage.mjs, layers):
// a full-width wrapper that draws nothing is not counted, its pill is. A layer
// that covers most of the screen (a full screen, a scrim) is a ground: what is
// behind it is not compared with what is in front. Two layers meet where a reader
// sees one drawn over the other; not where a piece is wholly hidden behind an
// opaque box (a fade tucked behind the tab bar), nor where a piece sits wholly on
// another layer's bare ground over none of its words, pictures or controls (the
// reading line on the top bar's ground). Any meeting fails, at rest or in
// passing; the motion walk measures at rest after every tap and twice on the way
// (scripts/motion-walk.mjs).
//
//   node scripts/gate/layers.mjs --self-test
//
// proves it on planted cases: note 7's shape fails, and so do a sheet with no
// scrim over part of the tab bar, a header stuck half under the top bar, a menu
// over the tab bar and a toast that rises through a bar in passing; the bar
// stepped aside, the two stacked with their own space, two that only touch, a
// modal sheet with its scrim over the tab bar, a sheet that covers the tab bar
// wholly, a sheet's own footer, a header stuck below the top bar, a fade tucked
// behind the tab bar and a line drawn on the top bar's bare ground pass.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { ensureGate } from "./inpage.mjs";

/** The floating layers on the page now and where two meet (scripts/gate/inpage.mjs). */
export async function measureLayers(page, { width, height } = {}) {
  return page.evaluate((o) => window.__gate.layers(o), { width, height });
}

/** One meeting, as the report says it. */
export function sayMeeting(m) {
  const w = m.box.right - m.box.left;
  const h = m.box.bottom - m.box.top;
  return `${m.a} meets ${m.b}: ${w} by ${h}px at ${m.box.left},${m.box.top}${m.pieces ? ` (${m.pieces.front} drawn over ${m.pieces.back})` : ""}`;
}

// ── The self-test ──────────────────────────────────────────────────────

const BAR = (style = "") => `<div data-bar style="position:fixed;left:0;right:0;bottom:90px;height:80px;display:flex;justify-content:center;align-items:center;pointer-events:none;${style}">
  <div style="width:340px;height:56px;border-radius:28px;background:#2a2a2e;display:flex;align-items:center;justify-content:flex-end;padding:0 8px;pointer-events:auto"><button style="height:40px;padding:0 16px;border-radius:20px;border:0;background:#fff;color:#000">Listen</button></div>
</div>`;
const TABS = `<nav data-tabs style="position:fixed;left:0;right:0;bottom:0;height:83px;background:#18181b;display:flex;justify-content:space-around;align-items:center"><a href="#">Today</a><a href="#">Bible</a><a href="#">You</a></nav>`;
const TOAST = (bottom) => `<div data-toast style="position:fixed;left:0;right:0;bottom:${bottom}px;padding:0 12px;pointer-events:none"><div role="status" style="height:52px;border-radius:18px;background:#26262a;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;pointer-events:auto"><span>Highlighted</span><button style="border:0;background:none;color:#fff">Undo</button></div></div>`;
const PAGE = (body) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#101013;color:#eee;font:16px sans-serif}p{margin:16px}</style></head><body>${body}</body></html>`;
const WORDS = Array.from({ length: 40 }, (_, i) => `<p>Line ${i + 1} of the page under the layers.</p>`).join("");

const CASES = [
  // [name, html, should fail, the pair it should name]
  ["note 7: a toast over the reader's pill, a white button peeking above it", WORDS + BAR() + TOAST(100) + TABS, true, ["data-toast", "data-bar"]],
  ["the pill steps aside while the toast shows (opacity 0)", WORDS + BAR("opacity:0") + TOAST(100) + TABS, false],
  ["the two stacked, each with its own space", WORDS + BAR() + TOAST(178) + TABS, false],
  ["two that only touch (no pixel over)", WORDS + `<div data-a style="position:fixed;left:0;right:0;top:100px;height:50px;background:#333"></div><div data-b style="position:fixed;left:0;right:0;top:150px;height:50px;background:#444"></div>`, false],
  [
    "a modal sheet with its scrim over the tab bar",
    WORDS + TABS + `<div role="dialog" aria-modal="true" style="position:fixed;inset:0;background:rgba(0,0,0,0.55)"><div style="position:absolute;left:0;right:0;bottom:0;height:420px;border-radius:24px 24px 0 0;background:#222">A sheet</div></div>`,
    false,
  ],
  ["a sheet with no scrim over part of the tab bar, the bar's foot below it", WORDS + TABS + `<div data-sheet role="dialog" style="position:fixed;left:0;right:0;bottom:40px;height:300px;border-radius:24px 24px 0 0;background:#222;color:#fff">A sheet</div>`, true, ["data-sheet", "data-tabs"]],
  ["a sheet that covers the tab bar wholly (no reader sees the bar)", WORDS + TABS + `<div role="dialog" style="position:fixed;left:0;right:0;bottom:0;height:300px;border-radius:24px 24px 0 0;background:#222;color:#fff">A sheet</div>`, false],
  ["a fade tucked behind the tab bar", WORDS + `<div style="position:fixed;left:0;right:0;bottom:0;height:260px;z-index:1"><span style="position:absolute;left:0;right:0;bottom:0;height:260px;background:linear-gradient(rgba(0,0,0,0),#101013)"></span><div style="position:absolute;left:25px;right:25px;bottom:100px;height:56px;border-radius:28px;background:#2a2a2e;color:#fff">John 1</div></div>` + TABS.replace("<nav data-tabs style=\"", "<nav data-tabs style=\"z-index:2;"), false],
  ["a reading line on the top bar's bare ground", `<div style="position:fixed;left:0;right:0;top:0;height:66px;background:linear-gradient(#101013,#101013);z-index:3"><a href="#" style="position:absolute;left:21px;top:11px;width:44px;height:44px;border-radius:22px;background:#1e1e21"></a></div><div style="position:fixed;left:0;right:0;top:0;height:2px;background:#e8e8ea;z-index:5"></div>` + WORDS, false],
  [
    "a sheet's own fixed footer inside it",
    WORDS + `<div role="dialog" data-sheet style="position:fixed;left:0;right:0;bottom:0;height:300px;background:#222"><p>A sheet</p><div data-foot style="position:fixed;left:0;right:0;bottom:0;height:60px;background:#333">Done</div></div>`,
    false,
  ],
  [
    "a header stuck half under the fixed top bar",
    `<div data-top style="position:fixed;left:0;right:0;top:0;height:56px;background:#1b1b1f;z-index:5">Top bar</div><div style="height:120px"></div><h2 data-stuck style="position:sticky;top:0;margin:0;height:72px;background:#2b2b30">Section</h2>` + WORDS + WORDS,
    true,
    ["data-stuck", "data-top"],
    { scroll: 600 },
  ],
  [
    "a header stuck below the fixed top bar",
    `<div data-top style="position:fixed;left:0;right:0;top:0;height:56px;background:#1b1b1f;z-index:5">Top bar</div><div style="height:120px"></div><h2 style="position:sticky;top:56px;margin:0;height:44px;background:#2b2b30">Section</h2>` + WORDS + WORDS,
    false,
    null,
    { scroll: 600 },
  ],
  [
    "a menu placed over the tab bar",
    WORDS + TABS + `<div style="position:relative;margin:16px"><div data-menu role="menu" style="position:absolute;left:0;top:0;width:200px;height:120px;background:#2a2a2e;color:#fff">Copy</div></div>`,
    true,
    ["data-menu", "data-tabs"],
    { menuAt: 700 },
  ],
];

async function selfTest() {
  const { chromium } = await import("playwright");
  const own = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  let ok = true;
  try {
    for (const [name, body, shouldFail, pair, how = {}] of CASES) {
      await page.setContent(PAGE(body));
      await ensureGate(page);
      if (how.scroll) await page.evaluate((y) => scrollTo(0, y), how.scroll);
      if (how.menuAt) await page.evaluate((y) => (document.querySelector("[data-menu]").parentElement.style.marginTop = `${y}px`), how.menuAt);
      if (how.menuAt) await page.evaluate(() => document.querySelector("[data-menu]").scrollIntoView({ block: "end" }));
      const r = await measureLayers(page, { width: 390, height: 844 });
      const failed = r.meetings.length > 0;
      const named = !pair || r.meetings.some((m) => pair.every((mark) => m.aMarks.includes(mark) || m.bMarks.includes(mark)));
      const right = failed === shouldFail && (!shouldFail || named);
      ok &&= right;
      console.log(`  ${right ? "ok    " : "MISSED"} ${name}: ${failed ? r.meetings.map(sayMeeting).join("; ") : "no two layers meet"}`);
    }
    // In passing: a toast that rises through the bar fails in the frames where they meet, though at
    // rest it ends clear of it (the motion walk measures in the frames on the way).
    await page.setContent(PAGE(WORDS + BAR() + TOAST(100) + TABS));
    await ensureGate(page);
    await page.evaluate(() => {
      const t = document.querySelector("[data-toast]");
      t.style.transition = "bottom 400ms linear";
      requestAnimationFrame(() => (t.style.bottom = "190px"));
    });
    const seen = [];
    for (let k = 0; k < 6; k++) {
      seen.push((await measureLayers(page, { width: 390, height: 844 })).meetings.length > 0);
      await page.waitForTimeout(110);
    }
    const passing = seen.some(Boolean) && !seen[seen.length - 1];
    ok &&= passing;
    console.log(`  ${passing ? "ok    " : "MISSED"} a toast rising through the pill: met it in passing (${seen.map((s) => (s ? "x" : ".")).join("")}), clear at rest`);
  } finally {
    await browser.close();
  }
  console.log(ok ? "\nself-test: the floating-layers check fails what meets and passes what does not" : "\nself-test FAILED");
  return ok;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes("--self-test")) {
    console.log("node scripts/gate/layers.mjs --self-test   (the walk is scripts/motion-walk.mjs)");
    process.exit(2);
  }
  process.exit((await selfTest()) ? 0 : 1);
}
