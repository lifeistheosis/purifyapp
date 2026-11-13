// The gate's page-edge check (the arbiter, 2026-11-13: "Content cut at the
// screen's edge or spilling sideways fails, measured against the width asked
// for, never innerWidth"). Build 95's first note was of this kind (the language
// list opened off the left edge, every name off the screen); no gate tool
// measured a page's sideways spill (the re-check's report, 2026-11-13).
//
// What counts is what a reader reads or touches: the lines of words, a picture
// or an icon, a field, a control, a box that paints (a card, a pill), each where
// the boxes it sits in leave it drawn (scripts/gate/inpage.mjs, edge). It is
// measured against the width the walk asked for: a phone's browser widens
// innerWidth to fit what spills, and in the apps the page clips sideways
// overflow (app/globals.css, overflow-x: clip), so there a spill is simply cut
// off at the edge. Not counted: what scrolls sideways in its own row (the row
// still counts), what no reader sees, and a band or a picture that bleeds past
// both edges at once. A fixed box does not scroll, so what stands past the
// screen's top or foot is cut too (at rest).
//
//   node scripts/gate/page-edge.mjs --self-test
//
// proves it on planted cases, in a page that clips sideways as the apps do and
// in one that does not (where the phone's browser widens innerWidth past 390).

import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { ensureGate } from "./inpage.mjs";

/** What is cut at the screen's edge or spills sideways, against the width asked for. */
export async function measureEdge(page, { width, height, vertical = true } = {}) {
  return page.evaluate((o) => window.__gate.edge(o), { width, height, vertical });
}

/** One cut, as the report says it. */
export function sayCut(c) {
  const what = c.off ? "off the screen" : "cut at";
  return `${c.name}: ${c.what}, ${what} ${c.side}${c.inside ? ` (${c.inside} piece${c.inside === 1 ? "" : "s"} inside${c.said ? `, as "${c.said}"` : ""})` : ""}`;
}

// ── The self-test ──────────────────────────────────────────────────────

const PAGE = (body, clip = true) =>
  `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#101013;color:#eee;font:16px sans-serif}${clip ? "html,body{overflow-x:clip}" : ""}p{margin:16px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}</style></head><body>${body}</body></html>`;
const WORDS = Array.from({ length: 12 }, (_, i) => `<p>Line ${i + 1} of a page that fits.</p>`).join("");

