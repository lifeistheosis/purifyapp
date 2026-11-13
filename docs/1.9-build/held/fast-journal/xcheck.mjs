// The touched screens through checkMock with pixels: five palettes and the seventeen looks,
// at 390, 800 and 1032, in English and in Arabic. On the export.
//   node docs/1.9-build/held/fast-journal/xcheck.mjs [fast,journal,sheet] [new]
import { browser, open, go, wait, tap, PAGES, EVERY_BLOCK } from "./xlib.mjs";
import { checkMock, LOOKS } from "../../../../scripts/mock-check.mjs";
const WHICH = new Set((process.argv[2] ?? "fast,journal,sheet").split(","));
const NEW = process.argv[3] === "new";
const SIZES = (process.env.SIZES ?? "390x844,800x1280,1032x1376").split(",").map((s) => s.split("x").map(Number));
const LOCALES = (process.env.LOCALES ?? "en,ar").split(",");
const results = [];
const fails = [];
const hold = async (page, label, selector = "body") => {
  for (const [name, opts] of [["palettes", { pixels: true }], ["looks", { pixels: true, palettes: LOOKS }]]) {
    const r = await checkMock(page, selector, opts);
    const ok = r.failures.length === 0;
    results.push([`${label} [${name}]`, ok]);
    const lines = [...new Set(r.failures.map((f) => `${f.check} ${f.palette ?? ""}: ${f.what}: ${f.detail}`))];
    if (!ok) fails.push([`${label} [${name}]`, lines.slice(0, 12).join("\n  ")]);
    if (r.unmeasured.length) console.log(`  ??   ${label} [${name}]: ${r.unmeasured.length} left for the eye: ${r.unmeasured.slice(0, 3).join("; ")}`);
    console.log(`${ok ? "PASS" : "FAIL"}  ${label} [${name}]`);
  }
};
for (const [width, height] of SIZES) for (const locale of LOCALES) {
  const at = `${width} ${locale}`;
  const scene = async (label, set, to, ready, prepare, selector) => {
    const { ctx, page, errors } = await open({ width, height, set, locale });
    try {
      await go(page, to);
      await page.waitForSelector(ready, { timeout: 30000 });
      await wait(1500);
      if (prepare) await prepare(page);
      await hold(page, `${label}, ${at}`, selector);
      if (errors.length) { results.push([`${label}, ${at}: page errors`, false]); fails.push([`${label}, ${at}`, errors.join(" | ")]); }
    } catch (e) { results.push([`${label}, ${at}`, false]); fails.push([`${label}, ${at}`, String(e).slice(0, 300)]); console.log(`FAIL  ${label}, ${at}: ${String(e).slice(0, 200)}`); }
    await ctx.close();
  };
  if (WHICH.has("fast")) {
    await scene("the Fast, a new reader", {}, "/fasting", "h1");
    await scene("the Fast, marked", {}, "/fasting", "h1", async (page) => {
      if (NEW) {
        await tap(page, page.locator("[data-fast-mark=today] [role=radio]").nth(0));
        const rows = page.locator("[data-fast-day]");
        await rows.nth(1).scrollIntoViewIfNeeded();
        await tap(page, rows.nth(1));
        await wait(500);
        await tap(page, page.locator("[data-fast-days] li").nth(1).locator("[role=radio]").nth(1));
      } else {
        await tap(page, page.locator("button[aria-pressed]").nth(0));
        await tap(page, page.locator("button[aria-pressed]").nth(2));
      }
      await wait(600);
    });
  }
  if (WHICH.has("journal")) {
    await scene("the Journal, a new reader", {}, "/journal", "[data-journal-today]");
    await scene("the Journal, with pages", { "purify:journal": JSON.stringify(PAGES) }, "/journal", "[data-journal-today]");
  }
  if (WHICH.has("sheet")) {
    // Two pages, each short enough to stand whole over the sheet's foot: a field under the tools is not a field a reader sees.
    const PAGE_A = ["# A day in November", "What I read this morning, and what stayed with me.", "[[verse john 3:16]]"].join("\n\n");
    const PAGE_B = ["# A day in November", "> Begin again tomorrow.\n> ~ My grandmother", "==yellow== Lord Jesus Christ, Son of God, have mercy on me.", "And the last words of the page."].join("\n\n");
    for (const [name, body] of [["Scripture's card", PAGE_A], ["a quote of one's own and a highlight", PAGE_B]]) {
      await scene(`the writing sheet, ${name}`, { "purify:journal.draft": JSON.stringify({ kind: "reflection", body }) }, "/journal", "[data-journal-today]", async (page) => {
        await tap(page, page.locator("[data-journal-write]:visible").last());
        await wait(1800);
      }, "[role=dialog]");
    }
    await scene("the writing sheet, More", { "purify:journal.draft": JSON.stringify({ kind: "reflection", body: PAGE_A }) }, "/journal", "[data-journal-today]", async (page) => {
      await tap(page, page.locator("[data-journal-write]:visible").last());
      await wait(1800);
      await tap(page, page.locator("[data-page-toolbar] [role=toolbar] button").nth(3));
      await wait(700);
    }, "[role=dialog]");
  }
}
await browser.close();
console.log(`\n${results.filter(([, ok]) => ok).length} of ${results.length} pass`);
for (const [l, why] of fails) console.log(`\nFAIL ${l}\n  ${why}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
