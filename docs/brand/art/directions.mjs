#!/usr/bin/env node
// Four directions for Purify's illustrations in black and grayscale (his word,
// 2026-11-27: "I don't like it can you make more designs", after the first
// two references). One subject in all four, a domed church at night, so only
// the style differs; each drawn as a Discover tile with its title, as Hallow's
// are seen. Drawn in code: grays only, no rays, no sparkles, no cream.
//
//   node docs/brand/art/directions.mjs   writes directions/A-carved.png ... D-paper.png and directions/all.png

import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, "../../../package.json"));
const sharp = require("sharp");
const [K, D, M, L, S] = ["#0B0B0C", "#26262A", "#4E4E54", "#8E8E95", "#D9D9DD"];
const W = 1200, H = 900;

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The church, one shape for all four: a dome, its drum, the body, the door and windows.
const DOME = "M430 362 A170 172 0 0 1 770 362 Z";
const DRUM = "M470 362 H730 V444 H470 Z";
const BODY = "M330 444 H870 V900 H330 Z";
const arch = (x, y, w, h) => `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`;
const DOOR = arch(560, 640, 80, 260);
const WINS = [arch(410, 520, 60, 160), arch(730, 520, 60, 160)];
const DRUMWINS = [arch(500, 380, 26, 52), arch(560, 380, 26, 52), arch(614, 380, 26, 52), arch(674, 380, 26, 52)];
const cross = (c, w) => `<g stroke="${c}" stroke-width="${w}" stroke-linecap="round"><line x1="600" y1="78" x2="600" y2="192"/><line x1="584" y1="100" x2="616" y2="100"/><line x1="568" y1="124" x2="632" y2="124"/><line x1="580" y1="166" x2="620" y2="152"/></g>`;
const title = (ground) => `
  <defs><linearGradient id="fade" x1="0" y1="560" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${ground}" stop-opacity="0"/><stop offset="1" stop-color="${ground}" stop-opacity="0.92"/></linearGradient></defs>
  <rect y="560" width="${W}" height="340" fill="url(#fade)"/>
  <text x="600" y="838" text-anchor="middle" font-family="Inter Display, Inter, sans-serif" font-weight="700" font-size="64" fill="#FFFFFF">Find a parish</text>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;

// A. Carved: a linocut, black and silver, cut lines for texture.
function carved() {
  const r = rng(3), sky = [];
  for (let y = 36; y < 600; y += 24) {
    for (let x = -40; x < W; ) {
      const len = 40 + r() * 120, gap = 18 + r() * 50, wob = (r() - 0.5) * 8;
      sky.push(`<path d="M${x.toFixed(0)} ${y} q ${(len / 2).toFixed(0)} ${wob.toFixed(1)} ${len.toFixed(0)} 0" stroke="${M}" stroke-width="${(2 + r() * 2.5).toFixed(1)}" fill="none" stroke-linecap="round"/>`);
      x += len + gap;
    }
  }
  const moonCuts = [0, 1, 2, 3, 4].map((i) => `<path d="M${838 - i * 14} ${300 - i * 4} A ${110 - i * 10} ${110 - i * 10} 0 0 1 ${812 - i * 6} ${130 + i * 12}" stroke="${K}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("");
  const domeCuts = [0, 1, 2, 3].map((i) => `<path d="M${640 + i * 30} 196 Q ${700 + i * 26} 280 ${660 + i * 28} 362" stroke="${K}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("");
  const wallCuts = [0, 1, 2, 3, 4, 5].map((i) => `<line x1="${812 + i * 10}" y1="460" x2="${812 + i * 10}" y2="900" stroke="${K}" stroke-width="5"/>`).join("");
  const ground = Array.from({ length: 30 }, () => { const x = r() * W, y = 690 + r() * 200; return `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q 22 -6 44 0" stroke="${M}" stroke-width="4" fill="none" stroke-linecap="round"/>`; }).join("");
  return svg(`<rect width="${W}" height="${H}" fill="${K}"/>${sky.join("")}
    <circle cx="900" cy="212" r="112" fill="${S}"/>${moonCuts}
    <path d="M0 690 C 300 640, 900 640, 1200 690 V900 H0 Z" fill="${K}"/>${ground}
    <path d="${DOME}" fill="${S}"/>${domeCuts}<path d="${DRUM}" fill="${S}"/>${DRUMWINS.map((d) => `<path d="${d}" fill="${K}"/>`).join("")}
    <path d="${BODY}" fill="${S}"/>${wallCuts}${[DOOR, ...WINS].map((d) => `<path d="${d}" fill="${K}"/>`).join("")}
    <line x1="330" y1="444" x2="870" y2="444" stroke="${K}" stroke-width="10"/>${cross(S, 12)}${title(K)}`);
}

