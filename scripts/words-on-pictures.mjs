// Words on a picture, measured by the picture's own pixels (1.9, the Themes
// chat's sweep: docs/1.9-build/notes/themes-fable.md, section 25).
//
// The mock checker measures a word against the colours of the boxes it sits
// in, and says "not measured, look" when a picture or a gradient is behind
// it, which is right for a checker of colours: a picture has no one colour.
// This answers the question for the picture. Each line of the words is
// photographed twice, as it is and with the words' fill hidden (their shadow
// kept: a halo drawn for reading on a picture is part of the ground the
// letters stand on). Where the two differ is where the letters are; the
// ground is the second photograph there, and its least kind hundredth (the
// lightest behind light words, the darkest behind dark ones, the outermost
// one percent left out: a speck is not a ground) is what the words' own
// colour is measured on, on each palette. Words at 18.66px bold or 24px and
// over are large and need 3:1; the rest 4.5:1.
//
// As a module: wordsOnPicture(page, selector, { palettes }) on a page already
// open (scripts/mock-check.mjs, openPhone). On the command line it walks the
// places the sweep named, on the export (npm run build:android first):
//
//   node scripts/words-on-pictures.mjs [place,place]
//
// and prints each place's worst line on each palette, and FAIL where one is
// under its need.

import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { contrast, PALETTES } from "./mock-check.mjs";

/**
 * The covers the apps ask the website for (/covers/, set aside from the
 * export), answered from public/covers as purifyapp.net will answer them, so
 * words over a cover or its backdrop are measured on the picture itself.
 */
