'use strict';
// Purify AD 3, "Your faith didn't start in the West". RUBRIC style, as AD 2: lapis black,
// cool vellum, and rubric red. No gold, no orange. Every frame is a pure function of t.
// Timing measured from the owner's early-christians.mp3: a 102 BPM grid read from the
// drums in the mix, word onsets from the voiceover.

const W = 1080, H = 1920, FPS = 30;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const BUF = mk(), TMP = mk(), TMP2 = mk();
const bctx = BUF.getContext('2d');

// ---------------------------------------------------------------- palette
const C = {
  night0: '#05070d', night1: '#0b1222',
  vellum: '#e8e7e2', sea: '#c6cacb', ink: '#1c1a16', inkSoft: '#6d675c', leader: '#bfb9ad',
  rubric: '#a8262c', rubricHi: '#d93a3f', white: '#f3f1ec', steel: '#a6b2c4',
  app: '#0f0f13', card: '#16161c',
};

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out2: t => 1 - (1 - t) * (1 - t),
  out3: t => 1 - Math.pow(1 - t, 3),
  in2: t => t * t,
  in3: t => t * t * t,
  inOut2: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inOut3: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- timing (measured)
const B0 = 0.028, BP = 0.5882;               // first beat, seconds per beat (102 BPM); snare on odd beats from b9
const bt = k => B0 + BP * k;
const T = {
  whip: bt(4),                               // 2.381 bar line: fly east to Jerusalem
  route: [bt(5), bt(6), bt(7), bt(8)],       // 2.969 Jerusalem ("carried"), 3.557 Antioch, 4.145 Smyrna, 4.734 Rome
  bled: bt(8),                               // 4.734 the drums come in, just after "bled": ink at Rome
  letters: 6.60,                             // after "Yet": the martyrs hold a little longer
  dim: 7.84,                                 // "completely ignored"
  today: bt(15),                             // 8.851 "today"
  open: bt(16),                              // 9.439 the seal breaks
  sheetUp: [9.70, 10.02], envOut: [9.96, 10.26], morph: [10.0, 10.5], phoneIn: [10.22, 10.52],
  scroll: [10.55, 10.92],                    // down to the passage, then the words are marked on the voice
  readOut: 13.12,                            // the passage held to here
  list: 13.27,                               // "early Christians"
  free: 15.05,
  lock: bt(28),                              // 16.498 bar line, "Download"
  tagline: bt(30),                           // 17.674
};
const WD = {
  your: 0.24, faith: 0.64, didnt: 0.96, start: 1.28, in: 1.52, the: 1.68, west: 1.82,
  it: 2.56, was: 2.72, carried: 2.98, here: 3.28, by: 3.46, early: 3.67, christians: 4.02,
  yet: 6.505, their: 6.64, original: 6.80, writings: 7.28, are: 7.69, completely: 7.84, ignored: 8.29, today: 8.87,
  we: 9.60, built: 9.76, purify1: 10.05, to: 10.72, give: 10.90, you: 11.00, their2: 11.12, exact: 11.36, words: 11.81,
  read: 12.72, the3: 13.12, early2: 13.27, christians2: 13.57,
  unlocked: 14.53, completely2: 15.34, free: 15.92, download: 16.83, purify2: 17.28,
};
const LEAD = 0.05;

const HITS = [
  [T.whip, 0.3], [T.route[1], 0.12], [T.route[2], 0.12], [T.bled, 0.55],
  [T.today, 0.32], [T.open, 0.22], [T.lock, 0.3],
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
const FLASH = [[T.bled, 0.2, 0.14, '255,236,236'], [T.open, 0.08, 0.14, '226,234,255'], [T.lock, 0.18, 0.2, '240,242,255']];
const CHROMA = [[T.whip, 3], [T.bled, 4], [T.today, 2.5]];

// ---------------------------------------------------------------- assets
const IM = {};
const GRAIN = [];
let MAP = null, MAPCV = null;
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
  await Promise.all([load('strip', 'assets/reader_strip.png'), load('bar', 'assets/reader_bar.png')]);
  MAP = await (await fetch('assets/map.json')).json();
  for (let k = 0; k < 6; k++) {
    const c = mk(540, 960), g = c.getContext('2d'), id = g.createImageData(540, 960), R = rng(91 + k);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + ((R() + R() + R() - 1.5) * 90); id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0); GRAIN.push(c);
  }
  buildMap();
  buildRoute();
  buildInked();
}

