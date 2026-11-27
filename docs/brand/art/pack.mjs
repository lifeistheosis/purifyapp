#!/usr/bin/env node
// The four directions as packs (his word, 2026-11-27: "I need pack images and
// variants"): each style drawn over four of Purify's doors, so a style can be
// judged as a set and fed to an image model as a pack of references.
//
//   node docs/brand/art/pack.mjs   writes pack/<style>-<door>.png and pack/<style>-sheet.png
//
// Grays only, no rays, no sparkles, no cream; drawn in code, so these show the
// look and not the finish.

import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, "../../../package.json"));
const sharp = require("sharp");
const [K, D, M, L, S] = ["#0B0B0C", "#26262A", "#4E4E54", "#8E8E95", "#D9D9DD"];
const W = 1200, H = 900;
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const arch = (x, y, w, h) => `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`;
const rect = (x, y, w, h) => `M${x} ${y} H${x + w} V${y + h} H${x} Z`;

// ---- the styles: each draws a ground, a solid by tone, an opening, a flame, a glow, a line ----
let uid = 0;
const id = (p) => `${p}${++uid}`;
const STYLES = {
  carved: (r) => ({
    name: "A Carved", ground: K,
    back: () => {
      const out = [];
      for (let y = 30; y < 640; y += 24) for (let x = -40; x < W; ) {
        const len = 40 + r() * 120;
        out.push(`<path d="M${x.toFixed(0)} ${y} q ${(len / 2).toFixed(0)} ${((r() - 0.5) * 8).toFixed(1)} ${len.toFixed(0)} 0" stroke="${M}" stroke-width="${(2 + r() * 2.5).toFixed(1)}" fill="none" stroke-linecap="round"/>`);
        x += len + 18 + r() * 50;
      }
      return `<rect width="${W}" height="${H}" fill="${K}"/>${out.join("")}`;
    },
    solid: (d, tone, [x0, x1]) => {
      if (tone === "dark") return `<path d="${d}" fill="${K}" stroke="${M}" stroke-width="3"/>`;
      const c = id("c"), fill = tone === "lit" ? S : L, from = x0 + (x1 - x0) * 0.62, lines = [];
      for (let x = from; x < x1; x += 11) lines.push(`<line x1="${x.toFixed(0)}" y1="0" x2="${(x + 6).toFixed(0)}" y2="${H}" stroke="${K}" stroke-width="5"/>`);
      return `<clipPath id="${c}"><path d="${d}"/></clipPath><path d="${d}" fill="${fill}"/><g clip-path="url(#${c})">${lines.join("")}</g>`;
    },
    opening: (d) => `<path d="${d}" fill="${K}"/>`,
    flame: (d) => `<path d="${d}" fill="${S}"/>`,
    glow: (x, y, rad) => [0.55, 0.75, 0.95].map((k) => `<circle cx="${x}" cy="${y}" r="${(rad * k).toFixed(0)}" fill="none" stroke="${D}" stroke-width="5"/>`).join(""),
    line: (x1, y1, x2, y2, w = 6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S}" stroke-width="${w}" stroke-linecap="round"/>`,
  }),
  print: () => ({
    name: "B Print", ground: D,
    dots: (clip, fn, step = 13) => {
      const out = [];
      for (let y = 0; y < H; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < W; x += step) {
        const rad = fn(x, y);
        if (rad > 0.4) out.push(`<circle cx="${x}" cy="${y}" r="${rad.toFixed(2)}"/>`);
      }
      return `<g ${clip ? `clip-path="url(#${clip})"` : ""} fill="${K}">${out.join("")}</g>`;
    },
    back() { return `<rect width="${W}" height="${H}" fill="${M}"/>${this.dots(null, (x, y) => Math.max(0, 6.2 * (1 - y / 700)))}`; },
    solid(d, tone, [x0, x1]) {
      const c = id("c"), fill = { lit: L, shadow: M, dark: D }[tone];
      if (tone === "dark") return `<path d="${d}" fill="${D}"/>`;
      return `<clipPath id="${c}"><path d="${d}"/></clipPath><path d="${d}" fill="${fill}"/>${this.dots(c, (x) => Math.max(0, ((x - (x0 + (x1 - x0) * 0.35)) / ((x1 - x0) * 0.65)) * 6.2), 12)}`;
    },
    opening: (d) => `<path d="${d}" fill="${D}"/>`,
    flame: (d) => `<path d="${d}" fill="${S}"/>`,
    glow: (x, y, rad) => `<circle cx="${x}" cy="${y}" r="${rad * 0.5}" fill="${L}" opacity="0.35"/>`,
    line: (x1, y1, x2, y2, w = 6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S}" stroke-width="${w}" stroke-linecap="round"/>`,
  }),
  mist: () => ({
    name: "C Mist", ground: K,
    back: () => {
      const g = id("g");
      return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${K}"/><stop offset="0.8" stop-color="${D}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${g})"/>`;
    },
    solid: (d, tone) => `<path d="${d}" fill="${tone === "lit" ? K : tone === "shadow" ? "#121214" : K}" stroke="${L}" stroke-opacity="${tone === "lit" ? 0.55 : 0.25}" stroke-width="3"/>`,
    opening: (d) => `<path d="${d}" fill="${S}"/><path d="${d}" fill="${S}" opacity="0.45" filter="url(#blur)"/>`,
    flame: (d) => `<path d="${d}" fill="${S}"/><path d="${d}" fill="${S}" opacity="0.6" filter="url(#blur)"/>`,
    glow: (x, y, rad) => {
      const g = id("r");
      return `<defs><radialGradient id="${g}" cx="${x}" cy="${y}" r="${rad}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${S}" stop-opacity="0.7"/><stop offset="0.3" stop-color="${L}" stop-opacity="0.3"/><stop offset="1" stop-color="${L}" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${rad}" fill="url(#${g})"/>`;
    },
    line: (x1, y1, x2, y2, w = 6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${L}" stroke-opacity="0.85" stroke-width="${w}" stroke-linecap="round"/>`,
    moon: (d) => `<path d="${d}" fill="${S}"/><path d="${d}" fill="${S}" opacity="0.5" filter="url(#blur)"/>`,
  }),
  paper: (r) => ({
    name: "D Paper", ground: K,
    back: () => {
      const g = id("g"), stars = Array.from({ length: 24 }, () => `<circle cx="${(r() * W).toFixed(0)}" cy="${(30 + r() * 360).toFixed(0)}" r="${(2.5 + r() * 3).toFixed(1)}" fill="${L}"/>`).join("");
      return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${D}"/><stop offset="1" stop-color="${M}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${g})"/>${stars}`;
    },
    solid: (d, tone) => `<path d="${d}" fill="${{ lit: L, shadow: M, dark: D }[tone]}" filter="url(#lift)"/>`,
    opening: (d) => `<path d="${d}" fill="${S}"/>`,
    flame: (d) => `<path d="${d}" fill="${S}" filter="url(#lift)"/>`,
    glow: (x, y, rad) => `<circle cx="${x}" cy="${y}" r="${rad * 0.42}" fill="${L}" opacity="0.5" filter="url(#lift)"/>`,
    line: (x1, y1, x2, y2, w = 6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S}" stroke-width="${w}" stroke-linecap="round"/>`,
  }),
};

