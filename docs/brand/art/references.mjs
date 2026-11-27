#!/usr/bin/env node
// Purify's illustration style, "Silver Night": the two style references an image
// model is given with every prompt (his word, 2026-11-27: "send me the 2
// references to use"). Drawn in code to the exact palette, so the model learns
// the look from two kinds of subject: a night scene and an object indoors.
//
//   node docs/brand/art/references.mjs   writes ref/silver-night-1-church.png and ref/silver-night-2-candle.png
//
// The look: strict black and grayscale in five values; flat layered shapes; fine
// engraved hatching only in the shadows; one soft pool of light (never rays);
// a faint horizon glow and small dot stars outdoors (never sparkles); grain.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, "../../../package.json"));
const sharp = require("sharp");

export const GRAYS = ["#0B0B0C", "#26262A", "#4E4E54", "#8E8E95", "#D9D9DD"];
const [K, D, M, L, S] = GRAYS; // near-black, dark, mid, light, silver
const N = 1536;

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const defs = `
  <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
    <line x1="0" y1="0" x2="0" y2="9" stroke="${K}" stroke-width="2.4"/>
  </pattern>
  <pattern id="hatchFine" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
    <line x1="0" y1="0" x2="0" y2="12" stroke="${K}" stroke-width="1.6"/>
  </pattern>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="softer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter>`;

function church() {
  const r = rng(7);
  const stars = [];
  while (stars.length < 46) {
    const x = r() * N, y = 50 + r() * 760;
    if (Math.hypot(x - 860, y - 760) < 330) continue;
    stars.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + r() * 1.9).toFixed(2)}" fill="${r() < 0.25 ? S : L}" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`);
  }
  const ridge = "M0 1000 C 260 930, 520 965, 760 942 S 1200 902, 1536 962";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 ${N} ${N}">
  <defs>${defs}
    <radialGradient id="pool" cx="860" cy="800" r="660" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${S}" stop-opacity="0.30"/><stop offset="0.45" stop-color="${L}" stop-opacity="0.10"/><stop offset="1" stop-color="${L}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="path" x1="0" y1="1536" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${M}"/><stop offset="1" stop-color="${L}"/>
    </linearGradient>
  </defs>
  <rect width="${N}" height="${N}" fill="${K}"/>
  ${stars.join("")}
  <circle cx="860" cy="800" r="660" fill="url(#pool)"/>
  <path d="${ridge} L1536 1536 L0 1536 Z" fill="${D}"/>
  <path d="${ridge}" fill="none" stroke="${L}" stroke-width="14" opacity="0.32" filter="url(#soft)"/>
  <path d="${ridge}" fill="none" stroke="${L}" stroke-width="2.5" opacity="0.7"/>
  <path d="M300 1536 C 420 1200, 620 1012, 860 992 C 1080 976, 1300 1080, 1536 1180 L1536 1536 Z" fill="${M}"/>
  <path d="M960 990 C 1120 1000, 1320 1085, 1536 1180 L1536 1536 L1010 1536 C 1080 1300, 1040 1120, 960 990 Z" fill="url(#hatch)" opacity="0.6"/>
  <path d="M0 1240 C 300 1180, 520 1300, 760 1390 C 980 1470, 1200 1500, 1536 1460 L1536 1536 L0 1536 Z" fill="${D}"/>
  <path d="M0 1240 C 300 1180, 520 1300, 760 1390 C 980 1470, 1200 1500, 1536 1460 L1536 1536 L0 1536 Z" fill="url(#hatchFine)" opacity="0.55"/>
  <path d="M520 1536 C 600 1400, 700 1330, 760 1250 C 820 1170, 800 1080, 838 1002 L 862 1002 C 845 1090, 885 1180, 830 1262 C 770 1352, 690 1420, 652 1536 Z" fill="url(#path)"/>
  <path d="M600 1536 C 680 1420, 760 1350, 818 1268 C 860 1200, 850 1110, 862 1002 L 862 1002 C 845 1090, 885 1180, 830 1262 C 770 1352, 690 1420, 652 1536 Z" fill="url(#hatchFine)" opacity="0.35"/>
  <ellipse cx="850" cy="1006" rx="76" ry="13" fill="${S}" opacity="0.22"/>
  <!-- the church -->
  <rect x="760" y="842" width="180" height="158" fill="${L}"/>
  <path d="M940 842 L992 862 L992 1000 L940 1000 Z" fill="${M}"/>
  <path d="M940 842 L992 862 L992 1000 L940 1000 Z" fill="url(#hatch)" opacity="0.7"/>
  <path d="M752 846 L850 812 L948 846 Z" fill="${M}"/>
  <path d="M948 846 L850 812 L1000 864 Z" fill="${D}"/>
  <rect x="818" y="752" width="64" height="74" fill="${L}"/>
  <rect x="850" y="752" width="32" height="74" fill="url(#hatchFine)" opacity="0.6"/>
  <path d="M808 754 A42 46 0 0 1 892 754 Z" fill="${S}"/>
  <path d="M850 708 A42 46 0 0 1 892 754 L850 754 Z" fill="url(#hatchFine)" opacity="0.55"/>
  <g stroke="${S}" stroke-width="4" stroke-linecap="round">
    <line x1="850" y1="660" x2="850" y2="708"/><line x1="842" y1="671" x2="858" y2="671"/><line x1="836" y1="682" x2="864" y2="682"/><line x1="841" y1="697" x2="859" y2="691"/>
  </g>
  <circle cx="796" cy="905" r="44" fill="${S}" opacity="0.28" filter="url(#soft)"/>
  <circle cx="904" cy="905" r="44" fill="${S}" opacity="0.28" filter="url(#soft)"/>
  <path d="M784 935 L784 896 A12 12 0 0 1 808 896 L808 935 Z" fill="${S}"/>
  <path d="M892 935 L892 896 A12 12 0 0 1 916 896 L916 935 Z" fill="${S}"/>
  <path d="M828 1000 L828 958 A22 22 0 0 1 872 958 L872 1000 Z" fill="${K}"/>
  <!-- one figure on the path, seen from behind -->
  <circle cx="757" cy="1236" r="9.5" fill="${K}"/>
  <path d="M744 1250 C 749 1246, 765 1246, 770 1250 L 776 1308 C 765 1312, 749 1312, 738 1308 Z" fill="${K}"/>