// ---------------------------------------------------------------- the map
// Natural Earth land (public domain), Mercator, 72 px to a degree of longitude.
const merc = lat => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * 180 / Math.PI;
function proj(lon, lat) { const P = MAP.proj; return [(lon - P.lon0) * P.k, (P.m1 - merc(lat)) * P.k]; }
const CITY = {
  jerusalem: [35.2137, 31.7683, 'JERUSALEM'], antioch: [36.1626, 36.2021, 'ANTIOCH'],
  smyrna: [27.1428, 38.4237, 'SMYRNA'], rome: [12.4964, 41.9028, 'ROME'],
};
function buildMap() {
  const P = MAP.proj, w = P.W, h = P.H;
  MAPCV = mk(w, h); const g = MAPCV.getContext('2d');
  g.fillStyle = C.sea; g.fillRect(0, 0, w, h);
  const R = rng(7);
  // sea: faint engraved lines, as on an old chart
  g.strokeStyle = 'rgba(52,60,74,0.07)'; g.lineWidth = 1;
  for (let y = 6; y < h; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 3); g.stroke(); }
  const ringPath = new Path2D();
  for (const ring of MAP.rings) { ring.forEach(([x, y], i) => (i ? ringPath.lineTo(x, y) : ringPath.moveTo(x, y))); ringPath.closePath(); }
  // ripples off every coast, then the land laid over their inner half
  g.lineJoin = 'round';
  for (const [lw, a] of [[46, 0.035], [30, 0.05], [16, 0.08]]) { g.strokeStyle = `rgba(60,64,72,${a})`; g.lineWidth = lw; g.stroke(ringPath); }
  g.fillStyle = C.vellum; g.fill(ringPath);
  // vellum fibres and mottling over everything, no yellow
  for (let i = 0; i < 60000; i++) { const v = R(); g.fillStyle = v < 0.5 ? `rgba(120,118,112,${0.02 + R() * 0.035})` : `rgba(255,255,255,${0.04 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
  g.strokeStyle = 'rgba(110,108,100,0.05)';
  for (let i = 0; i < 2600; i++) { const x = R() * w, y = R() * h, l = 8 + R() * 30, a = R() * Math.PI; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + (R() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  // graticule every 5 degrees
  g.strokeStyle = 'rgba(28,26,22,0.07)'; g.lineWidth = 1.2;
  for (let lon = -10; lon <= 40; lon += 5) { const [x] = proj(lon, 40); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let lat = 30; lat <= 50; lat += 5) { const [, y] = proj(0, lat); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  // the coast in ink
  g.strokeStyle = 'rgba(28,26,22,0.82)'; g.lineWidth = 2.2; g.stroke(ringPath);
  g.strokeStyle = 'rgba(28,26,22,0.25)'; g.lineWidth = 0.9;
  g.save(); g.translate(2.5, 2.5); g.stroke(ringPath); g.restore();
  // the sea's name, quietly
  const [sx, sy] = proj(17.5, 34.6);
  g.save(); g.translate(sx, sy); g.rotate(-0.04);
  g.font = 'italic 500 40px Lora'; g.letterSpacing = '22px'; g.fillStyle = 'rgba(60,64,72,0.42)'; g.textAlign = 'center'; g.fillText('MEDITERRANEAN SEA', 0, 0);
  g.restore();
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,44,52,0.18)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
}
// The road: Jerusalem to Antioch, then Ignatius's own road to Rome under guard, c. 108, through
// Smyrna (where he wrote to the Romans), Troas, Philippi, the Via Egnatia and across to Brundisium.
const ROAD = [[35.21, 31.77], [35.0, 33.4], [35.9, 35.0], [36.16, 36.2], [34.9, 36.92], [32.5, 37.9], [29.9, 38.3], [27.14, 38.42],
  [26.6, 39.2], [26.16, 39.75], [25.2, 40.6], [24.29, 41.01], [22.94, 40.64], [21.0, 41.0], [19.45, 41.32], [17.94, 40.63], [15.2, 41.3], [12.5, 41.9]];
const ROAD_STOPS = [0, 3, 7, 17];            // Jerusalem, Antioch, Smyrna, Rome
let RPTS = null, RLEN = null, RSTOP = null;
function buildRoute() {
  const P = ROAD.map(([lo, la]) => proj(lo, la)), pts = [], at = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    at.push(pts.length);
    for (let s = 0; s < 24; s++) {
      const u = s / 24, u2 = u * u, u3 = u2 * u;
      pts.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
    }
  }
  at.push(pts.length); pts.push(P[P.length - 1]);
  const R = rng(33); RLEN = [0];
  for (let i = 1; i < pts.length; i++) RLEN.push(RLEN[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  // a hand on a pen: a small wobble across the line
  RPTS = pts.map(([x, y], i) => { const a = i > 0 ? Math.atan2(y - pts[i - 1][1], x - pts[i - 1][0]) : 0, wob = Math.sin(i * 0.37) * 1.4 + (R() - 0.5) * 0.8; return [x - Math.sin(a) * wob, y + Math.cos(a) * wob]; });
  RSTOP = ROAD_STOPS.map(k => RLEN[at[k]]);
}
// how far along the road the pen is, in map pixels
function roadAt(t) {
  const [t0, t1, t2, t3] = T.route;
  if (t <= t0) return 0;
  const legs = [[t0, t1, RSTOP[0], RSTOP[1]], [t1, t2, RSTOP[1], RSTOP[2]], [t2, t3, RSTOP[2], RSTOP[3]]];
  for (const [a, b, la, lb] of legs) if (t < b) return lerp(la, lb, E.inOut2(seg(t, a, b)));
  return RSTOP[3];
}
function mapCam(t) {
  const K = [
    [0, 4.0, 45.6, 0.86], [T.whip, 6.2, 44.6, 0.95], [T.whip + 0.42, 34.4, 33.0, 1.22], [T.route[0], 34.6, 33.2, 1.2],
    [T.route[1], 33.6, 35.0, 0.95], [T.route[2], 29.0, 37.0, 0.76], [T.route[3], 23.85, 37.4, 0.56], [T.bled + 0.5, 14.6, 40.4, 0.92], [T.letters, 14.2, 40.5, 0.98],
  ];
  if (t >= K[K.length - 1][0]) { const k = K[K.length - 1]; return { c: proj(k[1], k[2]), z: k[3] }; }
  for (let i = 0; i < K.length - 1; i++) {
    const [ta, la, pa, za] = K[i], [tb, lb, pb, zb] = K[i + 1];
    if (t < tb) {
      const whip = i === 1, u = whip ? E.inOut3(seg(t, ta, tb)) : (i === 0 ? seg(t, ta, tb) : E.inOut2(seg(t, ta, tb)));
      const ca = proj(la, pa), cb = proj(lb, pb);
      let z = lerp(za, zb, u); if (whip) z *= 1 - 0.32 * Math.sin(Math.PI * u);
      if (i === 0) z *= lerp(1.16, 1, E.out3(seg(t, 0, 1.1)));
      return { c: [lerp(ca[0], cb[0], u), lerp(ca[1], cb[1], u)], z };
    }
  }
}
const MAP_ANCHOR = [540, 1180];
function drawMap(g, t, opts = {}) {
  const cam = opts.cam || mapCam(t);
  const toScreen = (p, c = cam) => [(p[0] - c.c[0]) * c.z + MAP_ANCHOR[0], (p[1] - c.c[1]) * c.z + MAP_ANCHOR[1]];
  // motion blur while the camera flies
  const a = mapCam(t - 1 / 240), b = mapCam(t + 1 / 240);
  const va = toScreen(cam.c, a), vb = toScreen(cam.c, b), span = opts.cam ? 0 : Math.hypot(vb[0] - va[0], vb[1] - va[1]);
  const N = clamp(Math.ceil(span / 3), 1, 24), A0 = g.globalAlpha * (opts.alpha ?? 1), LA = A0 * (opts.labels ?? 1);
  g.save();
  for (let i = 0; i < N; i++) {
    const c = N > 1 ? { c: [lerp(a.c[0], b.c[0], i / (N - 1)), lerp(a.c[1], b.c[1], i / (N - 1))], z: lerp(a.z, b.z, i / (N - 1)) } : cam;
    g.globalAlpha = (N > 1 ? 1 / (i + 1) : 1) * A0;
    g.setTransform(c.z, 0, 0, c.z, MAP_ANCHOR[0] - c.c[0] * c.z, MAP_ANCHOR[1] - c.c[1] * c.z);
    g.drawImage(MAPCV, 0, 0);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = A0;
  // the red road, drawn as the pen goes
  const L = opts.L ?? (opts.full ? RLEN[RLEN.length - 1] : roadAt(t));
  if (L > 0) {
    g.save(); g.setTransform(cam.z, 0, 0, cam.z, MAP_ANCHOR[0] - cam.c[0] * cam.z, MAP_ANCHOR[1] - cam.c[1] * cam.z);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.rubric; g.lineWidth = 5.5 / cam.z;
    g.shadowColor = 'rgba(168,38,44,0.35)'; g.shadowBlur = 10;
    g.beginPath(); g.moveTo(RPTS[0][0], RPTS[0][1]);
    let i = 1; for (; i < RPTS.length && RLEN[i] <= L; i++) g.lineTo(RPTS[i][0], RPTS[i][1]);
    let tip = RPTS[Math.min(i, RPTS.length) - 1];
    if (i < RPTS.length) { const u = (L - RLEN[i - 1]) / (RLEN[i] - RLEN[i - 1]); tip = [lerp(RPTS[i - 1][0], RPTS[i][0], u), lerp(RPTS[i - 1][1], RPTS[i][1], u)]; g.lineTo(tip[0], tip[1]); }
    g.stroke();
    g.restore();
    if (L < RLEN[RLEN.length - 1] - 1) {
      const s = toScreen(tip);
      g.save(); g.globalAlpha = LA; g.fillStyle = C.rubricHi; g.shadowColor = 'rgba(217,58,63,0.9)'; g.shadowBlur = 18;
      g.beginPath(); g.arc(s[0], s[1], 6.5, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  // the cities, as the pen reaches them
  const keys = ['jerusalem', 'antioch', 'smyrna', 'rome'];
  keys.forEach((k, i) => {
    let p;
    if (opts.L !== undefined) { const q = clamp((L - RSTOP[i] + 30) / 90); if (q <= 0) return; p = E.outBack(q); }
    else { const t0 = opts.full ? -9 : T.route[i]; if (t < t0 - 0.02) return; p = E.outBack(seg(t, t0 - 0.02, t0 + 0.26)); }
    const [lon, lat, name] = CITY[k], s = toScreen(proj(lon, lat));
    g.save(); g.globalAlpha = clamp(p * 1.3) * LA;
    g.fillStyle = C.vellum; g.beginPath(); g.arc(s[0], s[1], 13 * p, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.rubric; g.beginPath(); g.arc(s[0], s[1], 8.5 * p, 0, Math.PI * 2); g.fill();
    g.font = '700 27px Inter'; g.letterSpacing = '6px'; g.fillStyle = C.ink; g.textBaseline = 'middle';
    const left = k === 'jerusalem' || k === 'antioch';
    g.textAlign = left ? 'right' : 'left';
    g.fillText(name, s[0] + (left ? -26 : 26), s[1] + (k === 'rome' ? -30 : 0));
    g.restore();
  });
  // ink at Rome when the drums come in: one drop, spreading into the vellum
  if (!opts.full && opts.L === undefined && t >= T.bled - 0.02) {
    const s = toScreen(proj(CITY.rome[0], CITY.rome[1])), a2 = t - T.bled;
    const grow = E.out3(clamp(a2 / 0.7)), r = (16 + 120 * grow) * cam.z / 0.58;
    g.save(); g.globalAlpha = A0; g.globalCompositeOperation = 'multiply';
    // ink soaking into vellum: an irregular edge, a dark core, a wet halo, a few drops thrown wide
    const shape = (rad, seed) => {
      const R = rng(seed), HS = [];
      for (let k = 1; k <= 7; k++) HS.push([2 + k * 2 + Math.floor(R() * 3), (0.12 / k) * (0.6 + R()), R() * 6.283]);
      const path = new Path2D();
      for (let i = 0; i <= 180; i++) { const an = i / 180 * Math.PI * 2; let j = 1; for (const [f, am, ph] of HS) j += am * Math.sin(an * f + ph); const x = s[0] + Math.cos(an) * rad * j, y = s[1] + Math.sin(an) * rad * j * 0.9; if (i) path.lineTo(x, y); else path.moveTo(x, y); }
      path.closePath(); return path;
    };
    g.save(); g.filter = 'blur(7px)'; g.fillStyle = 'rgba(168,38,44,0.2)'; g.fill(shape(r * 1.32, 61)); g.restore();
    const rg = g.createRadialGradient(s[0], s[1], r * 0.05, s[0], s[1], r * 1.2);
    rg.addColorStop(0, 'rgba(96,14,18,0.96)'); rg.addColorStop(0.5, 'rgba(140,26,32,0.9)'); rg.addColorStop(1, 'rgba(176,44,50,0.62)');
    g.save(); g.filter = 'blur(1.4px)'; g.fillStyle = rg; g.fill(shape(r, 59)); g.restore();
    const R = rng(51);
    g.fillStyle = 'rgba(140,26,32,0.85)';
    for (let k = 0; k < 9; k++) { const an = R() * Math.PI * 2, d = r * (1.2 + R() * 0.75), rr = (3 + R() * 9) * grow * cam.z / 0.58; g.beginPath(); g.arc(s[0] + Math.cos(an) * d, s[1] + Math.sin(an) * d * 0.9, rr, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------- text system (AD 2's)
const SANS = (w, s) => `${w} ${s}px Inter`;
const SERIF = (w, s, it = false) => `${it ? 'italic ' : ''}${w} ${s}px Lora`;
const caps = (s, t, color = C.white) => ({ s, t, st: { font: SANS(800, 108), color } });
const ser = (s, t, color = C.white, it = false, size = 96) => ({ s, t, st: { font: SERIF(600, size, it), color } });
const BLOCKS = [
  { id: 'hook', y: 250, lh: 112, fit: 920, lines: [
    [caps('YOUR', -0.4), caps('FAITH', -0.4)],
    [caps("DIDN'T", WD.didnt), caps('START', WD.start)],
    [caps('IN', WD.in), caps('THE', WD.the), caps('WEST.', WD.west, C.rubricHi)],
  ], out: T.whip - 0.02, outDur: 0.16 },
  { id: 'carried', y: 262, lh: 108, fit: 920, lines: [
    [ser('It', WD.it), ser('was', WD.was), ser('carried', WD.carried), ser('here', WD.here)],
    [ser('by', WD.by), ser('early', WD.early), ser('Christians.', WD.christians, C.rubricHi)],
  ], out: T.bled - 0.06, outDur: 0.14 },
  { id: 'writings', y: 262, lh: 112, fit: 920, lines: [
    [caps('THEIR', WD.their), caps('ORIGINAL', WD.original)],
    [caps('WRITINGS', WD.writings)],
  ], out: WD.completely - 0.06, outDur: 0.12 },
  { id: 'ignored', y: 262, lh: 112, fit: 920, lines: [
    [caps('COMPLETELY', WD.completely)],
    [caps('IGNORED.', WD.ignored, C.rubricHi)],
  ], out: T.open - 0.06, outDur: 0.14 },
  { id: 'built', y: 236, lh: 100, fit: 900, lines: [
    [ser('We', WD.we, C.white, false, 88), ser('built', WD.built, C.white, false, 88), ser('Purify', WD.purify1, C.rubricHi, true, 88)],
    [ser('to', WD.to, C.white, false, 88), ser('give', WD.give, C.white, false, 88), ser('you', WD.you, C.white, false, 88), ser('their', WD.their2, C.white, false, 88)],
    [ser('exact', WD.exact, C.rubricHi, false, 88), ser('words.', WD.words, C.rubricHi, false, 88)],
  ], out: 12.6, outDur: 0.12 },
  { id: 'read', y: 262, lh: 108, fit: 920, lines: [
    [ser('Read', WD.read), ser('the', WD.the3)],
    [ser('early', WD.early2), ser('Christians.', WD.christians2, C.rubricHi)],
  ], out: T.free - 0.04, outDur: 0.12 },
  { id: 'free', y: 820, lh: 100, lines: [
    [ser('Completely', WD.completely2, C.white, false, 104), ser('free.', WD.free, C.rubricHi, true, 104)],
  ], out: T.lock - 0.04, outDur: 0.14 },
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
function topShade(g, h = 640, a = 0.9) {
  const tg = g.createLinearGradient(0, 0, 0, h); tg.addColorStop(0, `rgba(5,7,13,${a})`); tg.addColorStop(0.62, `rgba(5,7,13,${(a * 0.72).toFixed(3)})`); tg.addColorStop(1, 'rgba(5,7,13,0)');
  g.fillStyle = tg; g.fillRect(0, 0, W, h);
}

// ---------------------------------------------------------------- scene 1 and 2: the map, the road west, the martyrs
// Names, places and years exactly as Purify's saints index gives them (lib/saints/saints.ts).
const MARTYRS = [
  ['STEPHEN', 'JERUSALEM', 'c. 34'], ['PETER AND PAUL', 'ROME', 'c. 67'], ['IGNATIUS', 'ROME', 'c. 108'],
  ['POLYCARP', 'SMYRNA', 'c. 155'], ['JUSTIN', 'ROME', 'c. 165'], ['CYPRIAN', 'CARTHAGE', '258'], ['LAWRENCE', 'ROME', '258'],
];
const M0 = T.bled + 0.34, MSTEP = 0.11, MOUT = T.letters - 0.06;
function sceneMap(g, t) {
  nightBg(g);
  const dk = E.inOut2(seg(t, T.bled + 0.18, T.bled + 0.46));
  drawMap(g, t, { labels: 1 - dk });
  topShade(g, lerp(720, 600, E.inOut2(seg(t, T.whip, T.whip + 0.4))));
  // the martyrs, over the map gone dark
  if (dk > 0) {
    g.fillStyle = `rgba(5,7,13,${(0.86 * dk).toFixed(3)})`; g.fillRect(0, 0, W, H);
    drawDust(g, t, 0.5 * dk);
    const out = E.in2(seg(t, MOUT, MOUT + 0.16));
    g.save(); g.globalAlpha = 1 - out;
    const hp = E.out3(seg(t, M0 - 0.1, M0 + 0.2));
    g.globalAlpha = (1 - out) * hp; g.textAlign = 'center'; g.font = SANS(700, 30); g.letterSpacing = '12px'; g.fillStyle = C.rubricHi; g.fillText('THE MARTYRS', 540 + 6, 420);
    g.fillStyle = C.rubric; g.fillRect(540 - 60 * hp, 452, 120 * hp, 3);
    MARTYRS.forEach(([name, place, year], i) => {
      const t0 = M0 + i * MSTEP, p = E.out3(seg(t, t0, t0 + 0.26));
      if (p <= 0) return;
      const y = 600 + i * 150;
      g.save(); g.globalAlpha = p * (1 - out);
      if (p < 1) g.filter = `blur(${(8 * (1 - p)).toFixed(1)}px)`;
      g.translate(-40 * (1 - p), 0);
      g.textAlign = 'left'; g.font = SANS(800, 56); g.letterSpacing = '2px'; g.fillStyle = C.white; g.fillText(name, 110, y);
      const nw = g.measureText(name).width;
      g.textAlign = 'right'; g.font = SANS(600, 30); g.letterSpacing = '5px'; g.fillStyle = C.steel; const det = `${place}  ·  ${year}`; g.fillText(det, 975, y - 4);
      const dw = g.measureText(det).width;
      g.fillStyle = 'rgba(166,178,196,0.35)'; for (let x = 110 + nw + 26; x < 975 - dw - 22; x += 16) { g.beginPath(); g.arc(x, y - 14, 2.2, 0, Math.PI * 2); g.fill(); }
      g.restore();
    });
    g.restore();
  }
}

// ---------------------------------------------------------------- scene 3: seven letters, unread
// The seven letters of Ignatius in Purify, by the app's own titles.
const LETTERS = ['To the Ephesians', 'To the Magnesians', 'To the Trallians', 'To the Romans', 'To the Philadelphians', 'To the Smyrnaeans', 'To Polycarp'];
const ROMANS = 3;
const LPOS = [[300, 720], [780, 720], [300, 1010], [780, 1010], [300, 1300], [780, 1300], [540, 1590]];
const LW = 420, LH = 250;
function sealPath(r, seed) { const R = rng(seed), p = new Path2D(); for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2, rr = r * (1 + (R() - 0.5) * 0.12); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (k) p.lineTo(x, y); else p.moveTo(x, y); } p.closePath(); return p; }
const SEALS = LETTERS.map((_, i) => sealPath(34, 70 + i));
function drawSeal(g, i, crack = 0) {
  const draw = () => {
    const rg = g.createRadialGradient(-10, -12, 4, 0, 0, 40); rg.addColorStop(0, '#d0454a'); rg.addColorStop(0.6, C.rubric); rg.addColorStop(1, '#6e1418');
    g.fillStyle = rg; g.fill(SEALS[i]);
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,240,240,0.42)'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, -13); g.lineTo(0, 13); g.moveTo(-9, -4); g.lineTo(9, -4); g.stroke();
  };
  if (crack <= 0) { draw(); return; }
  for (const side of [-1, 1]) {
    g.save(); g.translate(side * 14 * crack, 10 * crack * crack); g.rotate(side * 0.5 * crack);
    g.beginPath(); g.rect(side < 0 ? -50 : 0, -50, 50, 100); g.clip(); draw(); g.restore();
  }
}
function drawLetter(g, i, x, y, s, rot, dim, crack = 0, flap = 0, part = 'all') {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (dim > 0) g.filter = `grayscale(${(0.85 * dim).toFixed(2)}) brightness(${(1 - 0.62 * dim).toFixed(2)})`;
  if (part === 'flap') { drawFlap(g, flap); g.restore(); return; }
  g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 40; g.shadowOffsetY = 22;
  const lg = g.createLinearGradient(-LW / 2, -LH / 2, LW / 2, LH / 2); lg.addColorStop(0, '#efeee9'); lg.addColorStop(1, '#dcdbd5');
  g.fillStyle = lg; g.fillRect(-LW / 2, -LH / 2, LW, LH); g.restore();
  g.strokeStyle = 'rgba(28,26,22,0.16)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(-LW / 2, LH / 2); g.lineTo(-LW * 0.12, 6); g.moveTo(LW / 2, LH / 2); g.lineTo(LW * 0.12, 6); g.stroke();
  if (part === 'all') drawFlap(g, flap);
  g.save(); g.translate(0, LH * 0.45 - LH / 2 + 12); drawSeal(g, i, crack); g.restore();
  g.font = 'italic 500 30px Lora'; g.letterSpacing = '0px'; g.textAlign = 'center'; g.fillStyle = C.ink; g.fillText(LETTERS[i], 0, LH / 2 - 34);
  g.restore();
}
// the flap: closed, or lifting open on its hinge at the top edge
function drawFlap(g, flap) {
  g.save(); g.translate(0, -LH / 2); g.scale(1, Math.cos(Math.PI * flap)); g.translate(0, LH / 2); g.fillStyle = flap > 0.5 ? '#c9c8c1' : '#e6e5df';
  g.beginPath(); g.moveTo(-LW / 2, -LH / 2); g.lineTo(0, 14 - LH / 2 + LH * 0.45); g.lineTo(LW / 2, -LH / 2); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(28,26,22,0.2)'; g.stroke(); g.restore();
}
const romansCrack = t => E.out3(seg(t, T.open, T.open + 0.22)), romansFlap = t => E.inOut2(seg(t, T.open + 0.08, T.open + 0.3));
function sceneLetters(g, t) {
  nightBg(g, 0.2);
  const dim = E.inOut2(seg(t, T.dim, WD.today + 0.2)), away0 = E.inOut2(seg(t, T.open - 0.42, T.open));
  drawDust(g, t, (0.5 + 0.9 * dim) * (1 - away0) + 0.45 * away0);
  g.save(); g.textAlign = 'center'; g.font = SANS(700, 23); g.letterSpacing = '5px';
  g.globalAlpha = E.out3(seg(t, T.letters + 0.1, T.letters + 0.5)) * (1 - E.in2(seg(t, T.open - 0.3, T.open)));
  g.fillStyle = C.steel; g.fillText('IGNATIUS OF ANTIOCH  ·  SEVEN LETTERS  ·  c. 108', 540 + 2.5, 560);
  g.restore();
  const away = E.inOut2(seg(t, T.open - 0.42, T.open));
  for (let i = 0; i < LETTERS.length; i++) {
    const t0 = T.letters + i * 0.07, p = E.out3(seg(t, t0, t0 + 0.42));
    if (p <= 0) continue;
    const [x, y] = LPOS[i], R = rng(400 + i), rot = (R() - 0.5) * 0.08;
    if (i === ROMANS) continue;
    g.save(); g.globalAlpha = p * (1 - away);
    drawLetter(g, i, x, y + 420 * (1 - p) + 60 * away, 0.92 * (1 - 0.04 * dim), rot * (1 - 0.3 * p), dim);
    g.restore();
  }
  // To the Romans steps forward, its seal breaks, and it opens
  const t0 = T.letters + ROMANS * 0.07, p = E.out3(seg(t, t0, t0 + 0.42));
  if (p > 0) {
    const [x, y] = LPOS[ROMANS], fwd = E.inOut3(seg(t, T.open - 0.42, T.open)), crack = romansCrack(t), flap = romansFlap(t);
    const s = lerp(0.92 * (1 - 0.04 * dim), 1.35, fwd);
    drawLetter(g, ROMANS, lerp(x, 540, fwd), lerp(y + 420 * (1 - p), 1150, fwd), s, lerp(-0.02, 0, fwd), dim * (1 - fwd), crack, flap);
  }
}

// ---------------------------------------------------------------- scene 4: the letter's page becomes the reader
// The capture is the app's own /saints/ignatius-of-antioch/epistle-to-the-romans at 390 by 844. The page
// that leaves the envelope is that same screen inked onto vellum, so the change to the phone is one
// continuous thing: the same words, a new material, the sheet growing into the screen it already is.
const PH_CSS = [390, 844], PH = { cx: 540, cy: 1200, sc: 1.54 };
const STRIP_K = 2;                       // strip pixels per CSS px
const STATUS = 47;                       // the phone's status bar, CSS px
const VIEW = PH_CSS[1] - STATUS;         // what the screen shows below it
const PAGE_FROM = 70;                    // the page as the letter shows it: below the app's top bar
const QUOTE = [[305.8, 3797.2, 34.2, 22], [21.3, 3826.1, 336.4, 22], [21.3, 3855, 326.6, 22], [21.3, 3883.9, 245, 22]];
const MARKS = [10.97, 11.14, WD.exact, WD.words];
const SCROLL_TO = 3470;
const PG = (() => {
  const sw = PH_CSS[0] * PH.sc, sh = PH_CSS[1] * PH.sc, bez = 20, FW = sw + bez * 2, FH = sh + bez * 2, x0 = PH.cx - FW / 2, y0 = PH.cy - FH / 2;
  return { sw, sh, bez, FW, FH, x0, y0, sx: x0 + bez, sy: y0 + bez, top: y0 + bez + STATUS * PH.sc };
})();
function readerScroll(t) { return lerp(PAGE_FROM, SCROLL_TO, E.inOut3(seg(t, T.scroll[0], T.scroll[1]))); }
let INKED = null;
function buildInked() {
  // the reader's first screen, its light text on dark turned to ink on vellum, fibres and all
  const w = PH_CSS[0] * STRIP_K, h = VIEW * STRIP_K;
  INKED = mk(w, h); const g = INKED.getContext('2d');
  g.drawImage(IM.strip, 0, PAGE_FROM * STRIP_K, w, h, 0, 0, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data, V = [232, 231, 226], K = [28, 26, 22];
  for (let i = 0; i < d.length; i += 4) {
    const L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255, k = clamp((L - 0.075) / 0.78);
    d[i] = V[0] + (K[0] - V[0]) * k; d[i + 1] = V[1] + (K[1] - V[1]) * k; d[i + 2] = V[2] + (K[2] - V[2]) * k;
  }
  g.putImageData(id, 0, 0);
  const R = rng(13);
  for (let i = 0; i < 6000; i++) { const v = R(); g.fillStyle = v < 0.5 ? `rgba(120,118,112,${0.02 + R() * 0.035})` : `rgba(255,255,255,${0.04 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rrect2(g, x, y, w, h, rt, rb) {
  g.beginPath(); g.moveTo(x + rt, y); g.lineTo(x + w - rt, y); g.arcTo(x + w, y, x + w, y + rt, rt); g.lineTo(x + w, y + h - rb); g.arcTo(x + w, y + h, x + w - rb, y + h, rb);
  g.lineTo(x + rb, y + h); g.arcTo(x, y + h, x, y + h - rb, rb); g.lineTo(x, y + rt); g.arcTo(x, y, x + rt, y, rt); g.closePath();
}
function phoneBody(g, a, s = 1) {
  g.save(); g.globalAlpha *= a; g.translate(PH.cx, PH.cy); g.scale(s, s); g.translate(-PH.cx, -PH.cy);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 90; g.shadowOffsetY = 40;
  rrect(g, PG.x0, PG.y0, PG.FW, PG.FH, 78); const body = g.createLinearGradient(PG.x0, PG.y0, PG.x0 + PG.FW, PG.y0 + PG.FH); body.addColorStop(0, '#2c2f36'); body.addColorStop(0.5, '#121418'); body.addColorStop(1, '#23262c');
  g.fillStyle = body; g.fill(); g.restore();
  rrect(g, PG.x0 + 1.5, PG.y0 + 1.5, PG.FW - 3, PG.FH - 3, 77); g.strokeStyle = 'rgba(200,214,240,0.28)'; g.lineWidth = 2.5; g.stroke();
  rrect(g, PG.sx, PG.sy, PG.sw, PG.sh, 58); g.fillStyle = C.app; g.fill();
  g.restore();
}
function phoneChrome(g, a) {
  // the app's top bar (it stays once the page has scrolled), the status bar, and the glass
  g.save(); g.globalAlpha *= a; rrect(g, PG.sx, PG.sy, PG.sw, PG.sh, 58); g.clip();
  g.drawImage(IM.bar, PG.sx, PG.top, PG.sw, 54 * PH.sc);
  const k = PH.sc, bx = PG.sx + PG.sw - 34 * k, by = PG.sy + 25 * k;
  g.fillStyle = C.app; g.fillRect(PG.sx, PG.sy, PG.sw, STATUS * k);
  g.fillStyle = '#f3f1ec'; g.font = SANS(600, 15 * k); g.letterSpacing = '0px'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('9:41', PG.sx + 52 * k, PG.sy + 25 * k);
  rrect(g, PG.sx + PG.sw / 2 - 62 * k, PG.sy + 11 * k, 124 * k, 34 * k, 17 * k); g.fillStyle = '#000'; g.fill();
  rrect(g, bx - 12 * k, by - 6 * k, 24 * k, 12 * k, 3.5 * k); g.strokeStyle = 'rgba(243,241,236,0.55)'; g.lineWidth = 1.2 * k; g.stroke();
  rrect(g, bx - 10 * k, by - 4 * k, 18 * k, 8 * k, 2 * k); g.fillStyle = '#f3f1ec'; g.fill();
  for (let j = 0; j < 4; j++) g.fillRect(PG.sx + PG.sw - 92 * k + j * 5 * k, by + 4 * k - (3 + j * 2.4) * k, 3 * k, (3 + j * 2.4) * k);
  const gl = g.createLinearGradient(PG.sx, PG.sy, PG.sx + PG.sw, PG.sy + PG.sh * 0.6); gl.addColorStop(0, 'rgba(255,255,255,0.05)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(PG.sx, PG.sy, PG.sw, PG.sh);
  g.restore();
}
// the screen comes on from the top: a soft-edged wipe, so no frame is half page and half screen
let PAGE_TMP = null;
function darkPage(g, x, y, w, h, srcH, sc, mc) {
  if (!PAGE_TMP) PAGE_TMP = mk(Math.ceil(PG.sw) + 4, Math.ceil(VIEW * PH.sc) + 4);
  const k = PAGE_TMP.getContext('2d'), edge = 90, wy = (h + edge) * mc - edge;
  k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1; k.clearRect(0, 0, PAGE_TMP.width, PAGE_TMP.height);
  k.fillStyle = C.app; k.fillRect(0, 0, w, h);
  k.drawImage(IM.strip, 0, PAGE_FROM * STRIP_K, PH_CSS[0] * STRIP_K, srcH * STRIP_K, 0, 0, w, srcH * sc);
  const gr = k.createLinearGradient(0, wy, 0, wy + edge); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  k.globalCompositeOperation = 'destination-in'; k.fillStyle = gr; k.fillRect(0, 0, w, h); k.globalCompositeOperation = 'source-over';
  g.drawImage(PAGE_TMP, 0, 0, w, h, x, y, w, h);
}
function drawPage(g, r, mo, mc) {
  const [x, y, w, h] = r, sc = w / PH_CSS[0], rt = lerp(3, 0, mo), rb = lerp(3, 58, mo), srcH = Math.min(VIEW, h / sc);
  if (mc < 1) { g.save(); g.globalAlpha *= 1 - mc; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 44; g.shadowOffsetY = 22; rrect2(g, x, y, w, h, rt, rb); g.fillStyle = C.vellum; g.fill(); g.restore(); }
  g.save(); rrect2(g, x, y, w, h, rt, rb); g.clip();
  g.fillStyle = C.vellum; g.fillRect(x, y, w, h);
  g.drawImage(INKED, 0, 0, PH_CSS[0] * STRIP_K, srcH * STRIP_K, x, y, w, srcH * sc);
  if (mc > 0) darkPage(g, x, y, w, h, srcH, sc, mc);
  g.restore();
  // the folds, flattening as it opens
  if (mo < 1) {
    g.save(); g.strokeStyle = `rgba(28,26,22,${(0.2 * (1 - mo) * (1 - mc)).toFixed(3)})`; g.lineWidth = 1.5;
    for (const f of [1 / 3, 2 / 3]) { const fy = y + VIEW * sc * f; if (fy < y + h - 2) { g.beginPath(); g.moveTo(x + 2, fy); g.lineTo(x + w - 2, fy); g.stroke(); } }
    g.restore();
  }
}
function drawOpening(g, t) {
  const S = 1.35, EX = 540, EY = 1150, crack = romansCrack(t), flap = romansFlap(t);
  if (t < T.sheetUp[0]) { drawLetter(g, ROMANS, EX, EY, S, 0, 0, crack, flap); return; }
  const up = E.inOut2(seg(t, T.sheetUp[0], T.sheetUp[1])), fall = E.in2(seg(t, T.envOut[0], T.envOut[1]));
  const mo = E.inOut3(seg(t, T.morph[0], T.morph[1])), mc = E.inOut2(seg(t, T.morph[0] + 0.14, T.morph[1] + 0.02)), pin = E.out3(seg(t, T.phoneIn[0], T.phoneIn[1]));
  if (pin > 0) phoneBody(g, pin, lerp(1.05, 1, pin));
  const ey = EY + 760 * fall, ea = 1 - fall;
  if (ea > 0) { g.save(); g.globalAlpha *= ea; drawLetter(g, ROMANS, EX, ey, S, 0, 0, crack, flap, 'flap'); g.restore(); }
  // folded in three: the top third rises out of the envelope, then the sheet opens into the screen
  const envTop = EY - LH / 2 * S, fw = LW * 0.86 * S, fh = VIEW * (fw / PH_CSS[0]) / 3;
  const envBot = EY + LH / 2 * S - 14, top0 = envTop + 30 - (fh + 18) * up;
  const r0 = [EX - fw / 2, top0, fw, Math.min(fh + 140, envBot - top0)], r1 = [PG.sx, PG.top, PG.sw, VIEW * PH.sc];   // never below the envelope
  drawPage(g, [lerp(r0[0], r1[0], mo), lerp(r0[1], r1[1], mo), lerp(r0[2], r1[2], mo), lerp(r0[3], r1[3], mo)], mo, mc);
  if (ea > 0) { g.save(); g.globalAlpha *= ea; drawLetter(g, ROMANS, EX, ey, S, 0, 0, crack, flap, 'body'); g.restore(); }
  if (pin > 0) phoneChrome(g, pin);
}
function drawPhone(g, t) {
  const out = E.inOut2(seg(t, T.readOut, T.readOut + 0.42));
  g.save();
  g.translate(PH.cx, PH.cy + 300 * out); g.scale(1 - 0.04 * out, 1 - 0.04 * out); g.translate(-PH.cx, -PH.cy);
  g.globalAlpha *= 1 - out;
  phoneBody(g, 1);
  g.save(); rrect(g, PG.sx, PG.sy, PG.sw, PG.sh, 58); g.clip();
  const A = g.globalAlpha, y0 = readerScroll(t - 1 / 240), y1 = readerScroll(t + 1 / 240), span = Math.abs(y1 - y0) * PH.sc, N = clamp(Math.ceil(span / 2.5), 1, 30);
  for (let i = 0; i < N; i++) {
    const yy = N > 1 ? lerp(y0, y1, i / (N - 1)) : readerScroll(t);
    g.globalAlpha = A * (N > 1 ? 1 / (i + 1) : 1);
    g.drawImage(IM.strip, 0, yy * STRIP_K, PH_CSS[0] * STRIP_K, VIEW * STRIP_K, PG.sx, PG.top, PG.sw, VIEW * PH.sc);
  }
  g.globalAlpha = A;
  const ys = readerScroll(t);
  // the exact words, marked in rubric red
  QUOTE.forEach(([qx, qy, qw, qh], i) => {
    const m = E.out3(seg(t, MARKS[i] - 0.05, MARKS[i] + 0.22));
    if (m <= 0) return;
    const x = PG.sx + qx * PH.sc, y = PG.top + (qy - ys) * PH.sc, w = qw * PH.sc, h = qh * PH.sc;
    g.save(); g.fillStyle = 'rgba(217,58,63,0.22)'; g.fillRect(x - 3, y - 2, (w + 6) * m, h + 6);
    g.fillStyle = C.rubricHi; g.shadowColor = 'rgba(217,58,63,0.7)'; g.shadowBlur = 12; g.fillRect(x - 2, y + h + 4, (w + 4) * m, 3.5); g.restore();
  });
  g.restore();
  phoneChrome(g, 1);
  g.restore();
}
function readerCam(t) {
  // in on the passage as it is marked, then a slow push while it is read
  const z1 = E.inOut3(seg(t, 10.75, 11.3)), z2 = seg(t, 11.3, T.readOut + 0.42);
  return { z: 1 + 0.22 * z1 + 0.05 * z2, cy: 560 };
}
function sceneReader(g, t) {
  nightBg(g, 0.3);
  drawDust(g, t, 0.45);
  const cam = readerCam(t);
  g.save(); g.translate(540, cam.cy); g.scale(cam.z, cam.z); g.translate(-540, -cam.cy);
  if (t < T.phoneIn[1]) drawOpening(g, t); else drawPhone(g, t);
  g.restore();
  topShade(g, 600, 0.88);
}

// ---------------------------------------------------------------- scene 5: the early Christians in Purify
// Each writer's own words in the app, by its titles (data/saints). Set like a manuscript's list: the
// first letter in red, the title under it, no boxes.
const WRITERS = [
  ['Ignatius of Antioch', 'Seven letters'], ['Polycarp of Smyrna', 'Epistle to the Philippians'], ['Justin Martyr', 'The First Apology'],
  ['Irenaeus of Lyons', 'Against Heresies: On the Fourth Gospel'], ['Cyprian of Carthage', 'On the Unity of the Church'],
];
function sceneEarly(g, t) {
  nightBg(g, 0.3);
  drawDust(g, t, 0.5);
  const out = E.in2(seg(t, T.free - 0.12, T.free + 0.16));
  WRITERS.forEach(([name, work], i) => {
    const t0 = T.list + i * 0.09, p = E.out3(seg(t, t0, t0 + 0.45));
    if (p <= 0) return;
    const y = 690 + i * 178;
    g.save(); g.globalAlpha *= p * (1 - out);
    if (p < 1) g.filter = `blur(${(8 * (1 - p)).toFixed(1)}px)`;
    g.translate(0, 26 * (1 - p));
    g.textBaseline = 'alphabetic'; g.letterSpacing = '0px'; g.textAlign = 'left';
    g.font = SERIF(600, 56); const first = name[0], rest = name.slice(1), wf = g.measureText(first).width, wr = g.measureText(rest).width, x0 = 540 - (wf + wr) / 2;
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24;
    g.fillStyle = C.rubricHi; g.fillText(first, x0, y); g.fillStyle = C.white; g.fillText(rest, x0 + wf, y);
    g.font = SERIF(500, 31, true); g.textAlign = 'center'; g.fillStyle = C.steel; g.fillText(work, 540, y + 50);
    g.restore();
    if (i < WRITERS.length - 1) {
      const q = E.out3(seg(t, t0 + 0.2, t0 + 0.5));
      g.save(); g.globalAlpha *= q * (1 - out); g.translate(540, y + 108); g.rotate(Math.PI / 4); g.fillStyle = C.rubric; g.fillRect(-4, -4, 8, 8); g.restore();
    }
  });
}

// ---------------------------------------------------------------- scene 6: free, over the whole road
const FREE_CAM = { c: null, z: 0.6 };
function sceneFree(g, t) {
  nightBg(g);
  if (!FREE_CAM.c) FREE_CAM.c = proj(24.6, 39.4);
  const drift = seg(t, T.free, T.lock + 0.3);
  const L = RLEN[RLEN.length - 1] * E.inOut2(seg(t, T.free + 0.05, T.free + 0.8));
  drawMap(g, t, { full: true, L, cam: { c: [FREE_CAM.c[0] + 60 * drift, FREE_CAM.c[1]], z: FREE_CAM.z * (1 + 0.04 * drift) } });
  g.fillStyle = 'rgba(5,7,13,0.5)'; g.fillRect(0, 0, W, H);
  topShade(g, 520, 0.6);
  const hg = g.createRadialGradient(540, 790, 40, 540, 790, 560); hg.addColorStop(0, 'rgba(5,7,13,0.62)'); hg.addColorStop(1, 'rgba(5,7,13,0)');
  g.fillStyle = hg; g.fillRect(0, 200, W, 1200);
  drawDust(g, t, 0.4);
}

// ---------------------------------------------------------------- scene 7: the lockup (AD 2's)
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
function fadeIn(g, t, a, b, fn) { const k = E.inOut2(seg(t, a, b)); if (k <= 0) return; if (k >= 1) { fn(g, t); return; } g.save(); g.globalAlpha = k; fn(g, t); g.restore(); }
function drawWorld(g, t) {
  if (t < T.letters + 0.06) sceneMap(g, t);
  else if (t < T.open) sceneLetters(g, t);
  else if (t < T.list + 0.3) sceneReader(g, t);
  else if (t < T.free + 0.16) sceneEarly(g, t);
  else sceneFree(g, t);
  if (t >= T.letters - 0.14 && t < T.letters + 0.06) fadeIn(g, t, T.letters - 0.14, T.letters + 0.06, sceneLetters);
  if (t >= T.list - 0.02 && t < T.list + 0.3) fadeIn(g, t, T.list - 0.02, T.list + 0.3, sceneEarly);
  if (t >= T.free - 0.1 && t < T.free + 0.16) fadeIn(g, t, T.free - 0.1, T.free + 0.16, sceneFree);
  if (t >= T.lock - 0.02) fadeIn(g, t, T.lock - 0.02, T.lock + 0.3, sceneLockup);
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
// TikTok cover: the hook over the whole road from Jerusalem to Rome
function renderCover() {
  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.filter = 'none';
  nightBg(bctx);
  drawMap(bctx, 99, { full: true, cam: { c: proj(24.2, 36.4), z: 0.6 } });
  topShade(bctx, 1000, 0.94);
  bctx.save(); bctx.textAlign = 'center'; bctx.shadowColor = 'rgba(0,0,0,0.7)'; bctx.shadowBlur = 36;
  bctx.font = SANS(800, 118); const sc = Math.min(1, 900 / bctx.measureText("DIDN'T START").width); bctx.font = SANS(800, 118 * sc);
  bctx.fillStyle = C.white; bctx.fillText('YOUR FAITH', 540, 470); bctx.fillText("DIDN'T START", 540, 470 + 124 * sc);
  const a = bctx.measureText('IN THE ').width, b = bctx.measureText('WEST.').width, x = 540 - (a + b) / 2;
  bctx.textAlign = 'left'; bctx.fillText('IN THE', x, 470 + 248 * sc); bctx.fillStyle = C.rubricHi; bctx.fillText('WEST.', x + a, 470 + 248 * sc);
  bctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(BUF, 0, 0);
  post(0.5, 0);
}
window.renderFrame = renderFrame;
window.renderCover = renderCover;
loadAll().then(() => { renderFrame(0); window.READY = true; }).catch(e => { window.LOAD_ERROR = String(e && e.message || e); });
