// A look's picture carries the look's own words (1.9, the looks:
// app/globals.css, "The looks (1.9)").
//
// A look lays one still picture under the page. The mock checker measures a
// word against the colours of the boxes it sits in, and a picture is in no
// box, so a scene that is too light where words are read passes every other
// check. This asks the question of the picture itself: if a line of the
// look's FAINTEST text, or of its full ink, lay anywhere above the place the
// foot begins to take the words, would it still be read?
//
// The room is drawn alone, at a phone's size (the page's own content hidden,
// the foot left out: it is the same picture again), and a window the size of
// a short line of small text is passed over it. A window's ground is its
// least kind hundredth: the lightest behind light words, the darkest behind
// dark ones, with the outermost one percent left out (a star is a point or
// two, smaller than a letter's stroke, and is not a ground). The faintest
// text is the share the look's own rule draws text-paper/45 at, read from
// the stylesheet. It must be 4.5:1 or more, and full ink 7:1 or more.
//
// "Above the foot" is above where the foot is a quarter drawn (72 percent of
// --foot-clear from the screen's foot), and above the tab bar on a look with
// no foot. Below that the page's last lines are giving way to the scene, as
// they give way under the reader's dock on every palette.
//
// The first run, on the build of 2026-11-10, found two of eighteen: Dawn's
// sunrise reached the lines still being read (faint text 2.7:1 a finger above
// the foot) and Incense's plume stood at seven tenths of its strength behind
// them (2.8:1). Both pictures were brought down in scripts/theme-pictures.mjs.
//
//   npm run build:android, then: node scripts/scene-check.mjs [looks,comma]

import fs from "node:fs";

import sharp from "sharp";

import { go } from "./lib/shell-server.mjs";
import { LOOKS, openPhone } from "./mock-check.mjs";

const only = process.argv[2]?.split(",") ?? null;
const CSS = fs.readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

// The screen, and the window passed over it: a short line of caption text.
const W = 390;
const H = 844;
const WINDOW = { w: 150, h: 14, dx: 30, dy: 6 };
// Under the phone's top bar there is no page.
const TOP = 60;
const TAB_BAR_TOP = 755;

const { browser, page } = await openPhone({ scale: 1, set: { "purify.motion": "off" } });
await go(page, "/about/");
await page.waitForTimeout(2500);
await page.addStyleTag({ content: "body > * { visibility: hidden !important; } html[data-look] body::after { display: none !important; }" });

let short = 0;
for (const [label, mode, look] of LOOKS) {
  if (only && !only.includes(look)) continue;
  const facts = await page.evaluate(
    ([m, l]) => {
      const h = document.documentElement;
      if (m) h.setAttribute("data-reading-mode", m);
      else h.removeAttribute("data-reading-mode");
      h.setAttribute("data-look", l);
      const cs = getComputedStyle(h);
      const rgb = (value) => {
        const probe = document.createElement("i");
        probe.style.color = value;
        document.body.append(probe);
        const c = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
        probe.remove();
        return c.slice(0, 3);
      };
      // A look with no picture (Linen, whose sign is its rule) is measured the same way: its page is its ground.
      return { paper: rgb(cs.getPropertyValue("--color-paper").trim()), night: rgb(cs.getPropertyValue("--color-night").trim()) };
    },
    [mode, look],
  );
  // The foot was hidden for the picture; whether the look has one is in the stylesheet.
  const hasFoot = !/html\[data-look\]:not\(([^)]*)\) body::after/.exec(CSS)?.[1].includes(`[data-look="${look}"]`);
  const clear = hasFoot ? parseFloat(new RegExp(`html\\[data-look="${look}"\\] \\{[^}]*--foot-clear:\\s*(\\d+)px`).exec(CSS)?.[1] ?? "0") : 0;
  const faint = new RegExp(`:where\\(html\\[data-look="${look}"\\]\\) :is\\([^)]*\\) \\{\\s*color: color-mix\\(in oklab, var\\(--color-paper\\) (\\d+)%`).exec(CSS);
  if (!faint) throw new Error(`no faint-text rule for ${look} in app/globals.css`);
  const share = Number(faint[1]) / 100;
  const line = clear ? Math.round(H - clear * 0.72) : TAB_BAR_TOP;
  await page.waitForTimeout(350);
  const { data, info } = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const light = lum(...facts.paper) < lum(...facts.night);
  const worst = { faint: { r: Infinity }, full: { r: Infinity } };
  for (let y = TOP; y + WINDOW.h <= line; y += WINDOW.dy) {
    for (let x = 0; x + WINDOW.w <= W; x += WINDOW.dx) {
      const px = [];
      for (let yy = y; yy < y + WINDOW.h; yy++) {
        for (let xx = x; xx < x + WINDOW.w; xx += 2) {
          const i = (yy * info.width + xx) * info.channels;
          px.push([lum(data[i], data[i + 1], data[i + 2]), data[i], data[i + 1], data[i + 2]]);
        }
      }
      px.sort((a, b) => a[0] - b[0]);
      const ground = light ? px[Math.floor(px.length * 0.01)] : px[Math.min(px.length - 1, Math.floor(px.length * 0.99))];
      for (const [kind, a] of [["faint", share], ["full", 1]]) {
        const ink = facts.paper.map((v, i) => v * a + ground[i + 1] * (1 - a));
        const [hi, lo] = [lum(...ink), ground[0]].sort((p, q) => q - p);
        const r = (hi + 0.05) / (lo + 0.05);
        if (r < worst[kind].r) worst[kind] = { r, x, y, ground: ground.slice(1) };
      }
    }
  }
  const ok = worst.faint.r >= 4.5 && worst.full.r >= 7;
  if (!ok) short += 1;
  console.log(
    `${ok ? "ok  " : "NO  "} ${label.padEnd(14)} faintest text (${Math.round(share * 100)}%) ${worst.faint.r.toFixed(2)}:1 at its worst, ${worst.faint.x},${worst.faint.y} on rgb(${worst.faint.ground.join(", ")}); full ink ${worst.full.r.toFixed(2)}:1; measured above y=${line}`,
  );
}
await browser.close();

console.log(short ? `\n${short} look(s) put something behind the words that their faintest text cannot stand on` : "\nevery look's picture carries its faintest text anywhere above its foot");
process.exit(short ? 1 : 0);
