'use strict';
// Purify AD1, EDIT-GOLD. Every frame is a pure function of t (seconds).
// Timing is measured from the owner's audio: beat grid 92 BPM from just_the_beat.mp3,
// word onsets from the AD_1 voiceover.

const W = 1080, H = 1920, FPS = 30;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const BUF = mk(), TMP = mk(), TMP2 = mk();
const bctx = BUF.getContext('2d');

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
  outBack: t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- timing (measured)
const B0 = 0.138, BP = 0.6523;              // first downbeat, seconds per beat (92 BPM)
const bt = k => B0 + BP * k;
const T = {
  snuff: bt(2),                                   // 1.443 snare, VO gap: the candle goes out
  cuts: [bt(2.5), bt(3), bt(4), bt(4.5), bt(5.25), bt(5.5)], // montage cuts on kicks and snares
  hidden: bt(6),                                  // 4.052 snare
  ticks: [bt(6.5), bt(6.5) + BP / 6, bt(6.5) + BP / 3, bt(7)], // triplet hat roll into the drop
  drop: bt(7),                                    // 4.704 the drop
  portico: bt(8),                                 // 5.356 snare
  slam: bt(10),                                   // 6.661 snare, VO gap: the gates shut
  kicksGate: [bt(10.5), bt(11), bt(12)],          // light pulses through the seam
  crack: bt(12.5),                                // 8.292 kick on "break"
  swing: bt(13.25),                               // 8.781 kick on "gates"
  burst: bt(13.5),                                // 8.944 kick: the gates blow open
  white: bt(14),                                  // 9.270 snare, whiteout
  reveal: bt(14.5),                               // 9.596 kick
  phone: bt(15),                                  // 9.923 kick + lead scoop, "complete"
  scroll: [bt(16), bt(16.5), bt(17.25), bt(17.5)],// 10.575 10.901 11.390 11.553
  push: bt(18),                                   // 11.880 snare
  lock: bt(18.5),                                 // 12.206 kick
  lastKick: bt(19),                               // 12.532
};
const WD = { // acoustic word onsets in AD_1
  christianity: 0.125, is: 0.78, dying: 0.98,
  two: 1.86, years: 2.33, of: 2.60, holy: 2.80, orthodox1: 3.18, tradition: 3.68,
  being: 4.16, hidden: 4.42, and: 4.77, ignored: 4.96, by: 5.46, western: 5.60, colleges: 6.08,
  we: 7.20, built: 7.38, purify1: 7.62, to: 8.12, brk: 8.27, those: 8.55, gates: 8.76, open: 9.02,
  the: 9.87, complete: 9.95, orthodox2: 10.42, history: 10.98, out: 11.40, on: 11.62, purify2: 11.80,
};
const LEAD = 0.05;

// camera hits: [time, strength]
const HITS = [
  [0.138, 0.45], [0.953, 0.28], [1.116, 0.3], [T.snuff, 0.5],
  [T.cuts[0], 0.45], [T.cuts[1], 0.3], [T.cuts[2], 0.55], [T.cuts[3], 0.3], [T.cuts[4], 0.32], [T.cuts[5], 0.32],
  [T.hidden, 0.5], [T.ticks[0], 0.24], [T.ticks[1], 0.24], [T.ticks[2], 0.24], [T.drop, 1.0], [WD.ignored, 0.6],
  [T.portico, 0.5], [bt(8.5), 0.55], [bt(9.5), 0.4], [T.slam, 1.0], [T.kicksGate[0], 0.3], [T.kicksGate[1], 0.36], [T.kicksGate[2], 0.4],
  [T.crack, 0.9], [T.swing, 0.75], [T.burst, 1.0], [T.white, 0.35], [T.reveal, 0.4], [T.phone, 0.45],
  [T.scroll[0], 0.2], [T.scroll[1], 0.26], [T.scroll[2], 0.2], [T.scroll[3], 0.2], [T.push, 0.28], [T.lock, 0.45], [T.lastKick, 0.18],
];
function camera(t) {
  let dx = 0, dy = 0, rot = 0, punch = 0;
  for (let i = 0; i < HITS.length; i++) {
    const [ht, s] = HITS[i];
    const a = t - ht;
    if (a < 0 || a > 0.5) continue;
    const env = Math.exp(-a * 11);
    const amp = s * 24 * env;
    dx += amp * Math.sin(a * 2 * Math.PI * 13 + i * 1.7);
    dy += amp * Math.cos(a * 2 * Math.PI * 11 + i * 2.3) * 0.8;
    rot += s * 0.009 * env * Math.sin(a * 2 * Math.PI * 9 + i);
    punch += s * 0.05 * Math.exp(-a * 9);
  }
  return { dx, dy, rot, punch };
}
// flashes: [time, peak, decay seconds, rgb]
const FLASH = [
  [T.cuts[0], 0.42, 0.22, '255,214,150'],
  [T.cuts[2], 0.26, 0.18, '255,214,150'],
  [T.hidden, 0.22, 0.12, '205,222,255'],
  [T.drop, 0.9, 0.16, '255,255,255'],
  [T.portico, 0.16, 0.12, '205,222,255'],
  [T.slam, 0.2, 0.12, '255,205,150'],
  [T.crack, 0.38, 0.16, '255,222,170'],
  [T.burst, 0.8, 0.32, '255,238,205'],
  [T.lock, 0.28, 0.22, '255,255,255'],
];
const CHROMA = [[0.953, 3], [1.116, 3.5], [T.snuff, 4], [T.hidden, 3], [T.drop, 10], [WD.ignored - LEAD, 8], [T.slam, 4], [T.crack, 4], [T.burst, 6], [T.lock, 2.5]];
const GLITCH = [[0.953, 0.07, 0.35], [1.116, 0.07, 0.4], [T.snuff, 0.1, 0.45], [T.hidden, 0.07, 0.4], [T.drop, 0.13, 0.9], [WD.ignored - LEAD, 0.08, 0.6], [T.slam, 0.06, 0.3]];

// ---------------------------------------------------------------- assets
const IM = {};
const IMG_LIST = ['A_chrysostom', 'B_archangel', 'C_trinity', 'D_triumph', 'E_deesis', 'F_dormition',
  'chrysostom_cold', 'pantocrator_gold', 'pantocrator_bg'];
const GRAIN = [];
async function loadAll() {
  const fontList = [
    ['Inter', 'fonts/Inter-Medium.otf', { weight: '500' }],
    ['Inter', 'fonts/Inter-SemiBold.otf', { weight: '600' }],
    ['Inter', 'fonts/Inter-Bold.otf', { weight: '700' }],
    ['Inter', 'fonts/Inter-ExtraBold.otf', { weight: '800' }],
    ['Inter', 'fonts/Inter-Black.otf', { weight: '900' }],
    ['Lora', 'fonts/lora-normal.woff2', { weight: '400 700', style: 'normal' }],
    ['Lora', 'fonts/lora-italic.woff2', { weight: '400 700', style: 'italic' }],
  ];
  await Promise.all(fontList.map(async ([fam, url, desc]) => { const f = new FontFace(fam, `url(${url})`, desc); await f.load(); document.fonts.add(f); }));
  const load = (name, src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { IM[name] = im; res(); }; im.onerror = rej; im.src = src; });
  await Promise.all([
    ...IMG_LIST.map(n => load(n, `assets/${n}.jpg`)),
    load('strip', 'assets/history_strip.png'),
    load('cross', 'assets/cross-mark.png'),
  ]);
  for (let k = 0; k < 6; k++) {
    const c = mk(540, 960), g = c.getContext('2d');
    const id = g.createImageData(540, 960); const R = rng(91 + k);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + ((R() + R() + R() - 1.5) * 95);
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0); GRAIN.push(c);
  }
}

