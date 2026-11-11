// The pictures of the looks (1.9): public/themes/.
//
// A look is one calm page and one sign (docs/1.9-build/notes/themes-fable.md,
// "The third set"). Its sign is a picture, and every one of them is made
// here, so it can be made again:
//
//   node scripts/theme-pictures.mjs            the drawings, as SVG
//   node scripts/theme-pictures.mjs --painted  those, and the eight painted by
//                                              the app's own quote-picture code
//   node scripts/theme-pictures.mjs --kept     the room of a look the app no
//                                              longer has (Fire), into the
//                                              folder it is kept in
//
// The drawings need nothing but Node. Each is a few kilobytes: 390 wide, the
// width of a phone, laid at the foot of the screen at the page's width. No
// photograph, no grain, nothing that moves.
//
// The painted ones (Dawn, Blush and the three plants) need the native
// export in out/ (npm run build:android), because they are painted by
// lib/share/drawVerseCard.ts and lib/share/verseCard.ts themselves, turned
// to plain JavaScript and run in a page of the export on a canvas the shape
// of a phone. The plates are the public-domain ones of public/share/flowers
// (docs/licensing/SHARE_FLOWERS.md); what is made from them is recorded in
// docs/licensing/THEME_PICTURES.md. What this file adds is only where on a
// phone each picture stands.
//
// Fire was the ninth painted one. The owner took the look out of the app on
// 2026-11-10 ("remove fire") and nothing made is deleted, so its painter is
// still here and --kept runs it: the picture goes to
// docs/1.9-build/kept/fire-look/, never to public/themes, which the apps
// carry (lib/reader/__tests__/themePictures.test.ts holds that folder to the
// looks the app has).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "themes");
/** Where a look the app no longer has keeps its picture, by the look's id. */
const KEPT = { fire: path.join(ROOT, "docs", "1.9-build", "kept", "fire-look") };

// ── The drawings ────────────────────────────────────────────────────────