</svg>`;
}

function candle() {
  const knots = [];
  const cx = 720, cy = 1250, rx = 330, ry = 108, tilt = (-8 * Math.PI) / 180;
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2;
    const x0 = rx * Math.cos(a), y0 = ry * Math.sin(a);
    const x = cx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt), y = cy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt);
    const far = Math.sin(a) < 0;
    knots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${far ? 11.5 : 13.5}" fill="${far ? D : M}"/>` +
      `<circle cx="${(x - 3.5).toFixed(1)}" cy="${(y - 4).toFixed(1)}" r="${far ? 3 : 4}" fill="${L}" opacity="${far ? 0.5 : 0.85}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 ${N} ${N}">
  <defs>${defs}
    <radialGradient id="pool" cx="768" cy="560" r="760" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${S}" stop-opacity="0.34"/><stop offset="0.4" stop-color="${L}" stop-opacity="0.12"/><stop offset="1" stop-color="${L}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="table" x1="0" y1="1000" x2="0" y2="1536" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${M}"/><stop offset="1" stop-color="${D}"/>
    </linearGradient>
  </defs>
  <rect width="${N}" height="${N}" fill="${K}"/>
  <rect y="1000" width="${N}" height="536" fill="url(#table)"/>
  <rect x="1060" y="1000" width="476" height="536" fill="url(#hatchFine)" opacity="0.5"/>
  <rect y="1300" width="${N}" height="236" fill="url(#hatchFine)" opacity="0.45"/>
  <rect y="996" width="${N}" height="5" fill="${L}" opacity="0.45"/>
  <circle cx="768" cy="560" r="760" fill="url(#pool)"/>
  <!-- the candle, its dish and its flame -->
  <ellipse cx="800" cy="1030" rx="150" ry="26" fill="url(#hatch)" opacity="0.6"/>
  <ellipse cx="768" cy="1012" rx="112" ry="25" fill="${M}"/>
  <ellipse cx="768" cy="1006" rx="112" ry="20" fill="${L}"/>
  <ellipse cx="768" cy="1004" rx="96" ry="15" fill="${M}"/>
  <path d="M744 1004 L748 606 L788 606 L792 1004 Z" fill="${S}"/>
  <path d="M768 606 L788 606 L792 1004 L768 1004 Z" fill="${L}"/>
  <path d="M776 606 L788 606 L792 1004 L780 1004 Z" fill="url(#hatchFine)" opacity="0.6"/>
  <line x1="768" y1="606" x2="768" y2="586" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="768" cy="540" r="90" fill="${S}" opacity="0.30" filter="url(#softer)"/>
  <path d="M768 462 C 801 524, 797 572, 768 590 C 739 572, 735 524, 768 462 Z" fill="${S}"/>
  <path d="M768 520 C 781 548, 779 572, 768 582 C 757 572, 755 548, 768 520 Z" fill="${L}"/>
  <!-- the prayer rope on the table, its cross and tassel -->
  <ellipse cx="740" cy="1268" rx="340" ry="110" transform="rotate(-8 740 1268)" fill="url(#hatch)" opacity="0.35"/>
  ${knots.join("")}
  <g fill="${M}"><circle cx="1036" cy="1238" r="12"/><circle cx="1058" cy="1262" r="12"/><circle cx="1078" cy="1288" r="12"/></g>
  <g stroke="${L}" stroke-width="9" stroke-linecap="round"><line x1="1098" y1="1300" x2="1128" y2="1358"/><line x1="1096" y1="1336" x2="1134" y2="1318"/></g>
  <g stroke="${M}" stroke-width="3" stroke-linecap="round">
    ${Array.from({ length: 9 }, (_, i) => `<line x1="1130" y1="1360" x2="${1122 + i * 5}" y2="${1428 + (i % 3) * 6}"/>`).join("")}
  </g>
</svg>`;
}

async function render(svg, file, seed) {
  const { data, info } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const r = rng(seed);
  for (let i = 0; i < data.length; i += info.channels) {
    const g = Math.round((r() + r() + r() - 1.5) * 14);
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, data[i + c] + g));
  }
  await sharp(data, { raw: info }).grayscale().png({ compressionLevel: 9 }).toFile(file);
  console.log(`${path.relative(process.cwd(), file)} ${info.width}x${info.height} ${fs.statSync(file).size} bytes`);
}

await render(church(), path.join(HERE, "ref/silver-night-1-church.png"), 11);
await render(candle(), path.join(HERE, "ref/silver-night-2-candle.png"), 23);