// ---------------------------------------------------------------- shared drawing
function fillBg(g, top, bottom) {
  const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, top); lg.addColorStop(1, bottom);
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
}
function radial(g, x, y, r, stops) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) rg.addColorStop(o, c);
  g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
}
// ambient dust: fixed particles drifting upward
const DUST = (() => { const R = rng(7); const a = []; for (let i = 0; i < 90; i++) a.push({ x: R() * W, y: R() * H, s: 1.2 + R() * 2.8, v: 12 + R() * 34, ph: R() * 10, a: 0.25 + R() * 0.6 }); return a; })();
function drawDust(g, t, rgb, amount = 1, region = null) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const p of DUST) {
    const y = ((p.y - t * p.v) % H + H) % H;
    const x = p.x + 14 * Math.sin(t * 0.6 + p.ph);
    let a = p.a * amount * (0.6 + 0.4 * Math.sin(t * 2.3 + p.ph * 3));
    if (region) { const d = Math.hypot(x - region[0], y - region[1]); a *= clamp(1.25 - d / region[2]); }
    if (a < 0.01) continue;
    g.fillStyle = `rgba(${rgb},${(a * 0.55).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, p.s, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- text system
const SANS = (w, s) => `${w} ${s}px Inter`;
const SERIF = (w, s, it = false) => `${it ? 'italic ' : ''}${w} ${s}px Lora`;
const WHITE = '#f5f5f7', CREAM = '#f3ead3', GOLD = '#dfb969';
function blk(spec) { return spec; }
const BLOCKS = [
  blk({ id: 'hook', y: 430, lh: 116, fit: 880, lines: [
    [{ s: 'CHRISTIANITY', t: WD.christianity, st: { font: SANS(800, 110), color: WHITE } }],
    [{ s: 'IS', t: WD.is, st: { font: SANS(800, 110), color: WHITE } }, { s: 'DYING.', t: WD.dying, st: { font: SANS(800, 110), color: WHITE }, fx: 'dying' }],
  ], exit: 'decay', out: T.snuff, outEnd: 1.74 }),
  blk({ id: 'two', y: 650, lh: 90, lines: [
    [{ s: '2,000', t: WD.two, dur: 0.26, st: { font: SERIF(600, 250), color: '#f2e4c1', glow: 'rgba(255,200,120,0.55)', ls: -4 }, fx: 'big' }],
    [{ s: 'YEARS', t: WD.years, st: { font: SANS(600, 42), color: '#e6c47c', ls: 16, shadow: true } }],
  ], out: 2.56, outDur: 0.12 }),
  blk({ id: 'trad', y: 440, lh: 106, lines: [
    [{ s: 'of', t: WD.of, st: { font: SERIF(600, 94), color: CREAM } }, { s: 'holy', t: WD.holy, st: { font: SERIF(600, 94), color: CREAM } }, { s: 'Orthodox', t: WD.orthodox1, st: { font: SERIF(600, 94), color: GOLD } }],
    [{ s: 'tradition.', t: WD.tradition, st: { font: SERIF(600, 94), color: CREAM } }],
  ], out: T.hidden - 0.02, outDur: 0.1 }),
  blk({ id: 'hidden', y: 430, lh: 110, fit: 880, lines: [
    [{ s: 'BEING', t: WD.being, st: { font: SANS(800, 104), color: WHITE } }, { s: 'HIDDEN', t: WD.hidden, st: { font: SANS(800, 104), color: WHITE } }],
  ], exit: 'glitch', out: T.drop, outDur: 0.1 }),
  blk({ id: 'ignored', y: 370, lh: 150, fit: 900, lines: [
    [{ s: 'AND', t: WD.and, st: { font: SANS(800, 78), color: 'rgba(245,245,247,0.86)' } }],
    [{ s: 'IGNORED.', t: WD.ignored, st: { font: SANS(900, 150), color: WHITE }, fx: 'slam' }],
  ], out: T.portico - 0.02, outDur: 0.08 }),
  blk({ id: 'western', y: 410, lh: 114, fit: 880, lines: [
    [{ s: 'BY', t: WD.by, st: { font: SANS(800, 104), color: WHITE } }, { s: 'WESTERN', t: WD.western, st: { font: SANS(800, 104), color: WHITE } }],
    [{ s: 'COLLEGES.', t: WD.colleges, st: { font: SANS(800, 104), color: WHITE } }],
  ], exit: 'glitch', out: T.slam - 0.01, outDur: 0.08 }),
  blk({ id: 'built', y: 420, lh: 124, lines: [
    [{ s: 'We', t: WD.we, st: { font: SERIF(600, 98), color: CREAM } }, { s: 'built', t: WD.built, st: { font: SERIF(600, 98), color: CREAM } }],
    [{ s: 'Purify', t: WD.purify1, st: { font: SERIF(600, 124, true), color: GOLD, glow: 'rgba(255,196,110,0.45)' } }],
  ], out: 8.07, outDur: 0.12 }),
  blk({ id: 'break', y: 420, lh: 112, lines: [
    [{ s: 'to', t: WD.to, st: { font: SERIF(600, 96), color: CREAM } }, { s: 'break', t: WD.brk, st: { font: SERIF(600, 96), color: CREAM } }, { s: 'those', t: WD.those, st: { font: SERIF(600, 96), color: CREAM } }],
    [{ s: 'gates', t: WD.gates, st: { font: SERIF(600, 96), color: CREAM } }, { s: 'open.', t: WD.open, st: { font: SERIF(600, 96, true), color: GOLD, glow: 'rgba(255,200,120,0.5)' } }],
  ], out: 9.33, outDur: 0.1 }),
  blk({ id: 'history', y: 338, lh: 102, lines: [
    [{ s: 'The', t: WD.the, st: { font: SERIF(600, 88), color: CREAM } }, { s: 'complete', t: WD.complete, st: { font: SERIF(600, 88), color: CREAM } }],
    [{ s: 'Orthodox', t: WD.orthodox2, st: { font: SERIF(600, 88), color: GOLD } }, { s: 'history', t: WD.history, st: { font: SERIF(600, 88), color: GOLD } }],
  ], out: 11.35, outDur: 0.1 }),
  blk({ id: 'outon', y: 400, lh: 100, lines: [
    [{ s: 'out', t: WD.out, st: { font: SERIF(600, 96), color: CREAM } }, { s: 'on', t: WD.on, st: { font: SERIF(600, 96), color: CREAM } }, { s: 'Purify.', t: WD.purify2, st: { font: SERIF(600, 108, true), color: GOLD, glow: 'rgba(255,196,110,0.5)' } }],
  ], out: T.lock - 0.01, outDur: 0.05 }),
];
function setFont(g, st) { g.font = st.font; g.letterSpacing = (st.ls || 0) + 'px'; }
function layout(g, b) {
  if (b._lay) return b._lay;
  // optional fit: scale every font in the block so the widest line fits
  let scale = 1;
  const measureLine = (line, sc) => {
    let total = 0; const out = [];
    line.forEach((w, i) => {
      const st = scaled(w.st, sc); setFont(g, st);
      const width = g.measureText(w.s).width;
      const sp = i < line.length - 1 ? g.measureText(' ').width * 1.02 : 0;
      out.push({ w, st, x: total, width }); total += width + sp;
    });
    return { total, out };
  };
  if (b.fit) { const widest = Math.max(...b.lines.map(l => measureLine(l, 1).total)); if (widest > b.fit) scale = b.fit / widest; }
  const lay = [];
  b.lines.forEach((line, li) => {
    const { total, out } = measureLine(line, scale);
    const x0 = W / 2 - total / 2;
    out.forEach(o => lay.push({ ...o, X: x0 + o.x, Y: b.y + li * b.lh * scale, li }));
  });
  g.letterSpacing = '0px';
  b._lay = lay; return lay;
}
function scaled(st, sc) {
  if (sc === 1) return st;
  const m = st.font.match(/(\d+(?:\.\d+)?)px/);
  return { ...st, font: st.font.replace(m[0], (parseFloat(m[1]) * sc).toFixed(1) + 'px'), ls: (st.ls || 0) * sc };
}
function charXs(g, st, s) { setFont(g, st); const xs = []; for (let i = 0; i <= s.length; i++) xs.push(g.measureText(s.slice(0, i)).width); return xs; }

function drawBlock(g, b, t) {
  if (t < b.lines[0][0].t - LEAD - 0.01) return;
  const end = b.exit === 'decay' ? b.outEnd : (b.out + (b.outDur || 0.14));
  if (t > end + 0.02) return;
  const lay = layout(g, b);
  for (const o of lay) drawWord(g, o, t, b);
}
function drawWord(g, o, t, b) {
  const w = o.w, st = o.st;
  const t0 = w.t - LEAD;
  const dur = w.dur || 0.22;
  let p = E.out3(seg(t, t0, t0 + dur));
  if (p <= 0) return;
  let alpha = p, blur = (1 - p) * 15, dy = (1 - p) * 16, sc = 1 + (1 - p) * 0.06;
  if (w.fx === 'slam') { const q = seg(t, t0, t0 + 0.11); alpha = clamp(q * 3); blur = (1 - q) * 4; dy = 0; sc = lerp(1.55, 1, E.outExpo(q)); }
  if (w.fx === 'big') { sc = 1 + (1 - p) * 0.16; blur = (1 - p) * 22; dy = 0; }
  let letterAlpha = null;
  if (b.exit === 'decay' && t >= b.out) {
    // the hook dies letter by letter after the candle goes out
    const R = rng(1000 + o.li * 50 + Math.round(o.X));
    const n = w.s.length; letterAlpha = [];
    const f = Math.round(t * FPS);
    for (let i = 0; i < n; i++) {
      const td = b.out + 0.03 + R() * (b.outEnd - b.out - 0.05);
      const r2 = hash(f * 13.1 + i * 7.7 + o.X);
      if (t >= td) letterAlpha.push(0);
      else { const near = seg(t, td - 0.16, td); letterAlpha.push(r2 < near * 0.75 ? 0.12 : 1); }
    }
  } else if (b.out !== undefined && t >= b.out) {
    const q = E.in2(seg(t, b.out, b.out + (b.outDur || 0.14)));
    if (b.exit === 'glitch') { alpha *= 1 - q; dy += (hash(Math.round(t * FPS) * 3.3 + o.X) - 0.5) * 40 * q; }
    else { alpha *= 1 - q; blur += q * 16; dy -= q * 18; }
  }
  if (w.fx === 'dying' && t < b.out) {
    // gutters with the flame
    const k = seg(t, 1.15, b.out);
    alpha *= 1 - 0.35 * k * (0.5 + 0.5 * noise1(t * 30));
  }
  if (alpha <= 0.003) return;
  g.save();
  g.globalAlpha = alpha;
  setFont(g, st);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (blur > 0.35) g.filter = `blur(${blur.toFixed(1)}px)`;
  const cx = o.X + o.width / 2, cy = o.Y - 30;
  g.translate(cx, cy + dy); g.scale(sc, sc); g.translate(-cx, -cy);
  if (st.shadow !== false) { g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.shadowOffsetY = 4; }
  g.fillStyle = st.color;
  if (letterAlpha) {
    const xs = charXs(g, st, w.s);
    for (let i = 0; i < w.s.length; i++) { if (letterAlpha[i] <= 0) continue; g.globalAlpha = alpha * letterAlpha[i]; g.fillText(w.s[i], o.X + xs[i], o.Y); }
  } else {
    g.fillText(w.s, o.X, o.Y);
    if (st.glow) { g.shadowColor = st.glow; g.shadowBlur = 36; g.shadowOffsetY = 0; g.globalAlpha = alpha * 0.55; g.fillText(w.s, o.X, o.Y); }
  }
  g.restore();
}

// ---------------------------------------------------------------- scene 1: the candle
function flameI(t) {
  if (t >= T.snuff) return 0;
  let base = 1;
  if (t > WD.dying) base = lerp(1, 0.3, E.in2(seg(t, WD.dying, T.snuff)));
  for (const k of [0.953, 1.116]) { const a = t - k; if (a >= 0 && a < 0.3) base *= 1 - 0.38 * Math.exp(-a * 13); }
  const fl = 0.06 * noise1(t * 9) + 0.04 * noise1(t * 23 + 5);
  const gut = t > WD.dying ? 0.22 * seg(t, WD.dying, T.snuff) * noise1(t * 31 + 9) : 0;
  return clamp(base * (1 + fl + gut), 0, 1.2);
}
function drawCandle(g, cx, top, I) {
  const w = 50, lit = 0.3 + 0.7 * I;
  const lg = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  lg.addColorStop(0, 'rgb(46,29,12)');
  lg.addColorStop(0.33, `rgb(${Math.round(130 + 95 * lit)},${Math.round(92 + 80 * lit)},${Math.round(44 + 48 * lit)})`);
  lg.addColorStop(0.62, `rgb(${Math.round(104 + 70 * lit)},${Math.round(72 + 56 * lit)},${Math.round(32 + 34 * lit)})`);
  lg.addColorStop(1, 'rgb(30,19,8)');
  g.fillStyle = lg; g.fillRect(cx - w / 2, top, w, H - top + 60);
  const vg = g.createLinearGradient(0, top, 0, H); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.55, 'rgba(0,0,0,0.45)'); vg.addColorStop(1, 'rgba(0,0,0,0.85)');
  g.fillStyle = vg; g.fillRect(cx - w / 2, top, w, H - top);
  const tg = g.createLinearGradient(0, top, 0, top + 150); tg.addColorStop(0, `rgba(255,196,120,${0.5 * I})`); tg.addColorStop(1, 'rgba(255,196,120,0)');
  g.fillStyle = tg; g.fillRect(cx - w / 2, top, w, 150);
  g.fillStyle = `rgba(255,214,150,${0.18 + 0.55 * I})`; g.beginPath(); g.ellipse(cx, top, w / 2, 7, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#120b05'; g.lineWidth = 3.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, top + 2); g.quadraticCurveTo(cx + 1, top - 12, cx + 3, top - 23); g.stroke();
}
function drawFlame(g, x, y, I, t) {
  const h = 158 * (0.5 + 0.5 * I) * (1 + 0.05 * noise1(t * 14));
  const wv = 24 * (0.78 + 0.22 * I);
  const sway = 6 * noise1(t * 2.5 + 3) + 3.5 * noise1(t * 8);
  g.save(); g.globalCompositeOperation = 'lighter';
  radial(g, x, y - h * 0.45, 300 * (0.55 + 0.45 * I), [[0, `rgba(255,190,110,${0.5 * I})`], [0.3, `rgba(255,140,60,${0.14 * I})`], [1, 'rgba(255,120,40,0)']]);
  const tipX = x + sway, tipY = y - h;
  const p = new Path2D();
  p.moveTo(x, y + 9);
  p.bezierCurveTo(x - wv * 1.3, y - h * 0.05, x - wv * 0.9, y - h * 0.55, tipX, tipY);
  p.bezierCurveTo(x + wv * 0.9, y - h * 0.55, x + wv * 1.3, y - h * 0.05, x, y + 9);
  const fg = g.createLinearGradient(0, y + 9, 0, tipY);
  fg.addColorStop(0, `rgba(80,115,255,${0.6 * I})`); fg.addColorStop(0.13, `rgba(255,150,60,${0.85 * I})`);
  fg.addColorStop(0.5, `rgba(255,192,96,${0.92 * I})`); fg.addColorStop(1, 'rgba(255,120,40,0)');
  g.filter = 'blur(2px)'; g.fillStyle = fg; g.fill(p);
  const ch = h * 0.55, cw = wv * 0.55, c = new Path2D();
  c.moveTo(x, y + 3);
  c.bezierCurveTo(x - cw * 1.2, y - ch * 0.1, x - cw * 0.7, y - ch * 0.6, x + sway * 0.5, y - ch);
  c.bezierCurveTo(x + cw * 0.7, y - ch * 0.6, x + cw * 1.2, y - ch * 0.1, x, y + 3);
  const cg = g.createLinearGradient(0, y, 0, y - ch);
  cg.addColorStop(0, `rgba(255,255,240,${0.6 * I})`); cg.addColorStop(0.4, `rgba(255,250,222,${0.95 * I})`); cg.addColorStop(1, 'rgba(255,220,150,0)');
  g.filter = 'blur(1.4px)'; g.fillStyle = cg; g.fill(c);
  g.restore();
}
function drawSmoke(g, x, y, age) {
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 80; i++) {
    const tb = i * 0.011, a = age - tb;
    if (a <= 0 || a > 2.2) continue;
    const k = a / 2.2;
    const px = x + 16 * Math.sin(a * 2.4 + i * 0.17) * k * 2 + 26 * noise1(i * 0.21 + a * 0.9) * k;
    const py = y - a * 230 - a * a * 30;
    const r = 5 + 56 * k;
    const al = 0.26 * (1 - k) * Math.min(1, a * 10) * Math.exp(-tb * 1.1);
    radial(g, px, py, r, [[0, `rgba(190,198,218,${al.toFixed(3)})`], [1, 'rgba(190,198,218,0)']]);
  }
  g.restore();
}
function sceneCandle(g, t) {
  const I = flameI(t);
  fillBg(g, '#02040a', '#060a15');
  const fx = 540 + 3 * noise1(t * 3), fy = 1192, top = 1212; // scaled 1.42 about the flame base
  if (I > 0.001) radial(g, fx, fy - 60, 1000 * (0.7 + 0.3 * I), [[0, `rgba(255,168,82,${0.36 * I})`], [0.22, `rgba(196,112,52,${0.16 * I})`], [0.6, `rgba(40,42,74,${0.07 * I})`], [1, 'rgba(0,0,0,0)']]);
  drawDust(g, t, '255,206,150', 0.7, [fx, fy - 100, 700 * (0.4 + 0.6 * I)]);
  g.save(); g.translate(540, fy); g.scale(1.42, 1.42); g.translate(-540, -fy);
  drawCandle(g, 540, top, I);
  if (I > 0.001) drawFlame(g, fx, fy, I, t);
  if (t >= T.snuff) {
    const emb = Math.exp(-(t - T.snuff) * 2.4);
    radial(g, 543, 1189, 18, [[0, `rgba(255,120,40,${(0.95 * emb).toFixed(3)})`], [1, 'rgba(255,80,20,0)']]);
    drawSmoke(g, 543, 1186, t - T.snuff);
  }
  g.restore();
}

// ---------------------------------------------------------------- scene 2: gold montage
const MONT = [
  { img: 'A_chrysostom', t: T.cuts[0], d: -1 },
  { img: 'B_archangel', t: T.cuts[1], d: 1 },
  { img: 'C_trinity', t: T.cuts[2], d: -1 },
  { img: 'D_triumph', t: T.cuts[3], d: 1 },
  { img: 'E_deesis', t: T.cuts[4], d: -1 },
  { img: 'F_dormition', t: T.cuts[5], d: 1 },
];
function drawCover(g, img, s, ox, oy, blur) {
  const k = (W / img.width) * s, dw = img.width * k, dh = img.height * k;
  const mx = (dw - W) / 2, my = (dh - H) / 2;
  g.save(); if (blur > 0.35) g.filter = `blur(${blur.toFixed(1)}px)`;
  g.drawImage(img, W / 2 - dw / 2 + clamp(ox, -mx, mx), H / 2 - dh / 2 + clamp(oy, -my, my), dw, dh);
  g.restore();
}
function sceneMontage(g, t) {
  let i = 0; for (let j = 0; j < MONT.length; j++) if (t >= MONT[j].t) i = j;
  const m = MONT[i], end = MONT[i + 1] ? MONT[i + 1].t : T.hidden, lt = t - m.t, dur = Math.max(end - m.t, 0.3);
  const ent = E.out3(seg(lt, 0, 0.16));
  const s = 1.035 + 0.05 * (lt / dur) + 0.1 * (1 - ent);
  drawCover(g, IM[m.img], s, m.d * 16 * (lt / dur), 30, 10 * (1 - E.out2(seg(lt, 0, 0.12))));
  g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, W, H);
  const tg = g.createLinearGradient(0, 0, 0, 1300); tg.addColorStop(0, 'rgba(0,0,0,0.8)'); tg.addColorStop(0.5, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = tg; g.fillRect(0, 0, W, 1300);
  if (t < 2.7) radial(g, 540, 620, 620, [[0, 'rgba(0,0,0,0.42)'], [1, 'rgba(0,0,0,0)']]);
  const bg = g.createLinearGradient(0, 1250, 0, H); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = bg; g.fillRect(0, 1250, W, H - 1250);
  drawDust(g, t, '255,214,160', 0.8);
}

// ---------------------------------------------------------------- scene 3: hidden, ignored
// redaction bars on the Chrysostom mosaic, in source pixels of the 1200x1080 original
const BARS = [
  [T.ticks[0], 222, 394, 136, 694, 'v'],   // his first name, IOANNES
  [T.ticks[1], 806, 1024, 122, 712, 'v'],  // CHRYSOSTOMOS
  [T.ticks[2], 626, 846, 284, 476, 'h'],   // the book he holds
];
const PANEL = { cx: 540, cy: 1110, w: 920, h: 828 };
function drawMosaicPanel(g, t, s, dim) {
  const img = IM.chrysostom_cold;
  const w = PANEL.w * s, h = PANEL.h * s, x = PANEL.cx - w / 2, y = PANEL.cy - h / 2;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 70; g.shadowOffsetY = 24; g.fillStyle = '#000'; g.fillRect(x, y, w, h); g.restore();
  g.drawImage(img, x, y, w, h);
  const k = w / 1200;
  for (const [tb, x0, x1, y0, y1, dir] of BARS) {
    if (t < tb) continue;
    const p = E.out3(seg(t, tb, tb + 0.065));
    const jit = (1 - p) * 10;
    g.fillStyle = 'rgba(2,3,6,0.97)';
    if (dir === 'v') g.fillRect(x + x0 * k + jit, y + y0 * k, (x1 - x0) * k, (y1 - y0) * k * p);
    else g.fillRect(x + x0 * k, y + y0 * k + jit, (x1 - x0) * k * p, (y1 - y0) * k);
  }
  g.strokeStyle = 'rgba(190,206,232,0.22)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  if (dim > 0) { g.fillStyle = `rgba(1,2,5,${dim})`; g.fillRect(x - 2, y - 2, w + 4, h + 4); }
  return { x, y, w, h };
}
function sceneHidden(g, t) {
  fillBg(g, '#02040a', '#0a1322');
  radial(g, 540, 1100, 900, [[0, 'rgba(70,95,140,0.22)'], [1, 'rgba(0,0,0,0)']]);
  const lt = t - T.hidden, ent = E.out3(seg(lt, 0, 0.18));
  const s = 1 + 0.1 * (1 - ent) + 0.035 * seg(lt, 0, 0.65);
  g.save(); const bl = 8 * (1 - ent); if (bl > 0.35) g.filter = `blur(${bl.toFixed(1)}px)`;
  const r = drawMosaicPanel(g, t, s, 0);
  g.restore();
  g.save(); g.font = SANS(500, 22); g.letterSpacing = '7px'; g.fillStyle = 'rgba(200,214,236,0.62)'; g.textAlign = 'center';
  g.globalAlpha = E.out2(seg(lt, 0.08, 0.3)); g.fillText('ST JOHN CHRYSOSTOM  ·  HAGIA SOPHIA', 540, r.y + r.h + 64); g.restore();
  drawDust(g, t, '180,200,235', 0.6);
}
function sceneIgnored(g, t) {
  fillBg(g, '#010205', '#05080f');
  const lt = t - T.drop;
  const s = 0.97 - 0.02 * seg(lt, 0, 0.65);
  const r = drawMosaicPanel(g, t, s, 0.0);
  // the drop blacks the whole picture out
  const k = E.out4(seg(lt, 0, 0.05));
  g.fillStyle = `rgba(1,2,4,${(0.9 * k).toFixed(3)})`; g.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  radial(g, 540, r.y, 700, [[0, 'rgba(120,150,200,0.10)'], [1, 'rgba(0,0,0,0)']]);
  g.strokeStyle = 'rgba(190,206,232,0.16)'; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  drawDust(g, t, '170,190,230', 0.5);
}

// ---------------------------------------------------------------- scene 3c: the portico
function scenePortico(g, t) {
  fillBg(g, '#02050b', '#0a1322');
  radial(g, 540, 760, 1250, [[0, 'rgba(110,140,205,0.22)'], [0.5, 'rgba(40,60,100,0.08)'], [1, 'rgba(0,0,0,0)']]);
  const lt = t - T.portico, ent = E.out3(seg(lt, 0, 0.2));
  const s = 1.1 + 0.08 * (1 - ent) + 0.07 * E.inOut3(seg(lt, 0, 1.3));
  g.save();
  g.translate(540, 1240); g.scale(s, s); g.translate(-540, -1240);
  if (ent < 1) g.filter = `blur(${(7 * (1 - ent)).toFixed(1)}px)`;
  const stone = (y0, y1, a = '#33435f', b = '#131b2b') => { const lg = g.createLinearGradient(0, y0, 0, y1); lg.addColorStop(0, a); lg.addColorStop(1, b); return lg; };
  const edge = 'rgba(176,198,234,0.6)';
  // the dark porch behind the columns, so they stand off it
  const wall = g.createLinearGradient(0, 1030, 0, 1500); wall.addColorStop(0, '#03060c'); wall.addColorStop(1, '#0a111e');
  g.fillStyle = wall; g.fillRect(140, 1030, 800, 470);
  // pediment with a medallion
  g.beginPath(); g.moveTo(112, 948); g.lineTo(540, 776); g.lineTo(968, 948); g.closePath(); g.fillStyle = stone(776, 948, '#3a4c6c', '#1a2438'); g.fill();
  g.strokeStyle = edge; g.lineWidth = 3; g.stroke();
  g.beginPath(); g.moveTo(176, 930); g.lineTo(540, 804); g.lineTo(904, 930); g.closePath(); g.fillStyle = 'rgba(4,8,15,0.6)'; g.fill();
  g.strokeStyle = 'rgba(176,198,234,0.28)'; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.arc(540, 884, 30, 0, Math.PI * 2); g.strokeStyle = 'rgba(176,198,234,0.45)'; g.lineWidth = 3; g.stroke();
  g.beginPath(); g.arc(540, 884, 18, 0, Math.PI * 2); g.fillStyle = 'rgba(176,198,234,0.12)'; g.fill();
  // cornice, frieze with its inscription, architrave
  g.fillStyle = stone(948, 974); g.fillRect(96, 948, 888, 26); g.strokeStyle = edge; g.lineWidth = 2; g.strokeRect(96, 948, 888, 26);
  g.fillStyle = stone(974, 1040, '#2b3a56', '#162034'); g.fillRect(128, 974, 824, 66); g.strokeStyle = 'rgba(176,198,234,0.32)'; g.strokeRect(128, 974, 824, 66);
  g.save(); g.font = SERIF(600, 40); g.letterSpacing = '24px'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText('COLLEGIVM', 552, 1023);
  g.fillStyle = 'rgba(208,220,242,0.86)'; g.fillText('COLLEGIVM', 552, 1021); g.restore();
  g.fillStyle = stone(1040, 1058, '#2a3854', '#18223a'); g.fillRect(140, 1040, 800, 18);
  // columns, shaded as cylinders, lit from the left
  const cols = [208, 334, 454, 626, 746, 872];
  for (const cx of cols) {
    const sh = g.createLinearGradient(cx - 32, 0, cx + 32, 0);
    sh.addColorStop(0, '#0d1422'); sh.addColorStop(0.18, '#3e5378'); sh.addColorStop(0.32, '#5a719c'); sh.addColorStop(0.55, '#2c3b5a'); sh.addColorStop(0.85, '#131b2d'); sh.addColorStop(1, '#0a0f1a');
    g.fillStyle = stone(1058, 1086, '#3a4c6c', '#1d283e'); g.fillRect(cx - 46, 1058, 92, 16); g.fillRect(cx - 38, 1074, 76, 12);
    g.fillStyle = sh; g.fillRect(cx - 31, 1086, 62, 400);
    for (const fx of [-20, -10, 0, 10, 20]) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(cx + fx - 1, 1090, 2, 392); }
    g.fillStyle = stone(1486, 1514, '#2e3d5a', '#151e30'); g.fillRect(cx - 40, 1486, 80, 14); g.fillRect(cx - 47, 1500, 94, 14);
  }
  // the doors, shut, a line of warm light at the seam
  g.fillStyle = '#04070d'; g.fillRect(500, 1196, 80, 290);
  g.strokeStyle = 'rgba(176,198,234,0.3)'; g.lineWidth = 2; g.strokeRect(500, 1196, 80, 290);
  const seam = 0.3 + 0.55 * (t >= bt(9.5) ? Math.exp(-(t - bt(9.5)) * 6) : 0) + 0.2 * seg(t, T.portico, T.slam);
  g.save(); g.globalCompositeOperation = 'lighter';
  radial(g, 540, 1340, 90, [[0, `rgba(255,190,110,${(0.25 * seam).toFixed(3)})`], [1, 'rgba(255,190,110,0)']]);
  g.fillStyle = `rgba(255,210,150,${clamp(seam).toFixed(3)})`; g.fillRect(539, 1200, 2, 282); g.restore();
  // steps
  g.fillStyle = stone(1514, 1610); g.fillRect(146, 1514, 788, 28); g.fillRect(114, 1542, 852, 30); g.fillRect(84, 1572, 912, 36);
  g.strokeStyle = 'rgba(176,198,234,0.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(146, 1514); g.lineTo(934, 1514); g.moveTo(114, 1542); g.lineTo(966, 1542); g.moveTo(84, 1572); g.lineTo(996, 1572); g.stroke();
  // cold light falling across the front
  g.save(); g.globalCompositeOperation = 'lighter';
  radial(g, 540, 1050, 760, [[0, 'rgba(120,150,210,0.11)'], [1, 'rgba(120,150,210,0)']]);
  g.restore();
  g.restore();
  const fog = g.createLinearGradient(0, 1380, 0, H); fog.addColorStop(0, 'rgba(140,165,210,0)'); fog.addColorStop(1, 'rgba(140,165,210,0.16)');
  g.fillStyle = fog; g.fillRect(0, 1380, W, H - 1380);
  const tg = g.createLinearGradient(0, 0, 0, 760); tg.addColorStop(0, 'rgba(0,0,0,0.5)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = tg; g.fillRect(0, 0, W, 760);
  drawDust(g, t, '170,195,235', 0.55);
}

// ---------------------------------------------------------------- scene 4: the gates
function gateOpen(t) {
  const a1 = E.outBack(seg(t, T.crack, T.crack + 0.11));
  const a2 = E.out3(seg(t, T.swing, T.swing + 0.16));
  const a3 = E.out4(seg(t, T.burst, T.burst + 0.32));
  let o = 0.028 * a1 + (0.3 - 0.028) * a2 + 0.7 * a3;
  const rb = t - T.slam; if (rb >= 0 && rb < 0.25) o += 0.012 * Math.sin(rb * 40) * Math.exp(-rb * 18);
  return clamp(o, 0, 1);
}
function seamLight(t) {
  let L = 0.32 + 0.45 * seg(t, T.slam + 0.2, T.crack);
  for (const k of T.kicksGate) { const a = t - k; if (a >= 0) L += 0.6 * Math.exp(-a * 7); }
  return L;
}
function bilerp(q, u, v) { // q = [tl, tr, br, bl] points
  const top = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)];
  const bot = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)];
  return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
}
function quadPath(g, q, u0, v0, u1, v1) {
  const a = bilerp(q, u0, v0), b = bilerp(q, u1, v0), c = bilerp(q, u1, v1), d = bilerp(q, u0, v1);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}
function drawLeaf(g, side, theta) {
  // side -1 = left leaf (hinge at x=0), +1 = right leaf (hinge at x=W)
  const hingeX = side < 0 ? 0 : W, cy = 960, half = 1010;
  const inner = side < 0 ? 540 * Math.cos(theta) : W - 540 * Math.cos(theta);
  const k = 1 + 0.3 * Math.sin(theta);
  // u runs hinge -> inner edge, v top -> bottom
  const q = [[hingeX, cy - half], [inner, cy - half * k], [inner, cy + half * k], [hingeX, cy + half]];
  const shade = 0.55 + 0.45 * Math.cos(theta);
  const base = g.createLinearGradient(hingeX, 0, inner, 0);
  base.addColorStop(0, `rgb(${Math.round(20 * shade)},${Math.round(15 * shade)},${Math.round(9 * shade)})`);
  base.addColorStop(0.7, `rgb(${Math.round(44 * shade)},${Math.round(34 * shade)},${Math.round(21 * shade)})`);
  base.addColorStop(1, `rgb(${Math.round(58 * shade)},${Math.round(45 * shade)},${Math.round(27 * shade)})`);
  quadPath(g, q, 0, 0, 1, 1); g.fillStyle = base; g.fill();
  const us = side < 0 ? [[0.1, 0.46], [0.54, 0.9]] : [[0.1, 0.46], [0.54, 0.9]];
  const vs = [[0.07, 0.24], [0.29, 0.47], [0.53, 0.71], [0.76, 0.93]];
  for (const [u0, u1] of us) for (const [v0, v1] of vs) {
    quadPath(g, q, u0, v0, u1, v1); g.fillStyle = `rgba(${Math.round(70 * shade)},${Math.round(55 * shade)},${Math.round(33 * shade)},0.55)`; g.fill();
    g.lineWidth = 3; g.strokeStyle = `rgba(150,122,78,${0.35 * shade})`; g.stroke();
    quadPath(g, q, u0 + 0.025, v0 + 0.012, u1 - 0.025, v1 - 0.012); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke();
    for (const [uu, vv] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) {
      const p = bilerp(q, uu, vv); g.fillStyle = `rgba(${Math.round(170 * shade)},${Math.round(140 * shade)},${Math.round(96 * shade)},0.9)`;
      g.beginPath(); g.arc(p[0], p[1], 6 * Math.max(0.4, Math.cos(theta) * 0.6 + 0.4), 0, Math.PI * 2); g.fill();
    }
  }
  for (const [v, hh] of [[0.265, 0.016], [0.5, 0.022], [0.735, 0.016]]) {
    quadPath(g, q, 0, v - hh / 2, 1, v + hh / 2); g.fillStyle = `rgba(${Math.round(16 * shade)},${Math.round(14 * shade)},${Math.round(12 * shade)},0.95)`; g.fill();
    g.strokeStyle = `rgba(120,104,80,${0.4 * shade})`; g.lineWidth = 1.5; g.stroke();
    for (let u = 0.06; u < 1; u += 0.11) { const p = bilerp(q, u, v); g.fillStyle = `rgba(${Math.round(150 * shade)},${Math.round(128 * shade)},${Math.round(92 * shade)},0.85)`; g.beginPath(); g.arc(p[0], p[1], 5.5 * (1 - 0.4 * (side < 0 ? 1 - u : u) * Math.sin(theta)), 0, Math.PI * 2); g.fill(); }
  }
  quadPath(g, q, 0.965, 0, 1, 1); g.fillStyle = `rgba(${Math.round(110 * shade)},${Math.round(88 * shade)},${Math.round(54 * shade)},0.9)`; g.fill();
  const ring = bilerp(q, 0.84, 0.57);
  g.strokeStyle = `rgba(150,122,78,${0.7 * shade})`; g.lineWidth = 6; g.beginPath(); g.ellipse(ring[0], ring[1], 26 * Math.max(0.25, Math.cos(theta)), 30, 0, 0, Math.PI * 2); g.stroke();
}
function drawLightSource(g, t, o) {
  radial(g, 540, 980, 1500, [[0, '#fffaf0'], [0.09, '#ffe7b4'], [0.28, '#e9a64c'], [0.55, '#6b3a12'], [1, '#120802']]);
  if (o > 0.02) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const n = 30, rot = t * 0.12;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2 + 0.07 * Math.sin(i * 3.1);
      const len = 1700, wdt = 0.035 + 0.03 * hash(i * 9.1);
      const al = (0.05 + 0.07 * hash(i * 4.7)) * clamp(o * 1.6);
      const gr = g.createLinearGradient(540, 980, 540 + Math.cos(a) * len, 980 + Math.sin(a) * len);
      gr.addColorStop(0, `rgba(255,236,190,${al.toFixed(3)})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(540, 980);
      g.lineTo(540 + Math.cos(a - wdt) * len, 980 + Math.sin(a - wdt) * len); g.lineTo(540 + Math.cos(a + wdt) * len, 980 + Math.sin(a + wdt) * len); g.closePath(); g.fill();
    }
    g.restore();
  }
}
function drawBeam(g, t) {
  // the bar across the gates: whole until "break", then split and gone as they swing
  const y = 1012, h = 84;
  const crackP = seg(t, T.crack, T.crack + 0.1);
  const fall = E.in2(seg(t, T.swing - 0.02, T.swing + 0.4));
  if (fall >= 1) return;
  const drawHalf = (side) => {
    g.save();
    const piv = side < 0 ? 150 : 930;
    // the broken ends sag, then the halves drop away
    const ang = -side * (0.07 * E.outBack(crackP) + 0.9 * fall);
    g.translate(piv + side * 40 * fall, y + h / 2 + 700 * fall * fall);
    g.rotate(ang);
    g.globalAlpha = 1 - fall;
    const wood = g.createLinearGradient(0, -h / 2, 0, h / 2);
    wood.addColorStop(0, '#5a3d20'); wood.addColorStop(0.5, '#3b2713'); wood.addColorStop(1, '#1f1409');
    g.fillStyle = wood;
    g.beginPath();
    if (side < 0) { g.moveTo(-110, -h / 2); g.lineTo(390 - (crackP > 0 ? 6 : 0), -h / 2); g.lineTo(380, -10); g.lineTo(394, 8); g.lineTo(384, h / 2); g.lineTo(-110, h / 2); }
    else { g.moveTo(110, -h / 2); g.lineTo(-390 + (crackP > 0 ? 6 : 0), -h / 2); g.lineTo(-380, -10); g.lineTo(-394, 8); g.lineTo(-384, h / 2); g.lineTo(110, h / 2); }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(side < 0 ? -110 : 110, i * 10); g.lineTo(side < 0 ? 380 : -380, i * 10 + 3); g.stroke(); }
    g.strokeStyle = 'rgba(190,150,96,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(side < 0 ? -110 : 110, -h / 2 + 2); g.lineTo(side < 0 ? 386 : -386, -h / 2 + 2); g.stroke();
    // iron bracket
    g.fillStyle = '#121010'; g.fillRect(-26, -h / 2 - 16, 52, h + 32);
    g.fillStyle = 'rgba(150,130,100,0.6)'; g.beginPath(); g.arc(0, -h / 2 - 4, 5, 0, 6.3); g.arc(0, h / 2 + 4, 5, 0, 6.3); g.fill();
    g.restore();
  };
  if (crackP <= 0) {
    // one piece
    const wood = g.createLinearGradient(0, y, 0, y + h);
    wood.addColorStop(0, '#5a3d20'); wood.addColorStop(0.5, '#3b2713'); wood.addColorStop(1, '#1f1409');
    g.fillStyle = wood; g.fillRect(40, y, 1000, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(40, y + h / 2 + i * 10); g.lineTo(1040, y + h / 2 + i * 10 + 3); g.stroke(); }
    g.strokeStyle = 'rgba(190,150,96,0.35)'; g.beginPath(); g.moveTo(40, y + 2); g.lineTo(1040, y + 2); g.stroke();
    for (const bx of [150, 930]) { g.fillStyle = '#121010'; g.fillRect(bx - 26, y - 16, 52, h + 32); g.fillStyle = 'rgba(150,130,100,0.6)'; g.beginPath(); g.arc(bx, y - 4, 5, 0, 6.3); g.arc(bx, y + h + 4, 5, 0, 6.3); g.fill(); }
  } else { drawHalf(-1); drawHalf(1); }
}
const SPARKS = (() => { const R = rng(44); const a = []; for (let i = 0; i < 70; i++) a.push({ ang: R() * Math.PI * 2, sp: 380 + R() * 1300, life: 0.35 + R() * 0.5, t0: R() < 0.45 ? 0 : 1, w: 1.5 + R() * 2.5 }); return a; })();
function drawSparks(g, t) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const s of SPARKS) {
    const t0 = s.t0 === 0 ? T.crack : T.burst;
    const a = t - t0; if (a < 0 || a > s.life) continue;
    const vx = Math.cos(s.ang) * s.sp, vy = Math.sin(s.ang) * s.sp - 200;
    const x = 540 + vx * a, y = 1050 + vy * a + 0.5 * 1900 * a * a;
    const k = 1 - a / s.life;
    g.strokeStyle = `rgba(255,${Math.round(190 + 60 * k)},${Math.round(120 + 100 * k)},${(0.9 * k).toFixed(3)})`;
    g.lineWidth = s.w;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - vx * 0.022, y - (vy + 1900 * a) * 0.022); g.stroke();
  }
  g.restore();
}
function drawSlamDust(g, t) {
  const a = t - T.slam; if (a < 0 || a > 1.0) return;
  const R = rng(321);
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 70; i++) {
    const y0 = 120 + R() * 1700, dir = R() < 0.5 ? -1 : 1, sp = 120 + R() * 520, sz = 12 + R() * 46;
    const x = 540 + dir * sp * (1 - Math.exp(-a * 4)) / 4 * 3, y = y0 - 30 * a + 60 * a * a;
    const al = 0.13 * Math.exp(-a * 3.2) * (0.5 + R());
    radial(g, x, y, sz * (1 + a * 1.5), [[0, `rgba(205,175,130,${al.toFixed(3)})`], [1, 'rgba(205,175,130,0)']]);
  }
  g.restore();
}
function sceneGates(g, t) {
  const o = gateOpen(t);
  const theta = o * (82 * Math.PI / 180);
  const push = (1 + 0.065 * E.inOut3(seg(t, T.slam, T.crack))) * (1 + 0.2 * E.in2(seg(t, T.burst, T.white)));
  g.save(); g.translate(540, 980); g.scale(push, push); g.translate(-540, -980);
  drawLightSource(g, t, o);
  drawDust(g, t, '255,226,170', 1.1 * clamp(o * 2), [540, 980, 900]);
  // seam glow when shut
  if (o < 0.35) {
    const L = seamLight(t) * (1 - o / 0.35);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gw = 90 + 60 * L;
    const sg = g.createLinearGradient(540 - gw, 0, 540 + gw, 0);
    sg.addColorStop(0, 'rgba(255,190,110,0)'); sg.addColorStop(0.5, `rgba(255,214,150,${(0.55 * L).toFixed(3)})`); sg.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = sg; g.fillRect(540 - gw, -100, gw * 2, H + 200);
    g.restore();
  }
  drawLeaf(g, -1, theta);
  drawLeaf(g, 1, theta);
  {
    // light spilling onto the faces of the doors from the seam; the outer edges fall off into dark
    const L = seamLight(t) * (1 - clamp(o / 0.35));
    g.save(); g.globalCompositeOperation = 'lighter';
    const sp = g.createLinearGradient(120, 0, 960, 0);
    sp.addColorStop(0, 'rgba(255,180,100,0)'); sp.addColorStop(0.5, `rgba(255,190,110,${(0.17 * L).toFixed(3)})`); sp.addColorStop(1, 'rgba(255,180,100,0)');
    g.fillStyle = sp; g.fillRect(120, -100, 840, H + 200);
    g.restore();
    const ea = 0.6 * (1 - clamp(o * 1.4));
    if (ea > 0.01) {
      const ed = g.createLinearGradient(0, 0, W, 0);
      ed.addColorStop(0, `rgba(0,0,0,${ea})`); ed.addColorStop(0.24, 'rgba(0,0,0,0)'); ed.addColorStop(0.76, 'rgba(0,0,0,0)'); ed.addColorStop(1, `rgba(0,0,0,${ea})`);
      g.fillStyle = ed; g.fillRect(0, -100, W, H + 200);
    }
  }
  if (o < 0.35) {
    const L = seamLight(t) * (1 - o / 0.35);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,246,222,${clamp(0.5 + 0.5 * L).toFixed(3)})`; g.fillRect(538, -100, 4, H + 200);
    const sg = g.createLinearGradient(500, 0, 580, 0);
    sg.addColorStop(0, 'rgba(255,200,120,0)'); sg.addColorStop(0.5, `rgba(255,220,160,${(0.65 * L).toFixed(3)})`); sg.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = sg; g.fillRect(500, -100, 80, H + 200);
    // spill under and over the leaves
    radial(g, 540, 1930, 520, [[0, `rgba(255,200,120,${(0.35 * L).toFixed(3)})`], [1, 'rgba(255,200,120,0)']]);
    g.restore();
  }
  drawBeam(g, t);
  if (o < 0.35) drawDust(g, t, '255,214,150', 1.6 * seamLight(t) * (1 - o / 0.35), [540, 980, 420]);
  drawSparks(g, t);
  g.restore();
  drawSlamDust(g, t);
  // light flooding the frame as they open
  if (o > 0.25) { g.fillStyle = `rgba(255,232,190,${(0.32 * E.in2(seg(o, 0.25, 1))).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  // keep the words clear of the seam light while the doors are shut
  const tg = g.createLinearGradient(0, 0, 0, 860); tg.addColorStop(0, 'rgba(0,0,0,0.82)'); tg.addColorStop(0.62, 'rgba(0,0,0,0.66)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = tg; g.globalAlpha = 1 - clamp(o * 1.5); g.fillRect(0, 0, W, 860); g.globalAlpha = 1;
}

// ---------------------------------------------------------------- scene 4b: reveal, then the phone
function drawIconPanel(g, t, s, glow) {
  const img = IM.pantocrator_gold;
  const w = 720 * s, h = img.height * (720 / img.width) * s, x = 540 - w / 2, y = 1010 - h / 2;
  radial(g, 540, 1010, 820 * s, [[0, `rgba(255,206,130,${(0.42 * glow).toFixed(3)})`], [0.45, `rgba(200,140,60,${(0.12 * glow).toFixed(3)})`], [1, 'rgba(0,0,0,0)']]);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 60; g.shadowOffsetY = 20; g.fillStyle = '#000'; g.fillRect(x, y, w, h); g.restore();
  g.drawImage(img, x, y, w, h);
  g.strokeStyle = 'rgba(223,185,105,0.55)'; g.lineWidth = 2.5; g.strokeRect(x - 10, y - 10, w + 20, h + 20);
  // a slow light sweep across the icon
  const sw = seg(t, T.white + 0.12, T.phone + 0.15);
  if (sw > 0 && sw < 1) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalCompositeOperation = 'lighter';
    const sx = x - w * 0.6 + sw * w * 2.2;
    const lg = g.createLinearGradient(sx - 160, y, sx + 160, y + 260);
    lg.addColorStop(0, 'rgba(255,240,200,0)'); lg.addColorStop(0.5, 'rgba(255,240,200,0.22)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = lg; g.fillRect(x, y, w, h); g.restore();
  }
}
function sceneReveal(g, t, depth) {
  fillBg(g, '#0d0803', '#020100');
  radial(g, 540, 1000, 1300, [[0, 'rgba(120,76,26,0.55)'], [1, 'rgba(0,0,0,0)']]);
  g.save(); g.globalCompositeOperation = 'lighter';
  const n = 22, rot = t * 0.1;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2, len = 1600, wdt = 0.04 + 0.03 * hash(i * 5.3), al = 0.05 + 0.05 * hash(i * 2.1);
    const gr = g.createLinearGradient(540, 1000, 540 + Math.cos(a) * len, 1000 + Math.sin(a) * len);
    gr.addColorStop(0, `rgba(255,220,160,${al.toFixed(3)})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(540, 1000); g.lineTo(540 + Math.cos(a - wdt) * len, 1000 + Math.sin(a - wdt) * len); g.lineTo(540 + Math.cos(a + wdt) * len, 1000 + Math.sin(a + wdt) * len); g.closePath(); g.fill();
  }
  g.restore();
  const s = lerp(1.08, 1.0, E.out3(seg(t, T.white, T.phone))) * (1 - 0.06 * depth);
  g.save();
  if (depth > 0.01) g.filter = `blur(${(14 * depth).toFixed(1)}px)`;
  drawIconPanel(g, t, s, 1 - 0.4 * depth);
  g.restore();
  drawDust(g, t, '255,214,160', 0.9);
  if (depth > 0) { g.fillStyle = `rgba(0,0,0,${(0.55 * depth).toFixed(3)})`; g.fillRect(0, 0, W, H); }
}
const STRIP_PER_CSS = 720 / 393;
function scrollY(t) {
  const sc = T.scroll;
  let y = 24 * seg(t, T.phone, sc[0]);
  y = lerp(y, 690, E.inOut3(seg(t, sc[0], sc[0] + 0.19)));
  y = lerp(y, 3604, E.inOut3(seg(t, sc[1], sc[1] + 0.13)));
  y = lerp(y, 6706, E.inOut3(seg(t, sc[2], sc[2] + 0.1)));
  y = lerp(y, 11198, E.inOut3(seg(t, sc[3], sc[3] + 0.12)));
  y += 30 * seg(t, sc[3] + 0.12, T.lock);
  return y;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawPhone(g, t) {
  const p = seg(t, T.phone - 0.02, T.phone + 0.36);
  const e = E.outBack(p);
  const pushP = E.out3(seg(t, T.push, T.lock));
  const cx = 540, cy = 1236 + (1 - e) * 1250;
  const rot = (1 - E.out3(p)) * -0.14;
  const sc = lerp(0.92, 1, E.out3(p)) * (1 - 0.035 * pushP);
  const PW = 620, PH = 1340;
  g.save();
  g.translate(cx, cy); g.rotate(rot); g.scale(sc, sc); g.translate(-PW / 2, -PH / 2);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 90; g.shadowOffsetY = 40;
  rr(g, 0, 0, PW, PH, 92); const body = g.createLinearGradient(0, 0, PW, PH); body.addColorStop(0, '#3a3a40'); body.addColorStop(0.5, '#17171b'); body.addColorStop(1, '#2a2a30');
  g.fillStyle = body; g.fill(); g.restore();
  g.save(); g.shadowColor = 'rgba(232,190,110,0.45)'; g.shadowBlur = 46;
  rr(g, 1.5, 1.5, PW - 3, PH - 3, 91); const rim = g.createLinearGradient(0, 0, PW, PH); rim.addColorStop(0, 'rgba(240,206,140,0.75)'); rim.addColorStop(0.5, 'rgba(255,255,255,0.18)'); rim.addColorStop(1, 'rgba(240,206,140,0.55)');
  g.strokeStyle = rim; g.lineWidth = 3; g.stroke(); g.restore();
  g.fillStyle = '#26262b'; g.fillRect(PW - 2, 300, 6, 120); g.fillRect(-4, 260, 6, 70); g.fillRect(-4, 360, 6, 110);
  const sx = 14, sy = 14, sw = PW - 28, sh = PH - 28;
  g.save(); rr(g, sx, sy, sw, sh, 78); g.clip();
  g.fillStyle = '#121214'; g.fillRect(sx, sy, sw, sh);
  const ks = sw / 720;
  // motion blur across the frame's shutter
  let drawn = 0;
  const y0 = scrollY(t - 1 / 120), y1 = scrollY(t + 1 / 120);
  const spanPx = Math.abs(y1 - y0) * STRIP_PER_CSS * ks;
  const N = clamp(Math.ceil(spanPx / 2.5), 1, 40), fast = N > 1;
  for (let i = 0; i < N; i++) {
    const yy = fast ? lerp(y0, y1, i / (N - 1)) : scrollY(t);
    g.globalAlpha = 1 / (drawn + 1);
    const srcY = yy * STRIP_PER_CSS;
    g.drawImage(IM.strip, 0, srcY, 720, sh / ks, sx, sy, sw, sh);
    drawn++;
  }
  g.globalAlpha = 1;
  const tint = 0.2 * pushP;
  if (tint > 0) { g.fillStyle = `rgba(255,214,150,${tint.toFixed(3)})`; g.globalCompositeOperation = 'soft-light'; g.fillRect(sx, sy, sw, sh); g.globalCompositeOperation = 'source-over'; }
  const gl = g.createLinearGradient(sx, sy, sx + sw, sy + sh * 0.6); gl.addColorStop(0, 'rgba(255,255,255,0.07)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(sx, sy, sw, sh);
  g.restore();
  rr(g, PW / 2 - 86, 34, 172, 50, 25); g.fillStyle = '#000'; g.fill();
  g.restore();
}

// ---------------------------------------------------------------- scene 6: the lockup
function drawCross(g, x, y, h, alpha) {
  // the Purify mark: Orthodox cross, footrest high on the viewer's left
  const s = h / 311;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = alpha;
  g.fillStyle = '#f7f5f0';
  g.fillRect(73, 0, 31, 311); g.fillRect(41, 32, 95, 32); g.fillRect(0, 96, 177, 32);
  g.beginPath(); g.moveTo(41, 197); g.lineTo(136, 245); g.lineTo(136, 280); g.lineTo(41, 232); g.closePath(); g.fill();
  g.restore();
}
function sceneLockup(g, t) {
  fillBg(g, '#060504', '#020202');
  const lt = t - T.lock;
  radial(g, 540, 930, 900, [[0, `rgba(201,163,90,${(0.13 * E.out2(seg(lt, 0, 0.5))).toFixed(3)})`], [1, 'rgba(0,0,0,0)']]);
  drawDust(g, t, '255,214,160', 0.45, [540, 930, 800]);
  const push = 1 + 0.03 * seg(lt, 0, 1.6);
  g.save(); g.translate(540, 930); g.scale(push, push); g.translate(-540, -930);
  const crossH = 218, crossW = crossH * 177 / 311;
  g.font = SERIF(500, 156); g.letterSpacing = '0px';
  const word = 'Purify', wW = g.measureText(word).width;
  const gap = 50, total = crossW + gap + 2 + gap + wW, x0 = 540 - total / 2, cy = 930;
  const cp = E.out3(seg(lt, 0, 0.22));
  g.save();
  if (cp < 1) g.filter = `blur(${(16 * (1 - cp)).toFixed(1)}px)`;
  g.shadowColor = `rgba(255,236,200,${(0.6 * (1 - 0.5 * cp)).toFixed(3)})`; g.shadowBlur = 40;
  drawCross(g, x0, cy - crossH / 2, crossH, cp);
  g.restore();
  const dp = E.out3(seg(lt, 0.08, 0.26));
  g.fillStyle = `rgba(255,255,255,${(0.4 * dp).toFixed(3)})`; g.fillRect(x0 + crossW + gap, cy - 86 * dp, 2, 172 * dp);
  const tx = x0 + crossW + gap + 2 + gap;
  const xs = charXs(g, { font: SERIF(500, 156) }, word);
  const m = g.measureText(word); const base = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  for (let i = 0; i < word.length; i++) {
    const lp = E.out3(seg(lt, 0.1 + i * 0.045, 0.1 + i * 0.045 + 0.16));
    if (lp <= 0) continue;
    g.save(); g.globalAlpha = lp; if (lp < 1) g.filter = `blur(${(10 * (1 - lp)).toFixed(1)}px)`;
    g.fillStyle = '#f7f5f0'; g.font = SERIF(500, 156); g.fillText(word[i], tx + xs[i], base); g.restore();
  }
  // tagline
  const tp = E.out3(seg(t, T.lastKick, T.lastKick + 0.28));
  if (tp > 0) {
    g.save(); g.globalAlpha = tp; g.font = SANS(500, 26); g.letterSpacing = '8.5px'; g.fillStyle = 'rgba(255,255,255,0.74)'; g.textBaseline = 'alphabetic';
    const parts = ['APOSTOLIC', 'ORTHODOX', 'KNOWLEDGE'], sep = 34;
    const ws = parts.map(s => g.measureText(s).width);
    const tw = ws.reduce((a, b) => a + b, 0) + sep * 2 * 2;
    let x = 540 - tw / 2; const y = cy + 184 + (1 - tp) * 10;
    parts.forEach((s, i) => {
      g.fillText(s, x, y); x += ws[i];
      if (i < parts.length - 1) { x += sep; g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 4, y - 21, 1.5, 26); g.fillStyle = 'rgba(255,255,255,0.74)'; x += sep; }
    });
    g.restore();
  }
  const fp = E.out3(seg(t, T.lastKick + 0.24, T.lastKick + 0.56));
  if (fp > 0) {
    g.save(); g.globalAlpha = fp; g.font = SANS(500, 31); g.letterSpacing = '1px'; g.fillStyle = '#cfb27a'; g.textAlign = 'center';
    g.fillText('Free on iOS and Android', 540, cy + 280 + (1 - fp) * 10); g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- frame
function drawWorld(g, t) {
  if (t < T.cuts[0]) sceneCandle(g, t);
  else if (t < T.hidden) sceneMontage(g, t);
  else if (t < T.drop) sceneHidden(g, t);
  else if (t < T.portico) sceneIgnored(g, t);
  else if (t < T.slam) scenePortico(g, t);
  else if (t < T.white + 0.08) sceneGates(g, t);
  else if (t < T.lock) {
    const depth = E.out3(seg(t, T.phone, T.phone + 0.32));
    sceneReveal(g, t, depth);
    if (t >= T.phone - 0.02) drawPhone(g, t);
  } else sceneLockup(g, t);
}
function drawTexts(g, t) { for (const b of BLOCKS) drawBlock(g, b, t); }

function glitch(amount, seed) {
  const t2 = TMP.getContext('2d');
  t2.globalCompositeOperation = 'copy'; t2.drawImage(BUF, 0, 0); t2.globalCompositeOperation = 'source-over';
  const R = rng(seed), n = Math.floor(5 + amount * 12);
  for (let i = 0; i < n; i++) {
    const y = Math.floor(R() * H), h = Math.floor(6 + R() * 110 * amount), dx = (R() - 0.5) * 190 * amount;
    bctx.drawImage(TMP, 0, y, W, h, dx, y, W, h);
  }
}
function chroma(amount) {
  const t2 = TMP.getContext('2d'), c2 = TMP2.getContext('2d');
  t2.globalCompositeOperation = 'copy'; t2.drawImage(cv, 0, 0); t2.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
  for (const [col, ox] of [['#ff0000', -amount], ['#00ff00', 0], ['#0000ff', amount]]) {
    c2.globalCompositeOperation = 'copy'; c2.drawImage(TMP, 0, 0);
    c2.globalCompositeOperation = 'multiply'; c2.fillStyle = col; c2.fillRect(0, 0, W, H); c2.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(TMP2, ox, ox * 0.25); ctx.restore();
  }
}
function renderFrame(t) {
  const f = Math.round(t * FPS);
  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.filter = 'none';
  bctx.fillStyle = '#000'; bctx.fillRect(0, 0, W, H);
  drawWorld(bctx, t);
  drawTexts(bctx, t);
  for (const [gt, len, amt] of GLITCH) { const a = t - gt; if (a >= 0 && a < len) glitch(amt * (1 - a / len), f * 17 + 3); }
  const cam = camera(t);
  const marg = 1 + (Math.abs(cam.dx) + Math.abs(cam.dy)) / W * 2.4 + Math.abs(cam.rot) * 1.4;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + cam.dx, H / 2 + cam.dy); ctx.rotate(cam.rot); const s = (1 + cam.punch) * marg; ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(BUF, 0, 0);
  ctx.restore();
  let ab = 0; for (const [ct, amt] of CHROMA) { const a = t - ct; if (a >= 0 && a < 0.4) ab += amt * Math.exp(-a * 13); }
  if (ab > 0.6) chroma(ab);
  // flashes and the whiteout into the reveal
  let fl = null, fa = 0;
  for (const [ft, peak, dec, rgb] of FLASH) { const a = t - ft; if (a >= 0 && a < dec * 3) { const v = peak * Math.exp(-a / dec * 2.2); if (v > fa) { fa = v; fl = rgb; } } }
  const wo = t < T.white ? E.in2(seg(t, T.white - 0.2, T.white)) : 1 - E.out2(seg(t, T.white + 0.08, T.reveal + 0.05));
  if (wo > fa) { fa = wo; fl = '255,246,228'; }
  if (fa > 0.004) { ctx.fillStyle = `rgba(${fl},${fa.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  // grade: vignette and grain
  const vg = ctx.createRadialGradient(540, 900, 380, 540, 960, 1320);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.11; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(GRAIN[f % GRAIN.length], 0, 0, W, H); ctx.restore();
}
// TikTok cover: the hook in the middle of the frame, over the lit candle
function renderCover() {
  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.filter = 'none';
  bctx.fillStyle = '#02040a'; bctx.fillRect(0, 0, W, H);
  bctx.save(); bctx.translate(0, 300); sceneCandle(bctx, 0.62); bctx.restore();
  bctx.save(); bctx.textAlign = 'center'; bctx.fillStyle = WHITE; bctx.shadowColor = 'rgba(0,0,0,0.7)'; bctx.shadowBlur = 36; bctx.shadowOffsetY = 4;
  bctx.font = SANS(800, 116); let w = bctx.measureText('CHRISTIANITY').width; const sc = Math.min(1, 900 / w);
  bctx.font = SANS(800, 116 * sc); bctx.fillText('CHRISTIANITY', 540, 880); bctx.fillText('IS DYING.', 540, 880 + 124 * sc); bctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(BUF, 0, 0);
  const vg = ctx.createRadialGradient(540, 900, 380, 540, 960, 1320); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.11; ctx.drawImage(GRAIN[0], 0, 0, W, H); ctx.restore();
}
window.renderCover = renderCover;
window.renderFrame = renderFrame;
window.T = T;
loadAll().then(() => { renderFrame(0); window.READY = true; }).catch(e => { window.LOAD_ERROR = String(e); });