const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const n1 = (v) => Math.round(v * 10) / 10;
const svg = (w, h, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
const vgrad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;

/** The Holy Mountain: Athos's peak over the sea at dusk, the water still. */
function athos() {
  const H = 300;
  const defs =
    vgrad("sky", [[0, "#93a8de", 0], [0.55, "#93a8de", 0.05], [1, "#a9b6e2", 0.26]]) +
    vgrad("sea", [[0, "#1d2946"], [0.5, "#111a2e"], [1, "#0e1420"]]) +
    vgrad("mist", [[0, "#c9d6f5", 0], [0.7, "#c9d6f5", 0.13], [1, "#c9d6f5", 0.04]]);
  const body =
    `<rect width="390" height="189" fill="url(#sky)"/>` +
    // The long shoulder of the peninsula, then the peak.
    `<path d="M-10,189 L-10,173.7 C30,167.2 70,165.9 112,169.8 C150,173.7 178,169.8 205,154.2 C232,137.3 248,102.2 262,84 C268,77.5 273,78.8 278,86.6 C292,110 306,138.6 330,156.8 C352,172.4 376,177.6 400,180.2 L400,189 Z" fill="#2c3a5e"/>` +
    `<path d="M262,84 C268,77.5 273,78.8 278,86.6 C286,102.2 292,117.8 302,133.4 C290,123 280,112.6 270,107.4 C262,112.6 250,128.2 238,138.6 C248,120.4 254,99.6 262,84 Z" fill="#3a4a74" opacity="0.3"/>` +
    `<rect y="150" width="390" height="39" fill="url(#mist)"/>` +
    `<rect y="188" width="390" height="112" fill="url(#sea)"/>` +
    `<path d="M0,188.5 H390" stroke="#b9c8f0" stroke-opacity="0.3" stroke-width="1"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

function fir(x, base, h, w, r) {
  const n = Math.max(4, Math.round(h / 13));
  const left = [];
  const right = [];
  for (let i = 1; i <= n; i++) {
    const y = base - h + (h * i) / n;
    const hw = w * Math.pow(i / n, 0.9) * (0.88 + r() * 0.24);
    left.push([x - hw, y], [x - hw * 0.46, y - 1.2]);
    right.push([x + hw, y], [x + hw * 0.46, y - 1.2]);
  }
  let d = `M${n1(x)},${n1(base - h)}`;
  for (let i = 0; i < left.length - 1; i++) d += `L${n1(left[i][0])},${n1(left[i][1])}`;
  d += `L${n1(x - w * 0.12)},${n1(base)}L${n1(x - w * 0.12)},${n1(base + 40)}L${n1(x + w * 0.12)},${n1(base + 40)}L${n1(x + w * 0.12)},${n1(base)}`;
  for (let i = right.length - 2; i >= 0; i--) d += `L${n1(right[i][0])},${n1(right[i][1])}`;
  return d + "Z";
}

/** The forest of the north: two lines of firs, mist between them, the last light behind. */
function forest() {
  const H = 300;
  const r = rng(41);
  const defs =
    vgrad("sky", [[0, "#8fd0b0", 0], [0.5, "#8fd0b0", 0.04], [1, "#a6dcc0", 0.2]]) +
    vgrad("mist", [[0, "#cfeadd", 0], [0.6, "#cfeadd", 0.1], [1, "#cfeadd", 0]]) +
    vgrad("floor", [[0, "#0a1510"], [1, "#070f0b"]]);
  let far = "";
  for (let x = -6; x < 400; x += 15 + r() * 13) far += fir(x, 176 + r() * 6, 34 + r() * 46, 8 + r() * 5, r);
  let near = "";
  for (let x = -14; x < 410; x += 30 + r() * 30) near += fir(x, 232 + r() * 8, 78 + r() * 74, 15 + r() * 8, r);
  const body =
    `<rect width="390" height="182" fill="url(#sky)"/>` +
    `<path d="${far}" fill="#1b3528"/>` +
    `<rect y="176" width="390" height="124" fill="#1b3528"/>` +
    `<rect y="140" width="390" height="70" fill="url(#mist)"/>` +
    `<path d="${near}" fill="#08120d"/>` +
    `<rect y="236" width="390" height="64" fill="url(#floor)"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The desert: three dunes, one behind another, each a step deeper, in the last light. */
function desert() {
  const H = 270;
  const defs =
    vgrad("sky", [[0, "#d9977a", 0], [1, "#d9977a", 0.18]]) +
    vgrad("d1", [[0, "#ecd6c9"], [1, "#e6cab9"]]) +
    vgrad("d2", [[0, "#e3c4b1"], [1, "#dab49e"]]) +
    vgrad("d3", [[0, "#d7ad96"], [1, "#cb9a80"]]);
  const body =
    `<rect width="390" height="120" fill="url(#sky)"/>` +
    `<path d="M-10,118 C40,96 96,74 150,70 C196,68 226,86 262,100 C304,116 352,118 400,102 L400,270 L-10,270 Z" fill="url(#d1)"/>` +
    `<path d="M-10,164 C30,160 70,142 112,126 C140,116 160,116 184,126 C240,150 318,170 400,162 L400,270 L-10,270 Z" fill="url(#d2)"/>` +
    `<path d="M-10,214 C60,210 150,194 230,172 C268,162 296,158 322,162 C352,167 378,178 400,190 L400,270 L-10,270 Z" fill="url(#d3)"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The Jordan: the water, and the rings that go out over it from one place. */
function jordan() {
  const H = 280;
  const defs = vgrad("water", [[0, "#9fc9c7", 0], [0.5, "#9fc9c7", 0.2], [1, "#8fbfbe", 0.42]]);
  const rings = [
    [30, 0.95],
    [72, 0.8],
    [124, 0.62],
    [186, 0.46],
    [258, 0.32],
    [340, 0.2],
  ];
  const body =
    `<rect width="390" height="${H}" fill="url(#water)"/>` +
    rings.map(([rx, a]) => `<ellipse cx="195" cy="178" rx="${rx}" ry="${n1(rx * 0.3)}" fill="none" stroke="#3f8f95" stroke-opacity="${a}" stroke-width="1.1"/>`).join("") +
    `<ellipse cx="195" cy="178" rx="5" ry="1.6" fill="#3f8f95" opacity="0.55"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The Sea of Galilee by night: the far hills, the water's edge, and the light lying on the water. */
function galilee() {
  const H = 300;
  const defs =
    vgrad("sky", [[0, "#7fd0d6", 0], [0.6, "#7fd0d6", 0.05], [1, "#9fe0e2", 0.24]]) +
    vgrad("water", [[0, "#103740"], [0.5, "#0a252c"], [1, "#06181d"]]) +
    `<filter id="soft" filterUnits="userSpaceOnUse" x="0" y="140" width="390" height="120"><feGaussianBlur stdDeviation="9"/></filter>`;
  const body =
    `<rect width="390" height="168" fill="url(#sky)"/>` +
    `<path d="M-10,168 L-10,141 C30,129 76,123 120,133 C160,142 190,139 230,125 C280,109 340,113 400,129 L400,168 Z" fill="#0d2f37"/>` +
    `<rect y="167" width="390" height="133" fill="url(#water)"/>` +
    `<ellipse cx="150" cy="188" rx="118" ry="13" fill="#bff3f2" opacity="0.2" filter="url(#soft)"/>` +
    `<path d="M0,167.5 H390" stroke="#a9eef0" stroke-opacity="0.34" stroke-width="1"/>` +
    // Three long glints on the water, each quieter than the last.
    `<path d="M92,176 H212" stroke="#dffbfa" stroke-opacity="0.4" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M178,186 H306" stroke="#dffbfa" stroke-opacity="0.26" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M54,195 H150" stroke="#dffbfa" stroke-opacity="0.17" stroke-width="1" stroke-linecap="round"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** Patmos: the white wall, and the sea beyond it. Two fields of colour and the line between them. */
function patmos() {
  const H = 220;
  const defs = vgrad("haze", [[0, "#7fa6ea", 0], [1, "#7fa6ea", 0.2]]) + vgrad("sea", [[0, "#2f63c8"], [0.4, "#2453b2"], [1, "#1b4296"]]);
  const body =
    `<rect width="390" height="88" fill="url(#haze)"/>` +
    `<rect y="88" width="390" height="132" fill="url(#sea)"/>` +
    `<path d="M0,88.5 H390" stroke="#a9c6f7" stroke-opacity="0.9" stroke-width="1"/>` +
    // Three long glints, each quieter than the last.
    `<path d="M214,101 H318" stroke="#ffffff" stroke-opacity="0.34" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M40,113 H126" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M252,124 H352" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1" stroke-linecap="round"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** The mosaic: a band of tesserae along the foot of the wall, hand-set, with a pale row to close it. */
function mosaic() {
  const H = 150;
  const r = rng(7);
  const cell = 13;
  const cols = 30;
  const rows = 11;
  const deep = ["#15306b", "#1a3a7e", "#122a5c", "#1e4491", "#173672", "#1b4a86", "#12335f", "#183f7a"];
  const bright = ["#2d63b4", "#3a7fb8", "#5f93d6", "#9fbde9"];
  const edge = ["#9fbde9", "#d7e3f6", "#5f93d6", "#c3d5f1"];
  let tiles = "";
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const top = row === rows - 1;
      const color = top ? edge[Math.floor(r() * edge.length)] : row === rows - 2 ? deep[Math.floor(r() * 3)] : r() < 0.1 ? bright[Math.min(bright.length - 1, Math.floor(Math.pow(r(), 1.8) * bright.length))] : deep[Math.floor(r() * deep.length)];
      const x = c * cell + 0.9;
      const y = H - (row + 1) * cell + 0.9;
      const s = cell - 1.8;
      const j = () => (r() - 0.5) * 1.7;
      const pts = [
        [x + j(), y + j()],
        [x + s + j(), y + j()],
        [x + s + j(), y + s + j()],
        [x + j(), y + s + j()],
      ];
      tiles += `<path d="M${pts.map((q) => `${n1(q[0])},${n1(q[1])}`).join("L")}Z" fill="${color}"/>`;
    }
  }
  return { svg: svg(390, H, tiles), height: H };
}

/** A row of tesserae for the rule at a page's head. */
function mosaicRule() {
  const colors = ["#2d63b4", "#1e4491", "#5f93d6", "#1a3a7e", "#d7e3f6", "#1b4a86", "#3a7fb8", "#15306b", "#9fbde9", "#1e4491", "#2d63b4"];
  const tiles = colors.map((c, i) => `<rect x="${n1(i * 10.2 + 0.6)}" y="0.6" width="8.6" height="8.6" rx="1.1" fill="${c}" transform="rotate(${[-3, 2, -1, 3, 0, -2, 2, -3, 1, 2, -2][i]} ${n1(i * 10.2 + 4.9)} 4.9)"/>`).join("");
  return { svg: svg(112, 10, tiles), width: 112, height: 10 };
}

/** Stone: the foot of a monastery wall, its blocks of two heights, each a breath lighter or darker than the next. */
function stone() {
  const H = 200;
  const r = rng(23);
  const courses = [40, 27, 36, 25, 32, 24];
  let out = "";
  let y = H;
  courses.forEach((h, i) => {
    y -= h;
    const a = Math.max(0, 1 - i / 5.4);
    let x = -((i * 43) % 67) - 24;
    while (x < 390) {
      const w = (h > 30 ? 74 : 54) + r() * 52;
      const tone = r();
      out += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${h}" fill="${tone < 0.55 ? "#4f483b" : "#ffffff"}" opacity="${n1((tone < 0.55 ? 0.03 + r() * 0.08 : 0.12 + r() * 0.2) * a)}"/>`;
      x += w;
      if (x > 0 && x < 390) out += `<path d="M${n1(x + 0.5)},${n1(y + 1)} V${n1(y + h)}" stroke="#7d7669" stroke-opacity="${n1(0.6 * a)}" stroke-width="1"/>`;
    }
    out += `<path d="M0,${n1(y + 0.5)} H390" stroke="#7d7669" stroke-opacity="${n1(0.66 * a)}" stroke-width="1"/>`;
  });
  return { svg: svg(390, H, out), height: H };
}

/** Damask: a woven ground of rings and small flowers, the cloth's own colour a step lighter. */
function damask() {
  const H = 300;
  const defs =
    `<pattern id="p" width="46" height="46" patternUnits="userSpaceOnUse">` +
    `<g fill="none" stroke="#6a2740" stroke-width="1.1">` +
    `<circle cx="23" cy="23" r="17.5"/><circle cx="23" cy="23" r="12"/>` +
    `<path d="M23,15 C26,19 26,27 23,31 C20,27 20,19 23,15 Z M15,23 C19,20 27,20 31,23 C27,26 19,26 15,23 Z"/>` +
    `<path d="M0,-4.6 L4.6,0 L0,4.6 L-4.6,0 Z M46,-4.6 L50.6,0 L46,4.6 L41.4,0 Z M0,41.4 L4.6,46 L0,50.6 L-4.6,46 Z M46,41.4 L50.6,46 L46,50.6 L41.4,46 Z"/>` +
    `</g><circle cx="23" cy="23" r="1.7" fill="#6a2740"/></pattern>` +
    vgrad("fade", [[0, "#ffffff", 0], [0.42, "#ffffff", 0.3], [1, "#ffffff", 1]]) +
    `<mask id="m"><rect width="390" height="${H}" fill="url(#fade)"/></mask>`;
  const body = `<rect width="390" height="${H}" fill="url(#p)" mask="url(#m)" transform="translate(-3 -1)"/>`;
  return { svg: svg(390, H, body, defs), height: H };
}

/** Incense: the smoke of the censer at the foot of the page, slow curves seen only as their softness. */
function incense() {
  const H = 350;
  const blur = (id, d) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="-40" width="390" height="${H + 80}"><feGaussianBlur stdDeviation="${d}"/></filter>`;
  const defs =
    blur("b1", 11) +
    blur("b2", 5) +
    blur("b3", 1.8) +
    // The plume is a wisp where words are read and comes into its strength
    // only at the foot, where the page's last lines are giving way to it:
    // above that it may add no more light than the look's faintest text can
    // stand on (scripts/scene-check.mjs). At its first strength it stood at
    // seven tenths behind the words, and a caption that crossed it was 2.8:1.
    vgrad("fade", [[0, "#ffffff", 0], [0.2, "#ffffff", 0.2], [0.52, "#ffffff", 0.27], [0.66, "#ffffff", 0.9], [0.8, "#ffffff", 1], [1, "#ffffff", 0.6]]) +
    `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="390" height="${H}"><rect width="390" height="${H}" fill="url(#fade)"/></mask>`;
  const body =
    `<g mask="url(#m)" fill="none" stroke-linecap="round">` +
    `<path d="M300,318 C278,270 326,238 304,196 C284,158 238,148 252,102 C260,76 288,60 282,22" stroke="#b9aede" stroke-opacity="0.3" stroke-width="34" filter="url(#b1)"/>` +
    `<path d="M302,320 C284,274 320,242 302,200 C286,164 246,150 258,106 C266,82 286,64 282,28" stroke="#cdc4ea" stroke-opacity="0.34" stroke-width="12" filter="url(#b2)"/>` +
    `<path d="M304,322 C290,278 314,246 300,204 C288,170 254,152 264,110 C270,88 284,68 282,34" stroke="#e6e0f6" stroke-opacity="0.34" stroke-width="2.6" filter="url(#b3)"/>` +
    `<path d="M298,318 C262,286 306,236 274,200 C254,178 262,150 276,128" stroke="#cdc4ea" stroke-opacity="0.2" stroke-width="8" filter="url(#b2)"/>` +
    `</g>`;
  return { svg: svg(390, H, body, defs), height: H };
}

const X = (x, y, s, color, w) => `<path d="M${n1(x)},${n1(y)} l${s},${s} M${n1(x + s)},${n1(y)} l${-s},${s}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

/** Linen's rule under a page's bar: one row of cross stitches, a pattern that repeats along the line. */
function stitchLine(color = "#b21f2d") {
  const cell = 8;
  const body = X(2.3, 1.8, 3.4, color, 1.15);
  return { svg: svg(cell, 7, body), width: cell, height: 7 };
}

/** Linen's ornament at a chapter's head: a stitched diamond with a star in it, and a short row of stitches each side. */
function stitchHead(color = "#b21f2d", dark = "#2a2320") {
  const cell = 4;
  const N = 13;
  const W = 168;
  const Hh = N * cell;
  const x0 = (W - N * cell) / 2;
  let out = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.abs(x - 6) + Math.abs(y - 6);
      const star = (x === 6 && Math.abs(y - 6) <= 2) || (y === 6 && Math.abs(x - 6) <= 2) || (Math.abs(x - 6) === 1 && Math.abs(y - 6) === 1);
      if (d === 6 || star) out += X(x0 + x * cell + 0.8, y * cell + 0.8, cell - 1.6, d === 6 ? color : dark, 1.15);
      else if (d === 4 && (x + y) % 2 === 0) out += X(x0 + x * cell + 0.8, y * cell + 0.8, cell - 1.6, color, 1.15);
    }
  }
  const mid = 6 * cell;
  for (let i = 0; i < 6; i++) {
    out += X(x0 - 12 - i * 8 + 0.8, mid + 0.8, cell - 1.6, i % 2 ? dark : color, 1.15);
    out += X(x0 + N * cell + 8 + i * 8 + 0.8, mid + 0.8, cell - 1.6, i % 2 ? dark : color, 1.15);
  }
  return { svg: svg(W, Hh, out), width: W, height: Hh };
}


/**
 * Night sky's small stars, by the arithmetic of the Nativity card's night
 * (lib/reading/nativityStar.ts, NIGHT_STARS), carried over a whole screen:
 * each star's place, size and brightness from its number alone, so the sky is
 * the same every time. Thicker toward the top, thinning toward the foot.
 */
function stars() {
  const W = 400;
  const H = 900;
  const out = [];
  for (let i = 0; i < 110; i++) {
    const x = ((i * 71 + (i % 7) * 13) % (W - 12)) + 6;
    // Squared, so most stand in the upper sky.
    const t = ((i * 37 + (i % 5) * 29) % 100) / 100;
    const y = 8 + t * t * (H - 120) * 0.92 + (i % 3) * 7;
    const r = i % 11 === 0 ? 1.2 : i % 4 === 0 ? 0.9 : 0.65;
    const o = (0.2 + (i % 5) * 0.085) * (1 - 0.45 * (y / H));
    out.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${r}" fill="#fff" opacity="${o.toFixed(2)}"/>`);
  }
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice">${out.join("")}</svg>` };
}

/**
 * Night sky's star over the horizon, as components/today/NativityStarCard.tsx
 * draws it: the star of Bethlehem's eight points (the Octogram's two squares,
 * components/ui/icons/Octogram.tsx), the same halo and the same lit edge,
 * laid along the short rule at the head of a chapter.
 *
 * Never the four-point sparkle (CLAUDE.md, "No sparkle star"). It stood here
 * as two of them, one turned over the other, until build 93 note 7; the
 * card's own star was redrawn the same day. The light round it is a soft
 * pool, not rays.
 */
function horizon() {
  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64"><defs>` +
      `<linearGradient id="e" x1="0" x2="300" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0.10"/><stop offset="0.72" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0.18"/></linearGradient>` +
      `<radialGradient id="h"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.15"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="d"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="210" cy="50" rx="86" ry="13" fill="url(#d)"/>` +
      `<path d="M0 54 Q 150 38 300 54" fill="none" stroke="url(#e)" stroke-width="1.1"/>` +
      `<circle cx="216" cy="24" r="24" fill="url(#h)"/>` +
      `<g transform="translate(207 15) scale(0.75)"><rect x="5.6" y="5.6" width="12.8" height="12.8" fill="#fff"/>` +
      `<polygon points="12,2.5 21.5,12 12,21.5 2.5,12" fill="#fff"/></g></svg>`,
  };
}