// B. Print: flat grays shaded with halftone dots, as an editorial print.
function print() {
  const dots = (clipId, fn, step = 14) => {
    const out = [];
    for (let y = 0; y < H; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < W; x += step) {
      const rad = fn(x, y);
      if (rad > 0.4) out.push(`<circle cx="${x}" cy="${y}" r="${rad.toFixed(2)}"/>`);
    }
    return `<g clip-path="url(#${clipId})" fill="${K}">${out.join("")}</g>`;
  };
  return svg(`<defs>
      <clipPath id="sky"><rect width="${W}" height="700"/></clipPath>
      <clipPath id="dome"><path d="${DOME}"/></clipPath>
      <clipPath id="body"><path d="${BODY}"/><path d="${DRUM}"/></clipPath>
      <clipPath id="moon"><circle cx="900" cy="212" r="112"/></clipPath>
    </defs>
    <rect width="${W}" height="${H}" fill="${M}"/>
    ${dots("sky", (x, y) => Math.max(0, 6.6 * (1 - y / 640)))}
    <circle cx="900" cy="212" r="112" fill="${S}"/>
    ${dots("moon", (x, y) => Math.max(0, ((x - 820) / 190) * 5 - 1.2), 11)}
    <path d="M0 700 C 300 660, 900 660, 1200 700 V900 H0 Z" fill="${D}"/>
    <path d="${DOME}" fill="${L}"/>${dots("dome", (x) => Math.max(0, ((x - 540) / 230) * 6.4), 12)}
    <path d="${DRUM}" fill="${L}"/><path d="${BODY}" fill="${L}"/>
    ${dots("body", (x) => Math.max(0, ((x - 600) / 270) * 6.4), 12)}
    ${[...DRUMWINS, DOOR, ...WINS].map((d) => `<path d="${d}" fill="${D}"/>`).join("")}
    ${WINS.map((d) => `<path d="${d}" fill="${S}" transform="translate(6 6) scale(0.98)" opacity="0.0"/>`).join("")}
    <rect x="330" y="436" width="540" height="12" fill="${D}"/>${cross(S, 12)}${title(D)}`);
}

// C. Mist: soft cinematic layers, a dark church against the moon's glow.
function mist() {
  return svg(`<defs>
      <linearGradient id="skyC" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${K}"/><stop offset="0.75" stop-color="${D}"/></linearGradient>
      <radialGradient id="glow" cx="600" cy="300" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${S}" stop-opacity="0.75"/><stop offset="0.28" stop-color="${L}" stop-opacity="0.35"/><stop offset="1" stop-color="${L}" stop-opacity="0"/></radialGradient>
      <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L}" stop-opacity="0"/><stop offset="0.5" stop-color="${L}" stop-opacity="0.28"/><stop offset="1" stop-color="${L}" stop-opacity="0"/></linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="10"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#skyC)"/>
    <circle cx="600" cy="300" r="520" fill="url(#glow)"/>
    <circle cx="600" cy="262" r="150" fill="${S}" opacity="0.9"/>
    <path d="M0 610 L60 560 L110 590 L170 540 L240 585 L300 560 L360 600 L1200 600 V900 H0 Z" fill="${M}" opacity="0.55"/>
    <path d="M840 600 L880 548 L930 575 L990 530 L1050 572 L1120 545 L1200 580 V900 H840 Z" fill="${M}" opacity="0.55"/>
    <rect y="560" width="${W}" height="120" fill="url(#fog)"/>
    <path d="${DOME}" fill="${K}"/><path d="${DRUM}" fill="${K}"/><path d="${BODY}" fill="${K}"/>
    <path d="M436 350 A164 166 0 0 1 764 350" fill="none" stroke="${L}" stroke-width="5" opacity="0.8"/>
    ${[...DRUMWINS, ...WINS].map((d) => `<path d="${d}" fill="${S}"/>`).join("")}
    ${WINS.map((d) => `<path d="${d}" fill="${S}" opacity="0.5" filter="url(#blur)"/>`).join("")}
    <path d="${DOOR}" fill="${L}" opacity="0.85"/>
    <rect y="700" width="${W}" height="140" fill="url(#fog)"/>
    ${cross(K, 12)}${title(K)}`);
}