const CASES = [
  // [name, html, should fail, a mark it should name, clips sideways]
  [
    "build 95 note 1: the language list opens off the left edge",
    WORDS + `<div style="position:relative;margin:16px;display:flex;justify-content:flex-end"><button>English</button><div data-list role="listbox" style="position:absolute;right:250px;top:40px;width:240px;background:#26262a"><div role="option">English</div><div role="option">العربية</div><div role="option">Ελληνικά</div></div></div>`,
    true,
    "data-list",
  ],
  ["a row of pills wider than the screen, cut by the page's clip", WORDS + `<div data-row style="display:flex;gap:12px;margin:16px;background:#1b1b1f;width:max-content">${["Morning", "Evening", "Compline", "Midnight", "The Hours"].map((w) => `<span style="flex:none;padding:8px 14px;border-radius:99px;background:#333">${w}</span>`).join("")}</div>`, true, "data-row"],
  ["a box that spills while nothing it draws passes the edge", WORDS + `<div style="display:flex;gap:12px;margin:16px;width:520px"><span style="flex:none;padding:8px;background:#333">Morning</span><span style="flex:none;padding:8px;background:#333">Evening</span></div>`, false],
  ["a title that does not wrap", WORDS + `<h2 data-title style="margin:16px;white-space:nowrap">The Life of Our Holy Father Among the Saints</h2>`, true, "data-title"],
  ["a row of cards that scrolls sideways", WORDS + `<div style="display:flex;gap:12px;overflow-x:auto;padding:0 16px">${Array.from({ length: 6 }, (_, i) => `<div style="flex:none;width:150px;height:90px;background:#2a2a2e">Card ${i + 1}</div>`).join("")}</div>`, false],
  ["a row that scrolls, itself wider than the screen", WORDS + `<div data-scroller style="display:flex;gap:12px;overflow-x:auto;width:460px">${Array.from({ length: 6 }, (_, i) => `<div style="flex:none;width:150px;height:90px;background:#2a2a2e">Card ${i + 1}</div>`).join("")}</div>`, true, "data-scroller"],
  ["a screen reader's own words", WORDS + `<span class="sr" style="left:-10000px">Skip to the reading</span>`, false],
  ["a drawer kept off the screen for readers who cannot see it", WORDS + `<nav aria-hidden="true" style="position:fixed;top:0;bottom:0;left:0;width:280px;transform:translateX(-100%);background:#222"><a href="#">Menu</a></nav>`, false],
  ["a drawer hidden off the screen", WORDS + `<nav style="position:fixed;top:0;bottom:0;left:0;width:280px;transform:translateX(-100%);visibility:hidden;background:#222"><a href="#">Menu</a></nav>`, false],
  ["a band that bleeds past both edges", WORDS + `<div style="margin:0 -24px;padding:24px 40px;background:#1d1d21">A band of colour across the page</div>`, false],
  ["a name cut short inside its own box", WORDS + `<div style="width:160px;margin:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Saint Gregory of Nyssa, Bishop</div>`, false],
  ["a fixed sheet whose foot is past the screen's foot", WORDS + `<div data-sheet role="dialog" style="position:fixed;left:0;right:0;bottom:-120px;height:420px;background:#222"><p>A sheet</p><button style="position:absolute;bottom:20px;left:16px">Done</button></div>`, true, "data-sheet"],
  ["a fixed sheet whose foot is in its own scroller", WORDS + `<div role="dialog" style="position:fixed;left:0;right:0;bottom:0;height:420px;background:#222;overflow-y:auto"><div style="height:900px"><p>A tall sheet</p></div></div>`, false],
  ["a sheet resting at half, the rest reached by drawing it up", WORDS + `<div role="dialog" style="position:fixed;left:0;right:0;bottom:0;height:700px;background:#222;transform:translateY(240px)"><p>Translation</p><p style="position:absolute;bottom:20px;left:16px;margin:0">The Septuagint</p></div>`, false],
  ["a page that fits", WORDS, false],
  ["the innerWidth trap: a page that does not clip, widened past 390 by a row", WORDS + `<div data-row style="display:flex;width:520px;margin:16px"><span data-piece style="flex:none;width:520px;background:#333">A row of 520px</span></div>`, true, "data-piece", false],
];

async function selfTest() {
  const { chromium } = await import("playwright");
  const own = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  let ok = true;
  try {
    for (const [name, body, shouldFail, mark, clip = true] of CASES) {
      await page.setContent(PAGE(body, clip));
      await ensureGate(page);
      const inner = await page.evaluate(() => innerWidth);
      const cuts = await measureEdge(page, { width: 390, height: 844 });
      const failed = cuts.length > 0;
      const named = (!mark || cuts.some((c) => c.marks.includes(mark))) && (clip || inner === 390 || cuts.some((c) => c.spill));
      const right = failed === shouldFail && named;
      ok &&= right;
      console.log(`  ${right ? "ok    " : "MISSED"} ${name}${inner !== 390 ? ` (innerWidth ${inner})` : ""}: ${failed ? cuts.map(sayCut).join("; ") : "nothing cut"}`);
    }
  } finally {
    await browser.close();
  }
  console.log(ok ? "\nself-test: the page-edge check fails what is cut or spills, against the width asked for, and passes the rest" : "\nself-test FAILED");
  return ok;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes("--self-test")) {
    console.log("node scripts/gate/page-edge.mjs --self-test   (the walk is scripts/motion-walk.mjs)");
    process.exit(2);
  }
  process.exit((await selfTest()) ? 0 : 1);
}