/** Every drawing, by the name of its file. */
export const DRAWINGS = {
  "athos.svg": athos,
  "forest.svg": forest,
  "desert.svg": desert,
  "jordan.svg": jordan,
  "galilee.svg": galilee,
  "patmos.svg": patmos,
  "mosaic.svg": mosaic,
  "mosaic-rule.svg": mosaicRule,
  "stone.svg": stone,
  "damask.svg": damask,
  "incense.svg": incense,
  "linen-rule.svg": stitchLine,
  "linen-head.svg": stitchHead,
  "nightsky-stars.svg": stars,
  "nightsky-horizon.svg": horizon,
};

function writeDrawings() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [file, draw] of Object.entries(DRAWINGS)) {
    const { svg: text } = draw();
    fs.writeFileSync(path.join(OUT, file), text + "\n");
    console.log(`  ${file} ${(text.length / 1024).toFixed(1)} KB`);
  }
}

// ── The painted ones ────────────────────────────────────────────────────

/** The painted pictures of the looks the app has; with `kept`, only those of a look it no longer has. */
async function writePainted({ kept = false } = {}) {
  const ts = (await import("typescript")).default;
  const { openPhone } = await import("./mock-check.mjs");
  const { go } = await import("./lib/shell-server.mjs");
  // The app's two modules as the browser can load them: types off, nothing else changed.
  const plain = (file) =>
    ts
      .transpileModule(fs.readFileSync(path.join(ROOT, "lib", "share", file), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
      .outputText.replace(/from "\.\/verseCard"/g, 'from "./verseCard.js"');
  const modules = { "verseCard.js": plain("verseCard.ts"), "drawVerseCard.js": plain("drawVerseCard.ts") };

  const { browser, ctx, page } = await openPhone({ scale: 1, set: { "purify.motion": "off" } });
  await ctx.route("**/__paint/*.js", (route) => {
    const name = path.basename(new URL(route.request().url()).pathname);
    route.fulfill({ contentType: "text/javascript", body: modules[name] ?? "" });
  });
  page.on("pageerror", (e) => console.log("page error:", String(e).slice(0, 200)));
  await go(page, "/");
  await page.waitForTimeout(2500);

  const made = await page.evaluate(async (keptOnly) => {
  const draw = await import("/__paint/drawVerseCard.js");
  const verse = await import("/__paint/verseCard.js");
  const W = 1080;
  const H = Math.round((W * innerHeight) / innerWidth);
  const mk = (w, h) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return { canvas, ctx: canvas.getContext("2d", { willReadFrequently: true }) };
  };
  const load = (src) =>
    new Promise((done, fail) => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => fail(new Error(`could not load ${src}`));
      img.src = src;
    });
  // The picture's grain, as drawVerseCard.ts lays it: noise 240 square, by a soft light.
  let noise = null;
  const grain = (c, w, h, amount) => {
    if (!amount) return;
    if (!noise) {
      const layer = mk(240, 240);
      const data = layer.ctx.createImageData(240, 240);
      let s = 11;
      for (let i = 0; i < data.data.length; i += 4) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        const v = s >>> 24;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
        data.data[i + 3] = 255;
      }
      layer.ctx.putImageData(data, 0, 0);
      noise = layer.canvas;
    }
    c.save();
    c.globalAlpha = amount;
    c.globalCompositeOperation = "soft-light";
    c.fillStyle = c.createPattern(noise, "repeat");
    c.fillRect(0, 0, w, h);
    c.restore();
  };
  const plates = {};
  for (const [name, p] of Object.entries(verse.FLOWER_PLATES)) plates[name] = await load(p.src);
  const hex = (d) => "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
  const at = (c, x, y) => hex(c.getImageData(Math.round(x), Math.round(y), 1, 1).data);
  // The tab bar's own height on this screen, in the picture's pixels: a look's flowers are planted on it, not under it.
  const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
  const lift = Math.round((((bar ? innerHeight - bar.top : 83) + 0) * W) / innerWidth);

  const out = {};
  const keep = (id, name, canvas, quality = 0.86) => ((out[id] ??= {})[name] = canvas.toDataURL("image/webp", quality));

  // Fire (kept, not shipped): the look's own ground, standing in the lower seven tenths of the screen, the dark of its own top above it.
  if (keptOnly) {
    const look = verse.quoteLookOf("fire");
    const Hf = Math.round(H * 0.7);
    const f = mk(W, Hf);
    draw.paintQuoteGround(f.ctx, look, W, Hf, "portrait", 1);
    const room = mk(W, H);
    room.ctx.fillStyle = at(f.ctx, W / 2, 2);
    room.ctx.fillRect(0, 0, W, H);
    // The embers go quiet as they rise: the fire's own picture comes in from nothing over its upper half.
    f.ctx.globalCompositeOperation = "destination-in";
    const fm = f.ctx.createLinearGradient(0, 0, 0, Hf);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      fm.addColorStop(0.12 + t * 0.5, `rgba(0, 0, 0, ${(t * t * (3 - 2 * t)).toFixed(3)})`);
    }
    fm.addColorStop(0, "rgba(0, 0, 0, 0)");
    fm.addColorStop(1, "rgba(0, 0, 0, 1)");
    f.ctx.fillStyle = fm;
    f.ctx.fillRect(0, 0, W, Hf);
    f.ctx.globalCompositeOperation = "source-over";
    room.ctx.drawImage(f.canvas, 0, H - Hf);
    grain(room.ctx, W, H, look.grain);
    keep("fire", "room", room.canvas);
    return { W, H, lift, out };
  }

  // Dawn: the night above, and the look's own sky before sunrise coming up under it.
  {
    const look = verse.quoteLookOf("dawn");
    const room = mk(W, H);
    const g = room.ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#070919");
    g.addColorStop(0.5, "#0b0e26");
    g.addColorStop(1, "#11143a");
    room.ctx.fillStyle = g;
    room.ctx.fillRect(0, 0, W, H);
    // The sunrise keeps to the foot of the screen, a little over a quarter of
    // it: at 0.32 its light reached the lines still being read, and the look's
    // faintest text was 3:1 on it a finger above the foot (scripts/scene-check.mjs).
    const Hd = Math.round(H * 0.27);
    const d = mk(W, Hd);
    draw.paintQuoteGround(d.ctx, look, W, Hd, "portrait", 1);
    d.ctx.globalCompositeOperation = "destination-in";
    const m = d.ctx.createLinearGradient(0, 0, 0, Hd);
    // The sunrise comes in by an eased share, so the night gives way with no line.
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      m.addColorStop(t * 0.7, `rgba(0, 0, 0, ${(t * t * (3 - 2 * t)).toFixed(3)})`);
    }
    m.addColorStop(1, "rgba(0, 0, 0, 1)");
    d.ctx.fillStyle = m;
    d.ctx.fillRect(0, 0, W, Hd);
    room.ctx.drawImage(d.canvas, 0, H - Hd);
    grain(room.ctx, W, H, look.grain);
    keep("dawn", "room", room.canvas);
  }

  // The papers: Blush alone, and Roses, Lavender and Olive with their flowers growing from the tab bar's corners.
  for (const id of ["blush", "rose", "lavender", "olive"]) {
    const look = verse.quoteLookOf(id);
    const room = mk(W, H);
    draw.paintQuoteGround(room.ctx, look, W, H, "portrait", 1);
    const floor = H - lift;
    const k = 0.62;
    for (const f of verse.flowerBeds(look, W, floor, "both").flowers) {
      const cx = f.cx < W / 2 ? f.cx * k : W - (W - f.cx) * k;
      const cy = floor - (floor - f.cy) * k;
      room.ctx.save();
      room.ctx.globalCompositeOperation = "multiply";
      room.ctx.translate(cx, cy);
      room.ctx.rotate(f.rotate);
      room.ctx.drawImage(plates[f.plate], (-f.width * k) / 2, (-f.height * k) / 2, f.width * k, f.height * k);
      room.ctx.restore();
    }
    grain(room.ctx, W, H, look.grain);
    keep(id, "room", room.canvas);
  }

  // A plate with its white paper taken out, so it stands on any light page with no blend.
  const cut = (img) => {
    const c = mk(img.naturalWidth, img.naturalHeight);
    c.ctx.drawImage(img, 0, 0);
    const d = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const [r, g, b] = [d.data[i], d.data[i + 1], d.data[i + 2]];
      const a = 255 - Math.min(r, g, b);
      if (a === 0) {
        d.data[i + 3] = 0;
        continue;
      }
      d.data[i] = Math.max(0, Math.round(((r - (255 - a)) * 255) / a));
      d.data[i + 1] = Math.max(0, Math.round(((g - (255 - a)) * 255) / a));
      d.data[i + 2] = Math.max(0, Math.round(((b - (255 - a)) * 255) / a));
      d.data[i + 3] = a;
    }
    c.ctx.putImageData(d, 0, 0);
    return c.canvas;
  };
  const clear = {};
  for (const [name, img] of Object.entries(plates)) clear[name] = cut(img);

  // The flowers at the head of a chapter, in the place of the short rule: 348 by 132, three times over.
  const head = (id, place) => {
    const S = 3, w = 348, h = 132;
    const c = mk(w * S, h * S);
    c.ctx.scale(S, S);
    for (const p of place) {
      const img = clear[p.plate];
      const part = p.keep ?? 1;
      const ph = p.height;
      const pw = (ph * img.width) / (img.height * part);
      c.ctx.save();
      c.ctx.translate(p.x, p.y);
      c.ctx.rotate(p.rotate ?? 0);
      if (p.flip) c.ctx.scale(-1, 1);
      c.ctx.drawImage(img, 0, 0, img.width, img.height * part, -pw / 2, -ph / 2, pw, ph);
      c.ctx.restore();
    }
    // A plate cut at its foot goes soft there, so the cut is never a line.
    if (place.some((p) => p.keep)) {
      c.ctx.globalCompositeOperation = "destination-in";
      const g = c.ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(0, 0, 0, 1)");
      g.addColorStop(0.78, "rgba(0, 0, 0, 1)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      c.ctx.fillStyle = g;
      c.ctx.fillRect(0, 0, w, h);
      c.ctx.globalCompositeOperation = "source-over";
    }
    keep(id, "head", c.canvas, 0.84);
  };
  head("rose", [
    { plate: "rose-centifolia", x: 128, y: 70, height: 128, rotate: -0.16 },
    { plate: "rose-regalis", x: 222, y: 68, height: 132, rotate: 0.14 },
  ]);
  head("lavender", [{ plate: "lavender", x: 174, y: 66, height: 128, keep: 0.8 }]);
  head("olive", [{ plate: "olive", x: 174, y: 66, height: 190, rotate: -1.12 }]);

  return { W, H, lift, out };
}, kept);


  for (const [id, set] of Object.entries(made.out)) {
    // A kept look's picture goes to its own folder; nothing of it is written where the apps would carry it.
    if (kept !== Boolean(KEPT[id])) throw new Error(`${id}: ${kept ? "not a kept look" : "a kept look, painted without --kept"}`);
    for (const [name, value] of Object.entries(set)) {
      const file = path.join(KEPT[id] ?? OUT, `${id}-${name}.webp`);
      fs.writeFileSync(file, Buffer.from(value.split(",")[1], "base64"));
      console.log(`  ${path.basename(file)} ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
    }
  }
  await browser.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("the drawings:");
  writeDrawings();
  if (process.argv.includes("--painted")) {
    console.log("the painted ones:");
    await writePainted();
  }
  if (process.argv.includes("--kept")) {
    console.log("kept, not shipped:");
    await writePainted({ kept: true });
  }
}
