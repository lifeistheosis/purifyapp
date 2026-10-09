'use strict';
// Purify AD 2, "Your Bible is missing books". RUBRIC style: lapis black, cool vellum,
// and the red that Orthodox service books print their rubrics in. No gold, no orange.
// Every frame is a pure function of t (seconds). Timing measured from the owner's audio:
// 136 BPM grid from just_the_beat_once_again.mp3, word onsets from the voiceover.

const W = 1080, H = 1920, FPS = 30;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const BUF = mk(), TMP = mk(), TMP2 = mk();
const bctx = BUF.getContext('2d');

// ---------------------------------------------------------------- palette
const C = {
  night0: '#05070d', night1: '#0b1222', lapis: '#16223a',
  vellum: '#e8e7e2', ink: '#1c1a16', inkSoft: '#6d675c', leader: '#bfb9ad',
  rubric: '#a8262c', rubricHi: '#d93a3f', white: '#f3f1ec', steel: '#a6b2c4',
};

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out2: t => 1 - (1 - t) * (1 - t),
  out3: t => 1 - Math.pow(1 - t, 3),
  out4: t => 1 - Math.pow(1 - t, 4),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  in2: t => t * t,
  in3: t => t * t * t,
  inOut3: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOut2: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- timing (measured)
const B0 = 0.020, BP = 0.4413;              // first beat, seconds per beat (136 BPM); claps on even beats
const bt = k => B0 + BP * k;
const T = {
  rips: [bt(4), bt(6), bt(7)],          // 1.785 entry (Tobit, Judith), 2.668 clap (Maccabees), 3.109 "purpose" (1 Esdras)
  pageOut: bt(8),                       // 3.550 clap, bar line
  cards: [bt(9), bt(12), bt(14)],       // 3.992 c. 350, 5.316 1534 (808 change, "erased"), 6.198 1646 ("Orthodox")
  histOut: bt(16),                      // 7.081 clap, bar line
  restores: [bt(18), bt(19), bt(20)],   // 7.963, 8.405, 8.846 ("give")
  whole: bt(21),                        // 9.287
  tablet: bt(22),                       // 9.729 clap
  scrolls: [bt(23), bt(26), bt(28)],    // 10.170, 11.494, 12.376
  marks: [bt(24), bt(25), bt(26) + 0.26, bt(28) + 0.26], // highlight rings
  settle: bt(30),                       // 13.259
  lock: bt(32),                         // 14.141 bar line, "Download"
  tagline: bt(34),                      // 15.024
};
const WD = {
  your: 0.33, bible: 0.49, is: 0.71, missing: 0.87, books: 1.28,
  ripped: 2.36, out: 2.79, on: 2.96, purpose: 3.06,
  western: 4.23, erased: 4.98, orthodox: 6.20, history: 6.86,
  we: 7.78, built: 7.92, purify1: 8.19, to: 8.70, give: 8.81, it: 9.00, back: 9.11,
  the: 9.90, complete: 9.98, unaltered: 10.53, canon: 11.10,
  unlocked: 11.90, completely: 12.63, free: 13.28, download: 14.12, purify2: 14.66,
};
const LEAD = 0.05;

const HITS = [
  [T.rips[0], 0.5], [T.rips[1], 0.42], [T.rips[2], 0.34], [T.pageOut, 0.22],
  [T.cards[0], 0.2], [T.cards[1], 0.32], [T.cards[2], 0.28],
  [T.restores[0], 0.26], [T.restores[1], 0.26], [T.restores[2], 0.36], [T.tablet, 0.24],
  [T.marks[0], 0.12], [T.marks[1], 0.12], [T.marks[2], 0.12], [T.marks[3], 0.12], [T.lock, 0.3],
];
function camera(t) {
  let dx = 0, dy = 0, rot = 0, punch = 0;
  for (let i = 0; i < HITS.length; i++) {
    const [ht, s] = HITS[i], a = t - ht;
    if (a < 0 || a > 0.5) continue;
    const env = Math.exp(-a * 12);
    dx += s * 14 * env * Math.sin(a * 2 * Math.PI * 12 + i * 1.3);
    dy += s * 11 * env * Math.cos(a * 2 * Math.PI * 10 + i * 2.1);
    rot += s * 0.005 * env * Math.sin(a * 2 * Math.PI * 8 + i);
    punch += s * 0.035 * Math.exp(-a * 8);
  }
  return { dx, dy, rot, punch };
}
const FLASH = [[T.rips[0], 0.22, 0.14, '226,234,255'], [T.tablet, 0.16, 0.14, '226,234,255'], [T.lock, 0.18, 0.2, '240,242,255']];
const CHROMA = [[T.rips[0], 4], [T.rips[1], 3], [T.rips[2], 2.5], [T.cards[1], 2]];

// ---------------------------------------------------------------- assets
const IM = {};
const GRAIN = [];
async function loadAll() {
  const fonts = [
    ['Inter', 'fonts/Inter-Medium.otf', { weight: '500' }],
    ['Inter', 'fonts/Inter-SemiBold.otf', { weight: '600' }],
    ['Inter', 'fonts/Inter-Bold.otf', { weight: '700' }],
    ['Inter', 'fonts/Inter-ExtraBold.otf', { weight: '800' }],
    ['Inter', 'fonts/Inter-Black.otf', { weight: '900' }],
    ['Lora', 'fonts/lora-normal.woff2', { weight: '400 700', style: 'normal' }],
    ['Lora', 'fonts/lora-italic.woff2', { weight: '400 700', style: 'italic' }],
  ];
  await Promise.all(fonts.map(async ([fam, url, desc]) => { const f = new FontFace(fam, `url(${url})`, desc); await f.load(); document.fonts.add(f); }));
  const load = (name, src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { IM[name] = im; res(); }; im.onerror = rej; im.src = src; });
  await Promise.all([load('codex', 'assets/codex_lapis.jpg'), load('tablet', 'assets/tablet_strip.png')]);
  for (let k = 0; k < 6; k++) {
    const c = mk(540, 960), g = c.getContext('2d'), id = g.createImageData(540, 960), R = rng(91 + k);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + ((R() + R() + R() - 1.5) * 90); id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0); GRAIN.push(c);
  }
  buildPage();
  buildPlate();
}
let PLATE = null;
function buildPlate() {
  PLATE = mk(1320, 742); const g = PLATE.getContext('2d');
  g.drawImage(IM.codex, 0, 0, 1320, 742);
  g.globalCompositeOperation = 'destination-in';
  const v = g.createLinearGradient(0, 0, 0, 742); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.28, 'rgba(0,0,0,1)'); v.addColorStop(0.72, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, 1320, 742);
  const h = g.createLinearGradient(0, 0, 1320, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.2, 'rgba(0,0,0,1)'); h.addColorStop(0.8, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h; g.fillRect(0, 0, 1320, 742);
}