export async function serveCovers(page) {
  const types = { ".jpg": "image/jpeg", ".avif": "image/avif" };
  await page.route("https://purifyapp.net/covers/**", async (route) => {
    const file = path.join("public", decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(path.join("public", "covers")) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, headers: { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" }, body: fs.readFileSync(file) });
  });
}

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

async function wear(page, mode) {
  await page.evaluate((m) => {
    const h = document.documentElement;
    if (m) h.setAttribute("data-reading-mode", m);
    else h.removeAttribute("data-reading-mode");
    if (!document.querySelector("style[data-words-on-pictures]")) {
      const still = document.createElement("style");
      still.setAttribute("data-words-on-pictures", "");
      // Colours step on transitions; an entrance animation is left to end (a
      // paused one can hold the words at their first, unseen frame).
      still.textContent = "*, *::before, *::after { transition: none !important; }";
      document.head.appendChild(still);
    }
  }, mode);
  await page.waitForTimeout(250);
}

/**
 * Each element answering `selector`, each palette: the worst line of its
 * words, measured on the pixels behind it.
 */
export async function wordsOnPicture(page, selector, { palettes = PALETTES } = {}) {
  const out = [];
  for (const [palette, mode] of palettes) {
    await wear(page, mode);
    const count = await page.locator(selector).count();
    for (let i = 0; i < count; i++) {
      const el = page.locator(selector).nth(i);
      // To the middle of the screen, clear of the bars fixed at its top and foot.
      await el.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" })).catch(() => {});
      await page.waitForTimeout(250);
      const info = await el.evaluate((node) => {
        const cs = getComputedStyle(node);
        // Any colour syntax (color-mix computes to oklab), read back as sRGB
        // through a canvas, as the mock checker reads it; and the opacity of
        // every box it is in.
        const cv = document.createElement("canvas");
        cv.width = cv.height = 1;
        const cx = cv.getContext("2d", { willReadFrequently: true });
        cx.fillStyle = "rgba(0, 0, 0, 0)";
        cx.fillStyle = cs.color;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        let opacity = 1;
        for (let n = node; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
        const range = document.createRange();
        range.selectNodeContents(node);
        // Each line, cut to the element's own box: a clamped paragraph still
        // reports the lines it hides, and those lie over whatever is below it.
        const box = node.getBoundingClientRect();
        const lines = [...range.getClientRects()]
          .map((r) => {
            const left = Math.max(r.left, box.left, 0);
            const top = Math.max(r.top, box.top, 0);
            const right = Math.min(r.right, box.right, innerWidth);
            const bottom = Math.min(r.bottom, box.bottom, innerHeight);
            return { x: Math.floor(left), y: Math.floor(top), w: Math.ceil(right - left), h: Math.ceil(bottom - top) };
          })
          .filter((r) => r.w > 2 && r.h > 6);
        const size = parseFloat(cs.fontSize);
        const weight = Number(cs.fontWeight) || 400;
        return {
          text: (node.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48),
          fg: [d[0], d[1], d[2]],
          alpha: (d[3] / 255) * opacity,
          large: size >= 24 || (size >= 18.66 && weight >= 700),
          lines,
        };
      });
      let worst = null;
      const raw = async (clip) => {
        const { data, info: meta } = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        return { data, n: meta.width * meta.height };
      };
      try {
        const clips = info.lines.map((line) => ({ x: line.x, y: line.y, width: Math.max(1, line.w), height: Math.max(1, line.h) }));
        const withWords = [];
        for (const clip of clips) withWords.push(await raw(clip));
        // Hide the words' fill, keep their shadow, and remember how to put them back.
        await el.evaluate((node) => {
          const touched = [node, ...node.querySelectorAll("*")].map((e) => [e, e.getAttribute("style")]);
          for (const [e] of touched) {
            e.style.setProperty("color", "transparent", "important");
            e.style.setProperty("-webkit-text-fill-color", "transparent", "important");
          }
          window.__wordsBack = touched;
        });
        await page.waitForTimeout(60);
        for (let k = 0; k < clips.length; k++) {
          const a = withWords[k];
          const b = await raw(clips[k]);
          // The letters: where the photograph with the words differs.
          const under = [];
          const all = [];
          for (let p = 0; p < b.n; p++) {
            const c = [b.data[p * 3], b.data[p * 3 + 1], b.data[p * 3 + 2]];
            all.push(c);
            const diff = Math.abs(a.data[p * 3] - c[0]) + Math.abs(a.data[p * 3 + 1] - c[1]) + Math.abs(a.data[p * 3 + 2] - c[2]);
            if (diff > 30) under.push(c);
          }
          const px = under.length >= 12 ? under : all;
          if (!px.length) continue;
          const byLum = px.map((c) => [lum(c), c]).sort((x, y) => x[0] - y[0]);
          const median = byLum[Math.floor(byLum.length / 2)][0];
          const light = lum(info.fg) > median;
          // The least kind hundredth, the outermost one percent left out.
          const at = light ? Math.min(byLum.length - 1, Math.floor(byLum.length * 0.99)) : Math.floor(byLum.length * 0.01);
          const ground = byLum[at][1];
          const r = contrast(info.fg, info.alpha, ground);
          if (!worst || r < worst.ratio) worst = { ratio: r, ground };
        }
      } finally {
        await page.evaluate(() => {
          for (const [e, style] of window.__wordsBack ?? []) {
            if (style === null) e.removeAttribute("style");
            else e.setAttribute("style", style);
          }
          window.__wordsBack = null;
        });
      }
      if (worst) out.push({ palette, text: info.text, need: info.large ? 3 : 4.5, ratio: worst.ratio, ground: worst.ground });
    }
  }
  return out;
}

export function printWords(label, results) {
  let bad = 0;
  console.log(`\n${label}`);
  for (const r of results) {
    const ok = r.ratio + 1e-9 >= r.need;
    if (!ok) bad++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${r.palette.padEnd(12)} ${r.ratio.toFixed(2)}:1 (needs ${r.need}) "${r.text}"`);
  }
  return bad === 0;
}

// The places the sweep named, each a page of the export and its words: the
// words that wear the house's halo (.words-halo), the line under the reading
// room's poster, the Plus pill where the bar stands over a picture, First
// focus's names on their pictures and the numerals under Theology's plates.
export const PLACES = {
  prayers: { to: "/prayers/", selector: ".prayers-hero-verse .words-halo", ready: ".prayers-hero-img" },
  you: { to: "/account/", selector: ".you-hero .words-halo", ready: ".you-hero .words-halo" },
  discover: { to: "/discover/", selector: ".words-halo", ready: ".words-halo" },
  reading: { to: "/reading/", selector: '[data-stage-part="words"] > p.text-caption', ready: '[data-stage-part="words"]' },
  "pill-prayers": { to: "/prayers/", selector: "[data-tab-actions] .premium-pill", ready: ".prayers-hero-img" },
  "pill-you": { to: "/account/", selector: "[data-tab-actions] .premium-pill", ready: ".you-hero" },
  focus: { to: "/settings/", selector: ".set-focus-card > span:not([aria-hidden]):not([hidden])", ready: ".set-focus-card img" },
  plates: { to: "/theology/", selector: "[data-path-plates] .text-paper\\/45", ready: "[data-path-plates]" },
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { go } = await import("./lib/shell-server.mjs");
  const { openPhone } = await import("./mock-check.mjs");
  const only = process.argv[2]?.split(",") ?? Object.keys(PLACES);
  const { page, browser } = await openPhone({ scale: 1, set: { "purify.motion": "off" } });
  await serveCovers(page);
  let all = true;
  for (const name of only) {
    const place = PLACES[name];
    if (!place) throw new Error(`no place ${name}`);
    await go(page, place.to);
    await page.waitForSelector(place.ready, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2200);
    all = printWords(`${name}: ${place.selector}`, await wordsOnPicture(page, place.selector)) && all;
  }
  await browser.close();
  console.log(all ? "\nPASS" : "\nFAIL");
  process.exitCode = all ? 0 : 1;
}