// ---- the doors: each a scene drawn with whichever style it is handed ----
const flameAt = (x, y, s = 1) => `M${x} ${y - 40 * s} C ${x + 18 * s} ${y - 8 * s}, ${x + 15 * s} ${y + 14 * s}, ${x} ${y + 22 * s} C ${x - 15 * s} ${y + 14 * s}, ${x - 18 * s} ${y - 8 * s}, ${x} ${y - 40 * s} Z`;
const cross = (k) => [k.line(600, 78, 600, 192, 12), k.line(584, 100, 616, 100, 12), k.line(568, 124, 632, 124, 12), k.line(580, 166, 620, 152, 12)].join("");
const DOORS = {
  parish: { title: "Find a parish", draw: (k) => [
    k.glow(900, 212, 260), (k.moon ?? ((d) => k.solid(d, "lit", [790, 1010])))(`M790 212 a110 110 0 1 0 220 0 a110 110 0 1 0 -220 0`),
    k.solid("M0 700 C 300 650, 900 650, 1200 700 V900 H0 Z", "dark", [0, 1200]),
    k.solid("M430 362 A170 172 0 0 1 770 362 Z", "lit", [430, 770]), k.solid(rect(470, 362, 260, 82), "lit", [470, 730]), k.solid(rect(330, 444, 540, 456), "lit", [330, 870]),
    ...[arch(500, 380, 26, 52), arch(560, 380, 26, 52), arch(614, 380, 26, 52), arch(674, 380, 26, 52), arch(410, 520, 60, 160), arch(730, 520, 60, 160), arch(560, 640, 80, 260)].map(k.opening), cross(k)] },
  saints: { title: "Saints", draw: (k) => [
    k.solid(arch(360, 90, 480, 810), "dark", [360, 840]), k.glow(600, 420, 460),
    k.solid(rect(280, 600, 640, 40), "lit", [280, 920]), k.solid(rect(570, 640, 60, 260), "shadow", [570, 630]),
    ...[[360, 470], [440, 420], [520, 380], [600, 350], [680, 380], [760, 420], [840, 470]].flatMap(([x, top]) => [k.solid(rect(x - 11, top, 22, 600 - top), "lit", [x - 11, x + 11]), k.flame(flameAt(x, top - 22, 0.8))])] },
  reading: { title: "Reading", draw: (k) => [
    k.solid(arch(160, 120, 300, 520), "shadow", [160, 460]), k.glow(860, 260, 420),
    k.line(860, 0, 860, 214, 4), k.solid("M820 214 H900 L888 262 C 878 280, 842 280, 832 262 Z", "lit", [820, 900]), k.flame(flameAt(860, 238, 0.9)),
    k.solid("M300 600 L860 520 L880 572 L320 660 Z", "shadow", [300, 880]), k.solid(rect(560, 600, 70, 300), "dark", [560, 630]),
    k.solid("M330 590 Q 460 540 590 560 L 590 512 Q 460 494 330 540 Z", "lit", [330, 590]), k.solid("M590 560 Q 720 540 850 500 L 850 452 Q 720 494 590 512 Z", "lit", [590, 850])] },
  chants: { title: "Chants", draw: (k) => {
    const bell = (cx, top, w) => `M${cx - w * 0.17} ${top} C ${cx - w * 0.22} ${top + w * 0.12}, ${cx - w * 0.3} ${top + w * 0.6}, ${cx - w * 0.52} ${top + w * 0.82} L ${cx + w * 0.52} ${top + w * 0.82} C ${cx + w * 0.3} ${top + w * 0.6}, ${cx + w * 0.22} ${top + w * 0.12}, ${cx + w * 0.17} ${top} Z`;
    return [k.glow(600, 470, 430), k.solid("M260 900 V330 A340 300 0 0 1 940 330 V900 H850 V350 A250 230 0 0 0 350 350 V900 Z", "lit", [260, 940]),
      k.solid(rect(350, 330, 500, 26), "shadow", [350, 850]),
      ...[[600, 360, 230], [450, 372, 130], [750, 372, 130]].flatMap(([cx, top, w]) => [k.solid(bell(cx, top, w), "lit", [cx - w / 2, cx + w / 2]), k.line(cx, top + w * 0.82, cx, 900, 3)])];
  } },
};