// ---------------------------------------------------------------- the contents page
// The Historical Books of the Old Testament as Purify carries them (Septuagint order,
// chapter counts from data/bible/books.json).
const BOOKS = [
  ['1 Chronicles', 29], ['2 Chronicles', 36], ['1 Esdras', 9], ['Ezra', 10], ['Nehemiah', 13],
  ['Tobit', 14], ['Judith', 16], ['Esther', 10], ['1 Maccabees', 16], ['2 Maccabees', 15], ['3 Maccabees', 7],
];
const PW = 900, PH = 1180, LINE0 = 300, LSTEP = 76;
const PAGE = { cx: 540, cy: 1085, rot: -0.021 };
const lineY = i => LINE0 + i * LSTEP;
// bands torn out: [first line, last line, rip time index, flight direction]
const BANDS = [
  { a: 5, b: 6, rip: 0, dir: 1, restore: 2 },   // Tobit, Judith
  { a: 8, b: 10, rip: 1, dir: -1, restore: 1 }, // 1, 2, 3 Maccabees
  { a: 2, b: 2, rip: 2, dir: 1, restore: 0 },   // 1 Esdras
];
let PAGECV = null;
function jagged(y0, seed) {
  const R = rng(seed), pts = []; let off = 0;
  for (let x = 0; x <= PW; x += 7) {
    off += (R() - 0.5) * 5; off *= 0.82;
    let spike = R() < 0.12 ? (R() - 0.5) * 12 : 0;
    pts.push([x, y0 + off * 2.2 + spike]);
  }
  pts[pts.length - 1][0] = PW;
  return pts;
}
function buildPage() {
  PAGECV = mk(PW, PH);
  const g = PAGECV.getContext('2d');
  g.fillStyle = C.vellum; g.fillRect(0, 0, PW, PH);
  // vellum: cool fibres and faint mottling, no yellow
  const R = rng(5);
  for (let i = 0; i < 9000; i++) { const v = R(); g.fillStyle = v < 0.5 ? `rgba(120,118,112,${0.025 + R() * 0.04})` : `rgba(255,255,255,${0.05 + R() * 0.06})`; g.fillRect(R() * PW, R() * PH, 1 + R() * 2, 1 + R() * 2); }
  g.strokeStyle = 'rgba(110,108,100,0.05)'; g.lineWidth = 1;
  for (let i = 0; i < 260; i++) { const x = R() * PW, y = R() * PH, l = 8 + R() * 30, a = R() * Math.PI; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 6, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  const vg = g.createRadialGradient(PW / 2, PH / 2, PH * 0.3, PW / 2, PH / 2, PH * 0.78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,44,52,0.16)');
  g.fillStyle = vg; g.fillRect(0, 0, PW, PH);
  // heading
  g.textBaseline = 'alphabetic';
  g.font = '600 22px Inter'; g.letterSpacing = '8px'; g.fillStyle = C.rubric; g.fillText('THE OLD TESTAMENT', 72, 100);
  g.font = '600 58px Lora'; g.letterSpacing = '0px'; g.fillStyle = C.ink; g.fillText('The Historical Books', 72, 172);
  g.font = '600 17px Inter'; g.letterSpacing = '4px'; g.fillStyle = '#8b8477'; g.textAlign = 'right'; g.fillText('CHAPTERS', 828 + 4, 206); g.textAlign = 'left';
  g.fillStyle = C.rubric; g.fillRect(72, 220, 756, 2.5);
  // the list
  BOOKS.forEach(([name, ch], i) => {
    const y = lineY(i);
    g.font = '500 50px Lora'; g.letterSpacing = '0px'; g.fillStyle = C.ink; g.fillText(name, 72, y);
    const nw = g.measureText(name).width;
    g.font = 'italic 500 44px Lora'; g.fillStyle = C.inkSoft; g.textAlign = 'right'; g.fillText(String(ch), 828, y); const cw = g.measureText(String(ch)).width; g.textAlign = 'left';
    g.fillStyle = C.leader; for (let x = 72 + nw + 22; x < 828 - cw - 18; x += 15) { g.beginPath(); g.arc(x, y - 6, 2, 0, Math.PI * 2); g.fill(); }
  });
  g.font = 'italic 500 26px Lora'; g.fillStyle = '#8b8477'; g.fillText('Brenton, The Septuagint, 1851', 72, PH - 60);
  // geometry of each band: matching torn edges on the page and on the strip
  BANDS.forEach((bd, k) => {
    bd.top = jagged(lineY(bd.a) - 56, 100 + k * 7);
    bd.bot = jagged(lineY(bd.b) + 24, 200 + k * 7);
    const p = new Path2D();
    bd.top.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    for (let i = bd.bot.length - 1; i >= 0; i--) p.lineTo(bd.bot[i][0], bd.bot[i][1]);
    p.closePath(); bd.path = p;
    const R2 = rng(300 + k), fib = [];
    for (const edge of [bd.top, bd.bot]) for (let i = 0; i < edge.length; i += 1) if (R2() < 0.55) fib.push([edge[i][0] + R2() * 6, edge[i][1], (R2() - 0.5) * 2, 2 + R2() * 6]);
    bd.fibers = fib;
    bd.cy = (lineY(bd.a) - 56 + lineY(bd.b) + 24) / 2;
  });
}
function stripPose(bd, t) {
  // returns {x, y, rot, s, alpha, gone} relative to the band's home, or null when home and attached
  const tr = T.rips[bd.rip], tb = T.restores[bd.restore];
  const out = (p) => ({ x: bd.dir * 760 * E.in2(p) + bd.dir * 30 * p, y: -40 * p - 980 * E.in2(p), rot: bd.dir * 0.55 * E.in2(p) + bd.dir * 0.03, s: 1.02 + 0.16 * p, lift: 1 });
  if (t < tr) return null;
  if (t < tr + 0.62 && t < tb) {
    const a = t - tr;
    if (a < 0.07) { const q = a / 0.07; return { x: 0, y: -10 * q, rot: bd.dir * 0.012 * q, s: 1 + 0.02 * q, lift: q }; }
    return out(seg(a, 0.07, 0.62));
  }
  if (t < tb - 0.42) return { gone: true };
  if (t < tb) { const p = 1 - E.out3(seg(t, tb - 0.42, tb)); return out(p); }
  return null;
}
function drawStrip(g, bd, pose) {
  g.save();
  g.translate(PW / 2 + pose.x, bd.cy + pose.y); g.rotate(pose.rot); g.scale(pose.s, pose.s); g.translate(-PW / 2, -bd.cy);
  g.save(); g.shadowColor = `rgba(0,0,0,${0.55 * pose.lift})`; g.shadowBlur = 40 * pose.lift; g.shadowOffsetY = 26 * pose.lift;
  g.fillStyle = C.vellum; g.fill(bd.path); g.restore();
  g.save(); g.clip(bd.path); g.drawImage(PAGECV, 0, 0); g.restore();
  // the torn fibre rim
  g.strokeStyle = 'rgba(252,251,247,0.95)'; g.lineWidth = 3;
  for (const edge of [bd.top, bd.bot]) { g.beginPath(); edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  g.strokeStyle = 'rgba(250,249,244,0.75)'; g.lineWidth = 1;
  for (const [x, y, dx, l] of bd.fibers) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * 2, y + (y < bd.cy ? -l : l)); g.stroke(); }
  g.restore();
}
// draw the page with its holes (and the strips that are home or flying), in page space
function drawPageAt(g, t, opts = {}) {
  const { cx = PAGE.cx, cy = PAGE.cy, rot = PAGE.rot, s = 1, alpha = 1, glow = 0 } = opts;
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy); g.rotate(rot); g.scale(s, s); g.translate(-PW / 2, -PH / 2);
  const holes = BANDS.filter(bd => stripPose(bd, t) !== null);
  const sheet = new Path2D(); sheet.rect(0, 0, PW, PH); holes.forEach(bd => sheet.addPath(bd.path));
  // the sheet's shadow, holes and all, then the paper clipped to the same shape
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 70; g.shadowOffsetY = 30; g.fillStyle = C.vellum; g.fill(sheet, 'evenodd'); g.restore();
  g.save(); g.clip(sheet, 'evenodd'); g.drawImage(PAGECV, 0, 0); g.restore();
  // the torn rim on the page side of each hole
  for (const bd of holes) {
    g.strokeStyle = 'rgba(252,251,247,0.9)'; g.lineWidth = 2.5;
    for (const edge of [bd.top, bd.bot]) { g.beginPath(); edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    g.strokeStyle = 'rgba(250,249,244,0.6)'; g.lineWidth = 1;
    for (const [x, y, dx, l] of bd.fibers) { g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + 3 + dx * 2, y + (y < bd.cy ? l * 0.6 : -l * 0.6)); g.stroke(); }
  }
  g.restore();
  // flying strips, in page space but drawn above
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy); g.rotate(rot); g.scale(s, s); g.translate(-PW / 2, -PH / 2);
  for (const bd of BANDS) {
    const pose = stripPose(bd, t);
    if (!pose || pose.gone) continue;
    drawStrip(g, bd, pose);
  }
  // seams glowing red as each strip lands home, then healing
  for (const bd of BANDS) {
    const a = t - T.restores[bd.restore];
    if (a < 0 || a > 0.7) continue;
    const k = Math.exp(-a * 5.5);
    g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = `rgba(217,58,63,${(0.9 * k).toFixed(3)})`; g.shadowBlur = 22;
    g.strokeStyle = `rgba(217,58,63,${(0.85 * k).toFixed(3)})`; g.lineWidth = 3;
    for (const edge of [bd.top, bd.bot]) { g.beginPath(); edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    g.restore();
    // the given-back names underlined in rubric
    const u = E.out3(seg(a, 0.05, 0.4)), fade = 1 - seg(a, 0.45, 0.7) * 0.0;
    g.fillStyle = `rgba(168,38,44,${(0.85 * fade).toFixed(3)})`;
    for (let i = bd.a; i <= bd.b; i++) g.fillRect(72, lineY(i) + 10, 520 * u, 3);
  }
  if (t >= T.restores[2] + 0.7) {
    // once restored, the names keep a quiet rubric underline
    g.fillStyle = 'rgba(168,38,44,0.85)';
    for (const bd of BANDS) for (let i = bd.a; i <= bd.b; i++) g.fillRect(72, lineY(i) + 10, 520, 3);
  }
  if (glow > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,255,255,${(0.12 * glow).toFixed(3)})`; g.fillRect(0, 0, PW, PH); g.restore(); }
  g.restore();
}

// ---------------------------------------------------------------- text system (shared with AD 1)
const SANS = (w, s) => `${w} ${s}px Inter`;
const SERIF = (w, s, it = false) => `${it ? 'italic ' : ''}${w} ${s}px Lora`;
const BLOCKS = [
  { id: 'hook', y: 268, lh: 112, fit: 900, lines: [
    [{ s: 'YOUR', t: -0.4, st: { font: SANS(800, 108), color: C.white } }, { s: 'BIBLE', t: -0.4, st: { font: SANS(800, 108), color: C.white } }, { s: 'IS', t: 0.5, st: { font: SANS(800, 108), color: C.white } }],
    [{ s: 'MISSING', t: WD.missing, st: { font: SANS(800, 108), color: C.rubricHi } }, { s: 'BOOKS.', t: WD.books, st: { font: SANS(800, 108), color: C.white } }],
  ], out: 1.95, outDur: 0.12 },
  { id: 'ripped', y: 268, lh: 112, fit: 900, lines: [
    [{ s: 'RIPPED', t: WD.ripped, st: { font: SANS(800, 108), color: C.white } }, { s: 'OUT', t: WD.out, st: { font: SANS(800, 108), color: C.white } }],
    [{ s: 'ON', t: WD.on, st: { font: SANS(800, 108), color: C.rubricHi } }, { s: 'PURPOSE.', t: WD.purpose, st: { font: SANS(800, 108), color: C.rubricHi } }],
  ], out: T.pageOut + 0.02, outDur: 0.16 },
  { id: 'built', y: 300, lh: 118, lines: [
    [{ s: 'We', t: WD.we, st: { font: SERIF(600, 100), color: C.white } }, { s: 'built', t: WD.built, st: { font: SERIF(600, 100), color: C.white } }, { s: 'Purify', t: WD.purify1, st: { font: SERIF(600, 100, true), color: C.rubricHi } }],
    [{ s: 'to', t: WD.to, st: { font: SERIF(600, 100), color: C.white } }, { s: 'give', t: WD.give, st: { font: SERIF(600, 100), color: C.white } }, { s: 'it', t: WD.it, st: { font: SERIF(600, 100), color: C.white } }, { s: 'back.', t: WD.back, st: { font: SERIF(600, 100), color: C.white } }],
  ], out: T.tablet - 0.02, outDur: 0.14 },
  { id: 'canon', y: 300, lh: 100, lines: [
    [{ s: 'The', t: WD.the, st: { font: SERIF(600, 88), color: C.white } }, { s: 'complete,', t: WD.complete, st: { font: SERIF(600, 88), color: C.white } }],
    [{ s: 'unaltered', t: WD.unaltered, st: { font: SERIF(600, 88), color: C.white } }, { s: 'canon.', t: WD.canon, st: { font: SERIF(600, 88), color: C.rubricHi } }],
  ], out: 11.78, outDur: 0.12 },
  { id: 'free', y: 352, lh: 100, lines: [
    [{ s: 'Completely', t: WD.unlocked, st: { font: SERIF(600, 100), color: C.white } }, { s: 'free.', t: WD.free, st: { font: SERIF(600, 100, true), color: C.rubricHi } }],
  ], out: T.lock - 0.02, outDur: 0.12 },
];
function setFont(g, st) { g.font = st.font; g.letterSpacing = (st.ls || 0) + 'px'; }
function scaled(st, sc) {
  if (sc === 1) return st;
  const m = st.font.match(/(\d+(?:\.\d+)?)px/);
  return { ...st, font: st.font.replace(m[0], (parseFloat(m[1]) * sc).toFixed(1) + 'px'), ls: (st.ls || 0) * sc };
}
function layout(g, b) {
  if (b._lay) return b._lay;
  const measure = (line, sc) => { let total = 0; const out = []; line.forEach((w, i) => { const st = scaled(w.st, sc); setFont(g, st); const width = g.measureText(w.s).width; const sp = i < line.length - 1 ? g.measureText(' ').width * 1.02 : 0; out.push({ w, st, x: total, width }); total += width + sp; }); return { total, out }; };
  let scale = 1;
  if (b.fit) { const widest = Math.max(...b.lines.map(l => measure(l, 1).total)); if (widest > b.fit) scale = b.fit / widest; }
  const lay = [];
  b.lines.forEach((line, li) => { const { total, out } = measure(line, scale); const x0 = W / 2 - total / 2; out.forEach(o => lay.push({ ...o, X: x0 + o.x, Y: b.y + li * b.lh * scale, li })); });
  g.letterSpacing = '0px'; b._lay = lay; return lay;
}
function drawBlock(g, b, t) {
  if (t < Math.min(...b.lines.flat().map(w => w.t)) - LEAD - 0.01) return;
  if (t > b.out + (b.outDur || 0.14) + 0.02) return;
  for (const o of layout(g, b)) drawWord(g, o, t, b);
}
function drawWord(g, o, t, b) {
  const w = o.w, st = o.st, t0 = w.t - LEAD;
  const p = E.out3(seg(t, t0, t0 + (w.dur || 0.24)));
  if (p <= 0) return;
  let alpha = p, blur = (1 - p) * 14, dy = (1 - p) * 18, sc = 1 + (1 - p) * 0.05;
  if (t >= b.out) { const q = E.in2(seg(t, b.out, b.out + (b.outDur || 0.14))); alpha *= 1 - q; blur += q * 14; dy -= q * 16; }
  if (alpha <= 0.003) return;
  g.save(); g.globalAlpha = alpha; setFont(g, st); g.textBaseline = 'alphabetic';
  if (blur > 0.35) g.filter = `blur(${blur.toFixed(1)}px)`;
  const cx = o.X + o.width / 2, cy = o.Y - 30;
  g.translate(cx, cy + dy); g.scale(sc, sc); g.translate(-cx, -cy);
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.shadowOffsetY = 4;
  g.fillStyle = st.color; g.fillText(w.s, o.X, o.Y);
  g.restore();
}

// ---------------------------------------------------------------- backgrounds
function nightBg(g, lift = 0) {
  const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, C.night0); lg.addColorStop(1, C.night1); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(540, 980, 0, 540, 980, 1150); rg.addColorStop(0, `rgba(60,84,132,${(0.22 + 0.1 * lift).toFixed(3)})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
}
const DUST = (() => { const R = rng(17); const a = []; for (let i = 0; i < 70; i++) a.push({ x: R() * W, y: R() * H, s: 1 + R() * 2.4, v: 10 + R() * 26, ph: R() * 10, a: 0.2 + R() * 0.5 }); return a; })();
function drawDust(g, t, amount = 1) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const p of DUST) {
    const y = ((p.y - t * p.v) % H + H) % H, x = p.x + 12 * Math.sin(t * 0.5 + p.ph);
    const a = p.a * amount * (0.6 + 0.4 * Math.sin(t * 2 + p.ph * 3));
    g.fillStyle = `rgba(200,214,240,${(a * 0.45).toFixed(3)})`; g.beginPath(); g.arc(x, y, p.s, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- scene 1: the hook
function sceneHook(g, t) {
  nightBg(g);
  drawDust(g, t, 0.6);
  // the camera opens close on the list and settles, then drifts in
  const open = E.out3(seg(t, 0, 0.95));
  const s = 1.05 * (lerp(1.12, 1.0, open) + 0.035 * seg(t, 0.95, T.pageOut));
  const lift = t >= T.pageOut ? E.in3(seg(t, T.pageOut, T.pageOut + 0.42)) : 0;
  g.save();
  if (lift > 0) g.filter = `blur(${(10 * lift).toFixed(1)}px)`;
  drawPageAt(g, t, { cy: PAGE.cy + lerp(40, 0, open) + 1250 * lift, s, rot: PAGE.rot + 0.06 * lift });
  g.restore();
  const tg = g.createLinearGradient(0, 0, 0, 520); tg.addColorStop(0, 'rgba(5,7,13,0.85)'); tg.addColorStop(1, 'rgba(5,7,13,0)');
  g.fillStyle = tg; g.fillRect(0, 0, W, 520);
}

// ---------------------------------------------------------------- scene 2: the history, with years that roll
const CARDS = [
  { year: '350', pre: 'c.', l1: 'CODEX SINAITICUS', l2: 'TOBIT  ·  JUDITH  ·  WISDOM  ·  SIRACH' },
  { year: '1534', pre: '', l1: "LUTHER'S BIBLE", l2: 'SETS THEM APART AS APOCRYPHA' },
  { year: '1646', pre: '', l1: 'WESTMINSTER CONFESSION', l2: '“NO PART OF THE CANON”' },
];
const YEAR_Y = 1050, YEAR_FONT = SERIF(600, 250);
function drawYear(g, card, x0, alpha, blur, dy, digitRoll) {
  g.save(); g.globalAlpha = alpha; if (blur > 0.35) g.filter = `blur(${blur.toFixed(1)}px)`;
  g.textBaseline = 'alphabetic'; g.fillStyle = C.white; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40;
  g.font = YEAR_FONT; g.letterSpacing = '-4px';
  const w = g.measureText(card.year).width;
  let pw = 0; if (card.pre) { g.font = SERIF(500, 120, true); g.letterSpacing = '0px'; pw = g.measureText(card.pre).width + 14; }
  const x = x0 - (w + pw) / 2;
  if (card.pre) { g.font = SERIF(500, 120, true); g.fillStyle = C.steel; g.fillText(card.pre, x, YEAR_Y + dy); g.fillStyle = C.white; }
  g.font = YEAR_FONT; g.letterSpacing = '-4px';
  if (digitRoll) {
    // per-digit odometer roll between two years of the same length
    const { from, p } = digitRoll, base = x + pw;
    const px = i => g.measureText(card.year.slice(0, i)).width;
    for (let i = 0; i < card.year.length; i++) {
      const dNew = card.year[i], dOld = from[i], x0 = base + px(i), x1 = base + px(i + 1);
      g.save(); g.beginPath(); g.rect(x0 - 8, YEAR_Y - 232 + dy, x1 - x0 + 16, 292); g.clip();
      if (dNew === dOld) g.fillText(dNew, x0, YEAR_Y + dy);
      else { const q = E.inOut3(clamp((p - i * 0.12) / 0.64)); const ga = g.globalAlpha; if (q > 0 && q < 1) g.filter = `blur(${(3 * Math.sin(Math.PI * q)).toFixed(1)}px)`; g.globalAlpha = ga * (1 - q); g.fillText(dOld, x0, YEAR_Y + dy - 260 * q); g.globalAlpha = ga * q; g.fillText(dNew, x0, YEAR_Y + dy + 260 * (1 - q)); g.globalAlpha = ga; g.filter = 'none'; }
      g.restore();
    }
  } else g.fillText(card.year, x + pw, YEAR_Y + dy);
  g.restore();
}
function drawLabels(g, card, alpha1, alpha2, dy) {
  g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.globalAlpha = alpha1; g.font = SANS(600, 32); g.letterSpacing = '7px'; g.fillStyle = C.steel; g.fillText(card.l1, 540 + 3.5, YEAR_Y + 110 + dy);
  g.globalAlpha = alpha2; g.font = SANS(500, 29); g.letterSpacing = '3px'; g.fillStyle = 'rgba(243,241,236,0.86)'; g.fillText(card.l2, 540 + 1.5, YEAR_Y + 162 + dy);
  g.restore();
  g.save(); g.globalAlpha = Math.min(alpha1, alpha2); g.fillStyle = C.rubric; g.fillRect(540 - 60, YEAR_Y + 46 + dy, 120, 3); g.restore();
}
function sceneHistory(g, t) {
  nightBg(g, 0.4);
  // the codex behind the first card, cold and quiet
  const pa = 0.42 * E.out2(seg(t, T.pageOut + 0.1, T.cards[0] + 0.3)) * (1 - 0.7 * seg(t, T.cards[1] - 0.1, T.cards[1] + 0.4));
  if (pa > 0.01) {
    g.save(); g.globalAlpha = pa; const sc = 1.0 + 0.05 * seg(t, T.pageOut, T.histOut);
    const iw = 1320 * sc, ih = 742 * sc; g.drawImage(PLATE, 540 - iw / 2, YEAR_Y - 150 - ih / 2, iw, ih); g.restore();
  }
  drawDust(g, t, 0.7);
  // a vertical rule of time, rubric red, behind the years
  const rp = E.out3(seg(t, T.cards[0] - 0.1, T.cards[0] + 0.5)) * (1 - E.in2(seg(t, T.histOut, T.histOut + 0.3)));
  g.fillStyle = `rgba(168,38,44,${(0.5 * rp).toFixed(3)})`; g.fillRect(539, 420, 2, 330 * rp); g.fillRect(539, YEAR_Y + 230, 2, 330 * rp);
  const out = E.in2(seg(t, T.histOut, T.histOut + 0.3));
  for (let i = 0; i < CARDS.length; i++) {
    const t0 = T.cards[i], t1 = i < CARDS.length - 1 ? T.cards[i + 1] : 99;
    if (t < t0 - 0.06 || t > t1 + 0.4) continue;
    const card = CARDS[i];
    const inP = E.out3(seg(t, t0 - 0.06, t0 + 0.3));
    if (i === 0) {
      const leave = E.inOut3(seg(t, t1, t1 + 0.34));
      drawYear(g, card, 540, inP * (1 - leave) * (1 - out), (1 - inP) * 18 + leave * 10, -260 * leave - 40 * out, null);
      drawLabels(g, card, E.out3(seg(t, t0 + 0.12, t0 + 0.4)) * (1 - E.in2(seg(t, t1 - 0.05, t1 + 0.12))), E.out3(seg(t, t0 + 0.24, t0 + 0.52)) * (1 - E.in2(seg(t, t1 - 0.05, t1 + 0.12))), 0);
    } else if (i === 1) {
      const enter = E.inOut3(seg(t, t0, t0 + 0.34));
      if (t < t1) drawYear(g, card, 540, enter, (1 - enter) * 10, 260 * (1 - enter), null);
      drawLabels(g, card, E.out3(seg(t, t0 + 0.14, t0 + 0.36)) * (1 - E.in2(seg(t, t1 - 0.06, t1 + 0.1))), E.out3(seg(t, t0 + 0.22, t0 + 0.46)) * (1 - E.in2(seg(t, t1 - 0.06, t1 + 0.1))), 0);
    } else {
      // 1534 rolls over into 1646, digit by digit
      const p = seg(t, t0, t0 + 0.42);
      drawYear(g, card, 540, 1 - out, out * 12, -40 * out, { from: CARDS[1].year, p });
      drawLabels(g, card, E.out3(seg(t, t0 + 0.12, t0 + 0.36)) * (1 - out), E.out3(seg(t, t0 + 0.2, t0 + 0.46)) * (1 - out), 0);
    }
  }
}

// ---------------------------------------------------------------- scene 3: given back
function sceneRestore(g, t) {
  nightBg(g, 0.2);
  drawDust(g, t, 0.6);
  const rise = E.out3(seg(t, T.histOut - 0.02, T.histOut + 0.5));
  const s = 0.94 + 0.04 * seg(t, T.histOut, T.tablet);
  const glow = t >= T.whole ? Math.exp(-(t - T.whole) * 4) : 0;
  drawPageAt(g, t, { cy: PAGE.cy + 160 + 1200 * (1 - rise), s, rot: PAGE.rot + 0.05 * (1 - rise), glow });
  const tg = g.createLinearGradient(0, 0, 0, 640); tg.addColorStop(0, 'rgba(5,7,13,0.9)'); tg.addColorStop(1, 'rgba(5,7,13,0)');
  g.fillStyle = tg; g.fillRect(0, 0, W, 640);
}

// ---------------------------------------------------------------- scene 4: the fix, the real Bible on an iPad
const TAB = { cx: 540, cy: 1205, sw: 820, sh: 1180 * (820 / 820) };
const STRIP_PER_CSS = 840 / 820; // tablet_strip.png is 840 px for 820 CSS px
const POS = { // CSS px from the capture of /bible at 820 by 1180
  '1 Esdras': [34, 1526, 244, 66], 'Tobit': [34, 1603, 244, 66], 'Judith': [288, 1603, 244, 66],
  '1 Maccabees': [34, 1680, 244, 66], '2 Maccabees': [288, 1680, 244, 66], '3 Maccabees': [542, 1680, 244, 66],
  'Wisdom of Solomon': [542, 1891, 244, 66], 'Sirach': [34, 1968, 244, 66],
  'Baruch': [542, 2410, 244, 66], 'Epistle of Jeremiah': [288, 2487, 244, 66], 'Prayer of Manasseh': [288, 2564, 244, 106], '2 Esdras': [542, 2564, 244, 106],
};
const MARKS = [
  { t: T.marks[0], books: ['1 Esdras', 'Tobit', 'Judith'] },
  { t: T.marks[1], books: ['1 Maccabees', '2 Maccabees', '3 Maccabees'] },
  { t: T.marks[2], books: ['Wisdom of Solomon', 'Sirach'] },
  { t: T.marks[3], books: ['Baruch', 'Epistle of Jeremiah', 'Prayer of Manasseh', '2 Esdras'] },
];
function tabScroll(t) {
  const sc = T.scrolls;
  let y = 0;
  y = lerp(y, 1238, E.inOut3(seg(t, sc[0], sc[0] + 0.36)));
  y = lerp(y, 1730, E.inOut3(seg(t, sc[1], sc[1] + 0.32)));
  y = lerp(y, 2250, E.inOut3(seg(t, sc[2], sc[2] + 0.32)));
  y += 24 * seg(t, sc[2] + 0.32, T.lock);
  return y;
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawTablet(g, t, morph) {
  // morph: 0 = still the page, 1 = the tablet
  const k = STRIP_PER_CSS;
  const sw = 820, sh = 1180, bez = 26, FW = sw + bez * 2, FH = sh + bez * 2;
  const enter = E.out3(morph), pushOut = E.in2(seg(t, T.lock - 0.05, T.lock + 0.3));
  const sc = lerp(1.06, 1, enter) * (1 - 0.06 * pushOut);
  g.save();
  g.translate(TAB.cx, TAB.cy + 900 * pushOut); g.scale(sc, sc); g.translate(-FW / 2, -FH / 2);
  g.globalAlpha = clamp(enter * 1.4) * (1 - pushOut);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 90; g.shadowOffsetY = 40;
  rrect(g, 0, 0, FW, FH, 54); const body = g.createLinearGradient(0, 0, FW, FH); body.addColorStop(0, '#2c2f36'); body.addColorStop(0.5, '#121418'); body.addColorStop(1, '#23262c');
  g.fillStyle = body; g.fill(); g.restore();
  rrect(g, 1.5, 1.5, FW - 3, FH - 3, 53); g.strokeStyle = 'rgba(200,214,240,0.28)'; g.lineWidth = 2.5; g.stroke();
  g.save(); rrect(g, bez, bez, sw, sh, 30); g.clip();
  g.fillStyle = '#121214'; g.fillRect(bez, bez, sw, sh);
  // the page, with a small motion blur when it scrolls
  const y0 = tabScroll(t - 1 / 240), y1 = tabScroll(t + 1 / 240), span = Math.abs(y1 - y0) * k;
  const N = clamp(Math.ceil(span / 2.5), 1, 30);
  for (let i = 0; i < N; i++) {
    const yy = N > 1 ? lerp(y0, y1, i / (N - 1)) : tabScroll(t);
    g.globalAlpha = (1 / (i + 1)) * clamp(enter * 1.4) * (1 - pushOut);
    g.drawImage(IM.tablet, 0, yy * k, 840, sh * (840 / 820), bez, bez, sw, sh);
  }
  g.globalAlpha = clamp(enter * 1.4) * (1 - pushOut);
  // rings around the books a Protestant Bible leaves out
  const ys = tabScroll(t);
  for (const m of MARKS) {
    const a = t - m.t; if (a < 0) continue;
    const pop = E.outBack(clamp(a / 0.22)), al = clamp(a / 0.1);
    for (const name of m.books) {
      const [bx, by, bw, bh] = POS[name];
      const x = bez + bx * (sw / 820), y = bez + (by - ys) * (sw / 820), w = bw * (sw / 820), h = bh * (sw / 820);
      if (y + h < bez - 40 || y > bez + sh + 40) continue;
      g.save(); g.translate(x + w / 2, y + h / 2); const ps = lerp(1.14, 1, pop); g.scale(ps, ps); g.translate(-(x + w / 2), -(y + h / 2));
      g.globalAlpha = al * clamp(enter * 1.4) * (1 - pushOut);
      rrect(g, x - 3, y - 3, w + 6, h + 6, 12); g.fillStyle = 'rgba(217,58,63,0.10)'; g.fill();
      g.shadowColor = 'rgba(217,58,63,0.75)'; g.shadowBlur = 20; g.strokeStyle = C.rubricHi; g.lineWidth = 4; g.stroke();
      g.restore();
    }
  }
  const gl = g.createLinearGradient(bez, bez, bez + sw, bez + sh * 0.6); gl.addColorStop(0, 'rgba(255,255,255,0.06)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(bez, bez, sw, sh);
  g.restore();
  g.restore();
}
function tabCam(t) {
  const sc = T.scrolls, k1 = E.inOut3(seg(t, sc[0] - 0.05, sc[0] + 0.45));
  let z = 1 + 0.3 * k1, cy = lerp(1205, 1080, k1);
  cy = lerp(cy, 880, E.inOut3(seg(t, sc[1], sc[1] + 0.34)));
  cy = lerp(cy, 920, E.inOut3(seg(t, sc[2], sc[2] + 0.34)));
  const out = E.inOut3(seg(t, T.settle, T.settle + 0.6)); z = lerp(z, 1.06, out); cy = lerp(cy, 1150, out);
  return { z, cy };
}
function sceneFix(g, t) {
  nightBg(g, 0.3);
  drawDust(g, t, 0.5);
  const m = seg(t, T.tablet - 0.04, T.tablet + 0.36);
  if (m < 1) {
    // the restored page shrinks into the tablet's screen
    const q = E.inOut3(m);
    drawPageAt(g, t, { cy: lerp(PAGE.cy + 160, TAB.cy, q), s: lerp(0.98, 0.62, q), rot: lerp(PAGE.rot, 0, q), alpha: 1 - E.in2(q) });
  }
  const cam = tabCam(t);
  g.save(); g.translate(540, cam.cy); g.scale(cam.z, cam.z); g.translate(-540, -cam.cy);
  drawTablet(g, t, m);
  g.restore();
  const tg = g.createLinearGradient(0, 0, 0, 560); tg.addColorStop(0, 'rgba(5,7,13,0.85)'); tg.addColorStop(1, 'rgba(5,7,13,0)');
  g.fillStyle = tg; g.fillRect(0, 0, W, 560);
}

// ---------------------------------------------------------------- scene 5: the lockup
function drawCross(g, x, y, h, alpha) {
  const s = h / 311;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = alpha; g.fillStyle = '#f5f3ee';
  g.fillRect(73, 0, 31, 311); g.fillRect(41, 32, 95, 32); g.fillRect(0, 96, 177, 32);
  g.beginPath(); g.moveTo(41, 197); g.lineTo(136, 245); g.lineTo(136, 280); g.lineTo(41, 232); g.closePath(); g.fill();
  g.restore();
}
function charXs(g, font, s) { g.font = font; g.letterSpacing = '0px'; const xs = []; for (let i = 0; i <= s.length; i++) xs.push(g.measureText(s.slice(0, i)).width); return xs; }
function sceneLockup(g, t) {
  nightBg(g, 0.1);
  const lt = t - T.lock;
  const rg = g.createRadialGradient(540, 930, 0, 540, 930, 900); rg.addColorStop(0, `rgba(150,170,215,${(0.12 * E.out2(seg(lt, 0, 0.5))).toFixed(3)})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  drawDust(g, t, 0.4);
  const push = 1 + 0.03 * seg(lt, 0, 2.4);
  g.save(); g.translate(540, 930); g.scale(push, push); g.translate(-540, -930);
  const crossH = 218, crossW = crossH * 177 / 311, F = SERIF(500, 156);
  g.font = F; g.letterSpacing = '0px'; const word = 'Purify', wW = g.measureText(word).width;
  const gap = 50, total = crossW + gap + 2 + gap + wW, x0 = 540 - total / 2, cy = 930;
  const cp = E.out3(seg(lt, 0, 0.26));
  g.save(); if (cp < 1) g.filter = `blur(${(16 * (1 - cp)).toFixed(1)}px)`;
  g.shadowColor = `rgba(220,230,255,${(0.5 * (1 - 0.5 * cp)).toFixed(3)})`; g.shadowBlur = 40;
  drawCross(g, x0, cy - crossH / 2, crossH, cp); g.restore();
  const dp = E.out3(seg(lt, 0.08, 0.28));
  g.fillStyle = `rgba(255,255,255,${(0.4 * dp).toFixed(3)})`; g.fillRect(x0 + crossW + gap, cy - 86 * dp, 2, 172 * dp);
  const tx = x0 + crossW + gap + 2 + gap, xs = charXs(g, F, word), m = g.measureText(word), base = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  for (let i = 0; i < word.length; i++) {
    const lp = E.out3(seg(lt, 0.12 + i * 0.05, 0.12 + i * 0.05 + 0.18)); if (lp <= 0) continue;
    g.save(); g.globalAlpha = lp; if (lp < 1) g.filter = `blur(${(10 * (1 - lp)).toFixed(1)}px)`; g.fillStyle = '#f5f3ee'; g.font = F; g.fillText(word[i], tx + xs[i], base); g.restore();
  }
  const tp = E.out3(seg(t, T.tagline, T.tagline + 0.3));
  if (tp > 0) {
    g.save(); g.globalAlpha = tp; g.font = SANS(500, 26); g.letterSpacing = '8.5px'; g.fillStyle = 'rgba(255,255,255,0.74)';
    const parts = ['APOSTOLIC', 'ORTHODOX', 'KNOWLEDGE'], sep = 34, ws = parts.map(s => g.measureText(s).width), tw = ws.reduce((a, b) => a + b, 0) + sep * 4;
    let x = 540 - tw / 2; const y = cy + 184 + (1 - tp) * 10;
    parts.forEach((s, i) => { g.fillText(s, x, y); x += ws[i]; if (i < parts.length - 1) { x += sep; g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 4, y - 21, 1.5, 26); g.fillStyle = 'rgba(255,255,255,0.74)'; x += sep; } });
    g.restore();
  }
  const fp = E.out3(seg(t, T.tagline + 0.28, T.tagline + 0.6));
  if (fp > 0) { g.save(); g.globalAlpha = fp; g.font = SANS(500, 31); g.letterSpacing = '1px'; g.fillStyle = C.rubricHi; g.textAlign = 'center'; g.fillText('Free on iOS and Android', 540, cy + 280 + (1 - fp) * 10); g.restore(); }
  g.restore();
}

// ---------------------------------------------------------------- frame
function drawWorld(g, t) {
  if (t < T.pageOut + 0.44) sceneHook(g, t);
  else if (t < T.histOut + 0.02) sceneHistory(g, t);
  else if (t < T.tablet - 0.04) sceneRestore(g, t);
  else if (t < T.lock + 0.3) sceneFix(g, t);
  if (t >= T.lock - 0.02) {
    const a = E.out2(seg(t, T.lock - 0.02, T.lock + 0.3));
    if (a >= 1) sceneLockup(g, t);
    else { g.save(); g.globalAlpha = a; sceneLockup(g, t); g.restore(); }
  }
  // the history fades in over the falling page, the page rises over the history
  if (t >= T.pageOut + 0.2 && t < T.pageOut + 0.44) { g.save(); g.globalAlpha = E.inOut2(seg(t, T.pageOut + 0.2, T.pageOut + 0.44)); sceneHistory(g, t); g.restore(); }
}
function drawTexts(g, t) { for (const b of BLOCKS) drawBlock(g, b, t); }
function chroma(amount) {
  const t2 = TMP.getContext('2d'), c2 = TMP2.getContext('2d');
  t2.globalCompositeOperation = 'copy'; t2.drawImage(cv, 0, 0); t2.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
  for (const [col, ox] of [['#ff0000', -amount], ['#00ff00', 0], ['#0000ff', amount]]) {
    c2.globalCompositeOperation = 'copy'; c2.drawImage(TMP, 0, 0);
    c2.globalCompositeOperation = 'multiply'; c2.fillStyle = col; c2.fillRect(0, 0, W, H); c2.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(TMP2, ox, 0); ctx.restore();
  }
}
function post(t, f) {
  let fl = null, fa = 0;
  for (const [ft, peak, dec, rgb] of FLASH) { const a = t - ft; if (a >= 0 && a < dec * 3) { const v = peak * Math.exp(-a / dec * 2.2); if (v > fa) { fa = v; fl = rgb; } } }
  if (fa > 0.004) { ctx.fillStyle = `rgba(${fl},${fa.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  const vg = ctx.createRadialGradient(540, 920, 380, 540, 960, 1320); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,10,0.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.1; ctx.drawImage(GRAIN[f % GRAIN.length], 0, 0, W, H); ctx.restore();
}
function renderFrame(t) {
  const f = Math.round(t * FPS);
  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.filter = 'none';
  bctx.fillStyle = '#000'; bctx.fillRect(0, 0, W, H);
  drawWorld(bctx, t);
  drawTexts(bctx, t);
  const cam = camera(t), marg = 1 + (Math.abs(cam.dx) + Math.abs(cam.dy)) / W * 2.4 + Math.abs(cam.rot) * 1.4;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2 + cam.dx, H / 2 + cam.dy); ctx.rotate(cam.rot); const s = (1 + cam.punch) * marg; ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); ctx.drawImage(BUF, 0, 0); ctx.restore();
  let ab = 0; for (const [ct, amt] of CHROMA) { const a = t - ct; if (a >= 0 && a < 0.35) ab += amt * Math.exp(-a * 14); }
  if (ab > 0.6) chroma(ab);
  post(t, f);
}
// TikTok cover: the hook in the middle, the torn page under it
const COVER_STRIP = { x: 300, y: -1180, rot: 0.26 };
function renderCover() {
  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.filter = 'none';
  nightBg(bctx); drawDust(bctx, 0.5, 0.6);
  drawPageAt(bctx, 2.5, { cy: PAGE.cy + 390, s: 0.92 }); // the page with its first hole; that strip is placed by hand below
  const tg = bctx.createLinearGradient(0, 0, 0, 1100); tg.addColorStop(0, 'rgba(5,7,13,0.92)'); tg.addColorStop(0.75, 'rgba(5,7,13,0.75)'); tg.addColorStop(1, 'rgba(5,7,13,0)');
  bctx.fillStyle = tg; bctx.fillRect(0, 0, W, 1100);
  // Tobit and Judith, torn out and flying, clear of the headline
  bctx.save(); bctx.globalAlpha = 0.9; bctx.translate(540, PAGE.cy + 390); bctx.rotate(PAGE.rot); bctx.scale(0.92, 0.92); bctx.translate(-PW / 2, -PH / 2);
  drawStrip(bctx, BANDS[0], { x: COVER_STRIP.x, y: COVER_STRIP.y, rot: COVER_STRIP.rot, s: 1, lift: 1 });
  bctx.restore();
  bctx.save(); bctx.textAlign = 'center'; bctx.shadowColor = 'rgba(0,0,0,0.7)'; bctx.shadowBlur = 36;
  bctx.font = SANS(800, 118); const w = bctx.measureText('YOUR BIBLE IS').width, sc = Math.min(1, 900 / w); bctx.font = SANS(800, 118 * sc);
  bctx.fillStyle = C.white; bctx.fillText('YOUR BIBLE IS', 540, 770);
  const a = bctx.measureText('MISSING ').width, b = bctx.measureText('BOOKS.').width, x = 540 - (a + b) / 2;
  bctx.textAlign = 'left'; bctx.fillStyle = C.rubricHi; bctx.fillText('MISSING', x, 770 + 124 * sc); bctx.fillStyle = C.white; bctx.fillText('BOOKS.', x + a, 770 + 124 * sc);
  bctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(BUF, 0, 0);
  post(0.5, 0);
}
window.renderFrame = renderFrame;
window.renderCover = renderCover;
loadAll().then(() => { renderFrame(0); window.READY = true; }).catch(e => { window.LOAD_ERROR = String(e && e.message || e); });
