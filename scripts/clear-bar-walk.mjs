// The way back on a picture, walked on the native export (build 90 note 3;
// docs/1.9-build/notes/build-90.md).
//
//   npm run build:android && node scripts/clear-bar-walk.mjs [route ...]
//   node scripts/clear-bar-walk.mjs --self-test
//
// Every page whose bar starts clear over its picture (MobileTopBar `overlay`)
// is scrolled 5px at a time from the top. While the bar is clear (no
// data-solid), no word of the page may stand under one of the bar's buttons:
// the measure his screenshot of the Second Council of Nicaea failed, with the
// way back's chevron on "Seventh Ecumenical Council". It also fails a page
// whose bar never turns solid, and a route that should have a clear bar and
// has none, so a page that stops drawing one is said, not skipped.
//
// The pages: every council, every Theology path and topic, Your rule, a
// saint, and a chant, as the export carries them; or the routes given.
// lib/ui/__tests__/clearBar.test.ts holds the code to the rule; this holds
// the pages.
//
// --self-test proves the measure on a page of its own: words under a clear
// bar's plate are found, the same words under a solid bar are not, and words
// beside the plate are not.

import fs from "node:fs";
import path from "node:path";

import { openPhone } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const OUT = path.resolve("out");
const STEP = 5;
const MAX = 1400;

/** The routes the export carries under a folder, one folder each. */
function carried(rel) {
  const dir = path.join(OUT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, "index.txt")))
    .map((d) => d.name)
    .sort();
}

/** Every clear-bar page, with whether it must draw a clear bar (a council or saint with no picture has none). */
function allRoutes() {
  const theology = carried("theology").filter((s) => s !== "path");
  return [
    ...carried("councils").map((s) => ({ route: `/councils/${s}`, must: false })),
    ...carried("theology/path").map((s) => ({ route: `/theology/path/${s}`, must: true })),
    ...theology.map((s) => ({ route: `/theology/${s}`, must: false })),
    { route: "/prayers/personal", must: true },
    { route: "/saints/john-chrysostom", must: true },
    ...carried("chants").slice(0, 1).map((s) => ({ route: `/chants/${s}`, must: true })),
  ];
}

/** In the page: the bar's state, and the first word under one of its buttons while it is clear. */
function measure() {
  const bar = document.querySelector("[data-mobile-topbar]");
  if (!bar || !bar.hasAttribute("data-overlay")) return { state: "none" };
  if (bar.hasAttribute("data-solid")) return { state: "solid" };
  const plates = [...bar.querySelectorAll("a, button")]
    .map((b) => ({ label: b.getAttribute("aria-label") || (b.textContent || "").trim() || b.tagName.toLowerCase(), r: b.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0);
  const root = document.querySelector("main") || document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.textContent || "").trim();
    if (!text || bar.contains(n)) continue;
    const host = n.parentElement;
    if (!host) continue;
    const style = getComputedStyle(host);
    if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      for (const { label, r: b } of plates) {
        if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) {
          return { state: "clear", under: { words: text.slice(0, 48), plate: label, top: Math.round(r.top) } };
        }
      }
    }
  }
  return { state: "clear" };
}

/** Scroll one page from the top until its bar turns solid; the first word found under a clear plate, if any. */
async function walk(page) {
  // The loop runs in the page: a scroll, two frames for the bar's observers
  // to speak, then the measure. One call a page, not one a step.
  return page.evaluate(
    async ({ step, max, measureSrc }) => {
      const measureIn = new Function(`return (${measureSrc})();`);
      const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      for (let y = 0; y <= max; y += step) {
        window.scrollTo(0, y);
        await frames();
        const at = measureIn();
        if (at.state === "none") return { result: "none" };
        if (at.under) return { result: "under", y, ...at.under };
        if (at.state === "solid") return { result: "solid", y };
        if (Math.ceil(window.scrollY + innerHeight) >= document.documentElement.scrollHeight) return { result: "end", y };
      }
      return { result: "never", y: max };
    },
    { step: STEP, max: MAX, measureSrc: measure.toString() },
  );
}

async function selfTest() {
  const { browser, page } = await openPhone({ scale: 1 });
  const fixture = (solid, left) => `<!doctype html><html><body style="margin:0;background:#101013;height:2400px">
    <div data-mobile-topbar data-overlay ${solid ? "data-solid" : ""} style="position:fixed;top:0;left:0;right:0;height:48px;display:flex;align-items:center;padding:0 8px">
      <button aria-label="Back" style="width:44px;height:44px;border-radius:999px;border:0"></button>
    </div>
    <main><p style="position:absolute;top:10px;left:${left}px;margin:0;color:#fff;font:600 13px sans-serif">Seventh Ecumenical Council</p></main>
  </body></html>`;
  const cases = [
    ["words under a clear bar's plate are found", fixture(false, 12), (m) => Boolean(m.under)],
    ["the same words under a solid bar are not", fixture(true, 12), (m) => m.state === "solid" && !m.under],
    ["words beside the plate are not", fixture(false, 120), (m) => m.state === "clear" && !m.under],
  ];
  let ok = true;
  for (const [what, html, pass] of cases) {
    await page.setContent(html);
    const m = await page.evaluate(measure);
    const good = pass(m);
    ok &&= good;
    console.log(`${good ? "ok  " : "FAIL"} ${what}`);
  }
  await browser.close();
  return ok;
}

async function main() {
  if (process.argv.includes("--self-test")) {
    process.exit((await selfTest()) ? 0 : 1);
  }
  if (!fs.existsSync(path.join(OUT, "index.html"))) {
    console.error("No native export in out/: run npm run build:android first.");
    process.exit(2);
  }
  const given = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const routes = given.length > 0 ? given.map((route) => ({ route, must: true })) : allRoutes();
  const { browser, page } = await openPhone({ scale: 1 });
  const failures = [];
  let clear = 0;
  for (const { route, must } of routes) {
    await go(page, route);
    await page.waitForTimeout(1200);
    const r = await walk(page);
    let line;
    if (r.result === "none") {
      line = must ? "FAIL: no clear bar here" : "no clear bar (no picture)";
      if (must) failures.push(`${route}: no clear bar`);
    } else {
      clear += 1;
      if (r.result === "under") {
        line = `FAIL: "${r.words}" under ${r.plate} while the bar is clear, from scroll ${r.y}px (its top at ${r.top}px)`;
        failures.push(`${route}: "${r.words}" under ${r.plate} at ${r.y}px`);
      } else if (r.result === "never") {
        line = `FAIL: the bar is still clear after ${MAX}px`;
        failures.push(`${route}: never solid`);
      } else if (r.result === "end") {
        line = `clean (the page ends at ${r.y}px with the bar clear, and nothing went under it)`;
      } else {
        line = `clean: solid from ${r.y}px, nothing under a plate before`;
      }
    }
    console.log(`${route.padEnd(44)} ${line}`);
  }
  await browser.close();
  console.log(`\n${routes.length} routes, ${clear} with a clear bar, ${failures.length} failing.`);
  if (failures.length) {
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }
}

await main();