async function draw(styleKey, doorKey, seed) {
  uid = 0;
  const k = STYLES[styleKey](rng(seed)), door = DOORS[doorKey];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id="lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity="0.7"/></filter>
      <linearGradient id="fade" x1="0" y1="560" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${k.ground}" stop-opacity="0"/><stop offset="1" stop-color="${k.ground}" stop-opacity="0.92"/></linearGradient></defs>
    ${k.back()}${door.draw(k).join("")}
    <rect y="560" width="${W}" height="340" fill="url(#fade)"/>
    <text x="600" y="838" text-anchor="middle" font-family="Inter Display, Inter, sans-serif" font-weight="700" font-size="64" fill="#FFFFFF">${door.title}</text></svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const r = rng(seed * 7 + 1);
  for (let i = 0; i < data.length; i += info.channels) {
    const g = Math.round((r() + r() + r() - 1.5) * 12);
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, data[i + c] + g));
  }
  const file = path.join(HERE, "pack", `${styleKey}-${doorKey}.png`);
  await sharp(data, { raw: info }).grayscale().png({ compressionLevel: 9 }).toFile(file);
  return file;
}

const tw = 520, th = 390, gap = 24, pad = 24, head = 70;
for (const [si, styleKey] of Object.keys(STYLES).entries()) {
  const files = [];
  for (const [di, doorKey] of Object.keys(DOORS).entries()) files.push(await draw(styleKey, doorKey, si * 10 + di + 1));
  const mask = Buffer.from(`<svg width="${tw}" height="${th}"><rect width="${tw}" height="${th}" rx="28" fill="#fff"/></svg>`);
  const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(tw, th).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer(), left: pad + (i % 2) * (tw + gap), top: head + pad + Math.floor(i / 2) * (th + gap) })));
  const label = Buffer.from(`<svg width="${pad * 2 + tw * 2 + gap}" height="${head + pad}"><text x="${pad}" y="${head - 8}" font-family="Inter Display, Inter" font-weight="700" font-size="40" fill="#fff">${STYLES[styleKey](rng(1)).name}</text></svg>`);
  await sharp({ create: { width: pad * 2 + tw * 2 + gap, height: head + pad * 2 + th * 2 + gap, channels: 3, background: K } })
    .composite([{ input: label, left: 0, top: 0 }, ...tiles]).png().toFile(path.join(HERE, "pack", `${styleKey}-sheet.png`));
  console.log(`${styleKey}: 4 tiles and a sheet`);
}