// D. Paper: cut paper in layers, each lifting off the one behind on its shadow.
function paper() {
  const r = rng(9), stars = Array.from({ length: 30 }, () => `<circle cx="${(r() * W).toFixed(0)}" cy="${(30 + r() * 380).toFixed(0)}" r="${(2.5 + r() * 3).toFixed(1)}" fill="${L}"/>`).join("");
  const scallop = (y0, amp, n) => { let d = `M0 ${y0}`; const w = W / n; for (let i = 0; i < n; i++) d += ` q ${w / 2} ${-amp} ${w} 0`; return d + ` V${H} H0 Z`; };
  return svg(`<defs>
      <filter id="lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity="0.7"/></filter>
      <linearGradient id="skyD" x1="0" y1="0" x2="0" y2="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${D}"/><stop offset="1" stop-color="${M}"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#skyD)"/>${stars}
    <circle cx="900" cy="212" r="112" fill="${S}" filter="url(#lift)"/>
    <path d="${scallop(600, 70, 5)}" fill="${L}" opacity="0.55" filter="url(#lift)"/>
    <path d="${scallop(660, 60, 4)}" fill="${M}" filter="url(#lift)"/>
    <g filter="url(#lift)"><path d="${DOME}" fill="${D}"/><path d="${DRUM}" fill="${D}"/><path d="${BODY}" fill="${D}"/></g>
    ${[...DRUMWINS, DOOR, ...WINS].map((d) => `<path d="${d}" fill="${S}"/>`).join("")}
    <path d="${scallop(780, 50, 3)}" fill="${K}" filter="url(#lift)"/>
    ${cross(L, 12)}${title(K)}`);
}

async function render(markup, name, seed) {
  const { data, info } = await sharp(Buffer.from(markup)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const r = rng(seed);
  for (let i = 0; i < data.length; i += info.channels) {
    const g = Math.round((r() + r() + r() - 1.5) * 12);
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, data[i + c] + g));
  }
  const file = path.join(HERE, "directions", `${name}.png`);
  await sharp(data, { raw: info }).grayscale().png({ compressionLevel: 9 }).toFile(file);
  return file;
}

const files = [await render(carved(), "A-carved", 1), await render(print(), "B-print", 2), await render(mist(), "C-mist", 3), await render(paper(), "D-paper", 4)];
// All four as Hallow's grid shows them: two across, rounded, on the app's black, each with its letter.
const tw = 520, th = 390, gap = 24, pad = 24;
const tiles = await Promise.all(files.map(async (f, i) => {
  const mask = Buffer.from(`<svg width="${tw}" height="${th}"><rect width="${tw}" height="${th}" rx="28" fill="#fff"/></svg>`);
  const label = Buffer.from(`<svg width="${tw}" height="${th}"><circle cx="40" cy="40" r="24" fill="#000" opacity="0.6"/><text x="40" y="49" text-anchor="middle" font-family="Inter Display, Inter" font-weight="700" font-size="26" fill="#fff">${"ABCD"[i]}</text></svg>`);
  const img = await sharp(f).resize(tw, th).composite([{ input: mask, blend: "dest-in" }, { input: label }]).png().toBuffer();
  return { input: img, left: pad + (i % 2) * (tw + gap), top: pad + Math.floor(i / 2) * (th + gap) };
}));
await sharp({ create: { width: pad * 2 + tw * 2 + gap, height: pad * 2 + th * 2 + gap, channels: 3, background: "#0B0B0C" } }).composite(tiles).png().toFile(path.join(HERE, "directions", "all.png"));
console.log("written:", [...files, path.join(HERE, "directions", "all.png")].map((f) => path.relative(process.cwd(), f)).join(", "));
