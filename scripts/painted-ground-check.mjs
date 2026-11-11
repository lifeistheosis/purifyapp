// The mock checker's painted grounds, held to the screen (1.9, T4:
// docs/1.9-build/notes/theology-fable.md, "Words on a gradient are measured").
//
// Words that stand on a gradient (a raised tray, a card's sheen, a fade) have
// no one colour under them, so scripts/mock-check.mjs paints their ground,
// the words' parents laid one over another as the browser paints them, and
// reads it where the words are. A painting is a claim about the screen, and
// this holds it to the screen: each page is photographed whole with its
// letters cleared, and every ground the checker painted is set beside the
// photograph's own pixels in the same box, its lightest and its darkest.
// More than two levels of 255 apart, in any channel, is a failure: the
// painting has missed something that is drawn there.
//
// Not photographed, and counted apart: words pinned to the screen (a
// photograph of the whole page shows a pinned bar once, where the first
// screen ended, so pinned pieces are taken out of it), and words scrolled out
// of their row (the checker measures them where they stand in the row; the
// photograph does not show them).
//
//   npm run build:android, then:
//   node scripts/painted-ground-check.mjs [/path,/path | --all] [--palettes Dark,Light]
//
// With no path it walks the pages below, one of each kind of ground the app
// paints with a gradient; --all walks every screen of the export.

import path from "node:path";

import sharp from "sharp";

import { PALETTES, openPhone, paintedGrounds } from "./mock-check.mjs";
import { screens } from "./lib/screens.mjs";
import { go } from "./lib/shell-server.mjs";

/** One of each kind: Theology's trays, a study, a topic's passages, an answer's long page, the cards of Plans and Prayers, the atlas, Settings' plates, a legal page's trays. */
const PAGES = ["/theology/", "/theology/filioque/", "/topics/the-eucharist/", "/apologetics/atheism/", "/plan/", "/prayers/", "/councils/", "/settings/", "/privacy/", "/reading/"];
/** Levels of 255 a painting may stand from the screen: the browser's own rounding of a gradient. */
const NEAR = 2;

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const only = flag("--palettes")?.split(",") ?? null;
const all = argv.includes("--all");
if (all) argv.splice(argv.indexOf("--all"), 1);
const pages = all ? screens(path.resolve("out")) : (argv[0]?.split(",") ?? PAGES);
const palettes = PALETTES.filter(([name]) => !only || only.includes(name));

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const { browser, page } = await openPhone();
let compared = 0;
let apart = 0;
let far = 0;
const wrong = [];
try {
  for (const where of pages) {
    try {
      await go(page, where, { timeout: 15000 });
    } catch (e) {
      wrong.push(`${where}: did not open (${String(e).split("\n")[0].slice(0, 80)})`);
      continue;
    }
    await page.waitForTimeout(1500);
    for (const [palette, mode] of palettes) {
      await page.evaluate((m) => {
        const h = document.documentElement;
        if (m) h.setAttribute("data-reading-mode", m);
        else h.removeAttribute("data-reading-mode");
        if (!document.querySelector("style[data-painted-ground]")) {
          const still = document.createElement("style");
          still.setAttribute("data-painted-ground", "");
          still.textContent = "*, *::before, *::after { transition: none !important; }";
          document.head.appendChild(still);
        }
      }, mode);
      await page.waitForTimeout(250);
      const grounds = await paintedGrounds(page, "body");
      if (!grounds?.length) continue;
      // The letters cleared, their shadows and underlines with them, and what is pinned to the screen taken out.
      await page.evaluate(() => {
        const clear = document.createElement("style");
        clear.setAttribute("data-painted-ground-clear", "");
        clear.textContent =
          "*, *::before, *::after, *::placeholder, *::marker { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; }";
        document.head.appendChild(clear);
        for (const e of document.querySelectorAll("body *")) {
          if (getComputedStyle(e).position !== "fixed") continue;
          e.setAttribute("data-painted-ground-was", e.style.getPropertyValue("visibility"));
          e.style.setProperty("visibility", "hidden", "important");
        }
      });
      await page.waitForTimeout(250);
      const shot = sharp(await page.screenshot({ fullPage: true })).removeAlpha();
      const { data, info } = await shot.raw().toBuffer({ resolveWithObject: true });
      await page.evaluate(() => {
        document.querySelector("style[data-painted-ground-clear]")?.remove();
        for (const e of document.querySelectorAll("[data-painted-ground-was]")) {
          const was = e.getAttribute("data-painted-ground-was");
          if (was) e.style.setProperty("visibility", was);
          else e.style.removeProperty("visibility");
          e.removeAttribute("data-painted-ground-was");
        }
      });
      let here = 0;
      let hereFar = 0;
      for (const g of grounds) {
        const [x, y, w, h] = g.box;
        if (g.apart || x < 0 || y < 0 || x + w > info.width || y + h > info.height) {
          apart += 1;
          continue;
        }
        let lightest = null;
        let darkest = null;
        for (let yy = y; yy < y + h; yy++) {
          for (let xx = x; xx < x + w; xx++) {
            const i = (yy * info.width + xx) * 3;
            const c = [data[i], data[i + 1], data[i + 2]];
            const l = lum(c);
            if (!lightest || l > lightest.l) lightest = { c, l };
            if (!darkest || l < darkest.l) darkest = { c, l };
          }
        }
        const off = Math.max(...g.lightest.map((v, i) => Math.abs(v - lightest.c[i])), ...g.darkest.map((v, i) => Math.abs(v - darkest.c[i])));
        here += 1;
        if (off > NEAR) {
          hereFar += 1;
          wrong.push(`${where} on ${palette}: "${g.text.slice(0, 32)}" painted rgb(${g.lightest}) to rgb(${g.darkest}), the screen rgb(${lightest.c}) to rgb(${darkest.c}), ${off} levels apart, at ${x},${y} ${w}x${h}`);
        }
      }
      compared += here;
      far += hereFar;
      console.log(`${hereFar ? "NO  " : "ok  "}${where} on ${palette}: ${here} painted grounds beside the screen${hereFar ? `, ${hereFar} more than ${NEAR} levels apart` : ""}`);
    }
  }
} finally {
  await browser.close();
}
for (const line of wrong) console.log(`  ${line}`);
console.log(`\n${compared} painted grounds set beside the screen on ${pages.length} page(s) and ${palettes.length} palette(s): ${far} more than ${NEAR} levels apart${apart ? `; ${apart} not photographed (pinned to the screen, or scrolled out of their row)` : ""}`);
process.exit(far || wrong.length ? 1 : 0);
