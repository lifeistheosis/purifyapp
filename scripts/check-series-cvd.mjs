#!/usr/bin/env node
/**
 * Colour-vision separation for the admin's categorical series.
 *
 * WHY THIS EXISTS. app/admin/admin-theme.css used to carry the claim that
 * the dark series had a "worst adjacent deutan dE 9.0", annotated as a
 * one-time hand computation that could not be re-run. An unverifiable
 * number in a comment is worse than no number: it survives the values it
 * described. This script makes the claim checkable, so the next person to
 * touch --adm-s1..s6 can measure instead of trusting prose.
 *
 * It reads the tokens out of the stylesheet rather than restating them,
 * so it cannot drift from what actually ships.
 *
 * METHOD. Viénot/Brettel/Mollon dichromat simulation in LMS space, then
 * CIEDE2000 in CIELAB. Reported for deutan, protan and tritan.
 *
 * CALIBRATION CAVEAT, STATED PLAINLY. Run against the pre-v4 dark set this
 * reports 18.4, not the 9.0 the old comment recorded. The original figure's
 * method is unknown, so the two are not comparable and this script does not
 * reproduce it. Absolute values here are only meaningful against each other.
 * Comparisons BETWEEN sets, measured the same way, are the useful output.
 *
 * ANY-PAIR IS THE BAR THAT MATTERS. Adjacent-pair separation only covers
 * series printed next to each other in a legend. A chart that plots s1
 * against s5 needs those two to differ, so the minimum over ALL pairs is
 * the number to read first.
 *
 *   node scripts/check-series-cvd.mjs
 */
import { readFileSync } from "node:fs";

const CSS = new URL("../app/admin/admin-theme.css", import.meta.url);

/**
 * Every custom property declared in a named selector block, as a map.
 *
 * Split on ";" rather than matching per token: a constructed RegExp needs
 * escaped backslashes, which is one more thing to get wrong for no gain
 * when the grammar here is "name: value".
 */
function tokensIn(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  const block = css.slice(open + 1, css.indexOf("}", open));
  const out = new Map();
  for (const decl of block.split(";")) {
    const at = decl.indexOf(":");
    if (at === -1) continue;
    const name = decl.slice(0, at).trim();
    if (name.startsWith("--")) out.set(name, decl.slice(at + 1).trim());
  }
  return out;
}

const HEX6 = /^#[0-9a-f]{6}$/i;

function seriesIn(css, selector) {
  const t = tokensIn(css, selector);
  return Array.from({ length: 6 }, (_, i) => {
    const v = t.get(`--adm-s${i + 1}`);
    if (!v || !HEX6.test(v))
      throw new Error(`--adm-s${i + 1} missing or not a plain 6-digit hex in ${selector}`);
    return v;
  });
}
function panelIn(css, selector) {
  const v = tokensIn(css, selector).get("--adm-panel");
  if (!v || !HEX6.test(v)) throw new Error(`--adm-panel unusable in ${selector}`);
  return v;
}

const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const gam = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;

const RGB2LMS = [[17.8824, 43.5161, 4.11935], [3.45565, 27.1554, 3.86714], [0.0299566, 0.184309, 1.46709]];
const LMS2RGB = [[0.080944, -0.130504, 0.116721], [-0.0102485, 0.0540194, -0.113615], [-0.000365294, -0.00412163, 0.693513]];
const MATS = {
  deutan: [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]],
  protan: [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]],
  tritan: [[1, 0, 0], [0, 1, 0], [-0.395913, 0.801109, 0]],
};
const mul = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);

const simulate = (c, M) =>
  mul(LMS2RGB, mul(M, mul(RGB2LMS, hex(c).map(lin)))).map((v) =>
    Math.min(1, Math.max(0, gam(v))),
  );

function toLab(rgb) {
  const [r, g, b] = rgb.map(lin);
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const X = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const Y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const Z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

function ciede2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const A1 = (1 + G) * a1, A2 = (1 + G) * a2;
  const Cp1 = Math.hypot(A1, b1), Cp2 = Math.hypot(A2, b2);
  const hue = (a, b) => (a === 0 && b === 0 ? 0 : ((Math.atan2(b, a) * deg) + 360) % 360);
  const hp1 = hue(A1, b1), hp2 = hue(A2, b2);
  let dhp = 0;
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (Cp1 + Cp2) / 2;
  let hbp;
  if (Cp1 * Cp2 === 0) hbp = hp1 + hp2;
  else {
    hbp = (hp1 + hp2) / 2;
    if (Math.abs(hp1 - hp2) > 180) hbp += hp1 + hp2 < 360 ? 180 : -180;
  }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad)
            + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Rt = -Math.sin(2 * (30 * Math.exp(-(((hbp - 275) / 25) ** 2))) * rad)
             * 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const dC = (Cp2 - Cp1) / (1 + 0.045 * Cbp), dH = dHp / (1 + 0.015 * Cbp * T);
  return Math.sqrt(((L2 - L1) / Sl) ** 2 + dC ** 2 + dH ** 2 + Rt * dC * dH);
}

const dE = (a, b, M) => ciede2000(toLab(simulate(a, M)), toLab(simulate(b, M)));

const lum = (c) => {
  const [r, g, b] = hex(c).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const css = readFileSync(CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const THEMES = [
  ["dark", ".adm {", ".adm {"],
  ["light", ':root[data-adm-theme="light"] .adm {', ':root[data-adm-theme="light"] .adm {'],
];

let worstAny = Infinity;
for (const [name, sel, psel] of THEMES) {
  const set = seriesIn(css, sel);
  const panel = panelIn(css, psel);
  console.log(`\n${name}  panel ${panel}`);
  console.log(`  ${set.join("  ")}`);
  for (const [cvd, M] of Object.entries(MATS)) {
    let any = [Infinity, ""], adj = [Infinity, ""];
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++) {
        const d = dE(set[i], set[j], M);
        if (d < any[0]) any = [d, `s${i + 1}/s${j + 1}`];
        if (j === i + 1 && d < adj[0]) adj = [d, `s${i + 1}/s${j + 1}`];
      }
    if (cvd === "deutan") worstAny = Math.min(worstAny, any[0]);
    console.log(
      `  ${cvd.padEnd(7)} any-pair ${any[0].toFixed(1).padStart(5)} (${any[1]})   ` +
      `adjacent ${adj[0].toFixed(1).padStart(5)} (${adj[1]})`,
    );
  }
  const bad = set.filter((c) => ratio(c, panel) < 3);
  console.log(
    `  contrast on panel ${set.map((c) => ratio(c, panel).toFixed(2)).join(" ")}` +
    (bad.length ? `   BELOW 3:1 -> ${bad.join(" ")}` : ""),
  );
}
console.log(
  `\nWorst any-pair deutan across both themes: ${worstAny.toFixed(1)}.\n` +
  `Read this as a relative figure. See the calibration caveat at the top.\n`,
);
