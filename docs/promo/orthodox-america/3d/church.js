// The church of scene three: its form, as plain numbers. No drawing happens
// here; shot.js takes these lists and draws them.
//
// One tradition, drawn true: the Byzantine cross-in-square of the Greek
// churches (the middle Byzantine type, as at Hosios Loukas and in the small
// churches of Athens). A square nave; four arms of a cross under barrel vaults,
// higher than the four corner bays; four columns that carry a drum of eight
// arched windows and one dome; three apses to the east, the middle one the
// largest; a narthex to the west; a plain cross on the dome. No onion dome and
// no three-bar cross: those belong to the Russian tradition, and nothing here
// is mixed. Inside, the icon screen is a low wall with its middle open:
// architecture only. No icon, face or saint is drawn anywhere.
//
// Axes: x is east (the apses), y is up from the floor, z is south. One unit is
// the film's map unit.
export const TRADITION = "Byzantine cross-in-square, the Greek tradition";
export const DIM = {
  A: 1.3, // half the nave's side
  a: 0.52, // half an arm's width: the barrel vaults' radius
  b: 0.6, // half the square the drum stands on
  narthex: 0.75, // its depth, west of the nave
  h1: 1.45, // the corner bays' walls
  h2: 2.0, // the arms' walls, where the vaults spring
  h3: 2.62, // the foot of the drum
  h4: 3.22, // the foot of the dome
  drum: 0.5, dome: 0.54, domeRise: 0.44,
  apse: { r: 0.5, h: 1.25, rise: 0.36 }, side: { r: 0.3, h: 0.95, rise: 0.22, z: 0.91 },
  hn: 1.05, hn2: 1.3, // the narthex wall, and where its roof meets the nave
  column: 0.06, screen: { x: 0.66, h: 0.55, gap: 0.11 }, // the icon screen: a low wall across the east arm, open in the middle
  cross: { foot: -0.02, h: 0.5, w: 0.3, bar: 0.05, at: 0.3 }, // a plain cross: one bar, 0.3 from its foot up
};
const { A, a, b, h1, h2, h3, h4 } = DIM;
export const TOP = h4 + DIM.domeRise; // the crown of the dome
const WEST = -A - DIM.narthex;

const tri = [], nor = []; // the stone: triangles and a normal for each corner
const lines = []; // the drawing: segments, revealed from the floor up
const plan = []; // the plan on the floor: polylines of [x, z]
const glass = [], sill = []; // the windows: triangles, and for each corner the height its window lights at
const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const unit = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross3 = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
/** A triangle, flat unless each corner brings its own normal. */
function face(p, q, r, np, nq, nr) {
  const n = unit(cross3(sub(q, p), sub(r, p)));
  if (!Number.isFinite(n[0]) || Math.hypot(...cross3(sub(q, p), sub(r, p))) < 1e-9) return;
  tri.push(...p, ...q, ...r); nor.push(...(np || n), ...(nq || n), ...(nr || n));
}
const quad = (p, q, r, s, np, nq, nr, ns) => { face(p, q, r, np, nq, nr); face(p, r, s, np, nr, ns); };
const line = (p, q) => lines.push(...p, ...q);
const path = (pts) => { for (let i = 0; i + 1 < pts.length; i++) line(pts[i], pts[i + 1]); };
const steps = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/** A wall standing on the line from p to q on the floor ([x, z]); its foot and its top may vary along it. */
function wall(p, q, foot, top, n = 1) {
  const at = (u, y) => [p[0] + (q[0] - p[0]) * u, y, p[1] + (q[1] - p[1]) * u];
  const f = (u) => (typeof foot === "function" ? foot(u) : foot), t = (u) => (typeof top === "function" ? top(u) : top);
  for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n; quad(at(u0, f(u0)), at(u1, f(u1)), at(u1, t(u1)), at(u0, t(u0))); }
  path(steps(n, (u) => at(u, t(u)))); // its top edge is a line of the drawing
  if (n > 1 && typeof foot === "function") path(steps(n, (u) => at(u, f(u))));
}
const post = (x, z, y0, y1) => line([x, y0, z], [x, y1, z]); // a standing edge of the drawing
/** A round wall: part of a cylinder about (cx, cz). */
function round(cx, cz, r, a0, a1, y0, y1, n) {
  const at = (t, y) => [cx + r * Math.cos(t), y, cz + r * Math.sin(t)], out = (t) => [Math.cos(t), 0, Math.sin(t)];
  for (let i = 0; i < n; i++) { const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n; quad(at(t0, y0), at(t1, y0), at(t1, y1), at(t0, y1), out(t0), out(t1), out(t1), out(t0)); }
  path(steps(n, (u) => at(a0 + (a1 - a0) * u, y1)));
}
/** Part of a flattened sphere about (cx, y0, cz): a dome over a full circle, a conch over half of one. */
function shell(cx, cz, y0, r, rise, a0, a1, n, m, ribs) {
  const at = (t, e) => [cx + r * Math.cos(e) * Math.cos(t), y0 + rise * Math.sin(e), cz + r * Math.cos(e) * Math.sin(t)];
  const out = (t, e) => unit([Math.cos(e) * Math.cos(t) / r, Math.sin(e) / rise, Math.cos(e) * Math.sin(t) / r]);
  const E = Math.PI / 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n, e0 = (E * j) / m, e1 = (E * (j + 1)) / m;
    quad(at(t0, e0), at(t1, e0), at(t1, e1), at(t0, e1), out(t0, e0), out(t1, e0), out(t1, e1), out(t0, e1));
  }
  for (let k = 0; k < ribs; k++) { const t = a0 + ((a1 - a0) * k) / (a1 - a0 > 6 ? ribs : ribs - 1); path(steps(m, (u) => at(t, E * u))); } // its ribs
  path(steps(n, (u) => at(a0 + (a1 - a0) * u, E / 2))); // and one ring half way up
}
/** A barrel vault over an arm: half a cylinder of radius a, from one end of the arm to the square under the drum. */
function vault(along, from, to) {
  const at = (s, t) => (along === "x" ? [s, h2 + a * Math.sin(t), a * Math.cos(t)] : [a * Math.cos(t), h2 + a * Math.sin(t), s]);
  const out = (t) => (along === "x" ? [0, Math.sin(t), Math.cos(t)] : [Math.cos(t), Math.sin(t), 0]);
  const n = 20;
  for (let i = 0; i < n; i++) { const t0 = (Math.PI * i) / n, t1 = (Math.PI * (i + 1)) / n; quad(at(from, t0), at(to, t0), at(to, t1), at(from, t1), out(t0), out(t0), out(t1), out(t1)); }
  line(at(from, Math.PI / 2), at(to, Math.PI / 2)); // the line of its crown
  line(at(from, 0), at(to, 0)); line(at(from, Math.PI), at(to, Math.PI)); // and where it springs
}
/** An arched window: glass a hair off the wall, and its outline in the drawing. `on(u)` gives the wall's point and its outward direction at u across the window. */
function window_(on, w, y0, tall, arch) {
  const n = 10, off = 0.008;
  const top = (u) => y0 + tall + arch * Math.sqrt(Math.max(0, 1 - (2 * u / w) ** 2));
  const at = (u, y) => { const { p, out } = on(u); return [p[0] + out[0] * off, y, p[1] + out[1] * off]; };
  const lights = y0 + tall + arch;
  for (let i = 0; i < n; i++) {
    const u0 = -w / 2 + (w * i) / n, u1 = -w / 2 + (w * (i + 1)) / n;
    for (const p of [at(u0, y0), at(u1, y0), at(u1, top(u1)), at(u0, y0), at(u1, top(u1)), at(u0, top(u0))]) { glass.push(...p); sill.push(lights); }
  }
  path([at(-w / 2, y0), ...steps(n, (u) => { const x = -w / 2 + w * u; return at(x, top(x)); }), at(w / 2, y0), at(-w / 2, y0)]);
}
const flatWall = (ox, oz, dx, dz, nx, nz) => (u) => ({ p: [ox + dx * u, oz + dz * u], out: [nx, nz] });
const roundWall = (cx, cz, r, t0) => (u) => { const t = t0 + u / r; return { p: [cx + r * Math.cos(t), cz + r * Math.sin(t)], out: [Math.cos(t), Math.sin(t)] }; };
const half = (r, rise, h) => (u, w) => { const z = (u - 0.5) * w; return Math.abs(z) < r ? h + rise * Math.sqrt(1 - (z / r) ** 2) : 0; }; // an arched way through a wall

// ---- The walls ---------------------------------------------------------------
const gable = (u) => h2 + Math.sqrt(Math.max(0, a * a - ((u - 0.5) * 2 * a) ** 2)); // an arm's end wall follows its vault
const ap = DIM.apse, sd = DIM.side;
// North and south: a corner bay, the arm's end, a corner bay.
for (const z of [-A, A]) {
  wall([-A, z], [-a, z], 0, h1); wall([-a, z], [a, z], 0, gable, 24); wall([a, z], [A, z], 0, h1);
  for (const x of [-A, A]) post(x, z, 0, h1);
  for (const x of [-a, a]) post(x, z, 0, h2);
}
// East: each part opens into its apse through an arch.
wall([A, -a], [A, a], (u) => half(ap.r, ap.rise, ap.h)(u, 2 * a), gable, 24);
for (const s of [-1, 1]) {
  wall([A, s * a], [A, s * A], (u) => half(sd.r, sd.rise, sd.h)(u - (sd.z - a) / (A - a) + 0.5, A - a), h1, 20);
  post(A, s * a, 0, h2);
}
// West: the nave's wall behind the narthex, with its door.
wall([-A, -a], [-A, a], (u) => half(0.2, 0.2, 0.62)(u, 2 * a), gable, 24);
for (const s of [-1, 1]) { wall([-A, s * a], [-A, s * A], 0, h1); post(-A, s * a, 0, h2); }
// The arms' side walls stand on arches inside, so from the corner bays' roofs up.
for (const s of [-1, 1]) for (const t of [-1, 1]) {
  wall([s * a, t * a], [s * A, t * a], h1, h2); wall([s * a, t * a], [s * a, t * A], h1, h2);
  post(s * a, t * a, h1, h2);
  // A corner bay's roof: two slopes from the arms down to the outer walls.
  const peak = [s * a, h1 + 0.22, t * a], out = [s * A, h1, t * A];
  face(peak, [s * A, h1, t * a], out); face(peak, out, [s * a, h1, t * A]); line(peak, out);
  line(peak, [s * A, h1, t * a]); line(peak, [s * a, h1, t * A]);
}
// The vaults over the four arms.
vault("x", A, b); vault("x", -A, -b); vault("z", A, b); vault("z", -A, -b);
// The square the drum stands on, open to the dome inside.
for (const [p, q] of [[[-b, -b], [b, -b]], [[b, -b], [b, b]], [[b, b], [-b, b]], [[-b, b], [-b, -b]]]) { wall(p, q, h2, h3); post(p[0], p[1], h2, h3); }
{
  const n = 48, r = DIM.drum, sq = (t) => { const c = Math.cos(t), s = Math.sin(t), k = b / Math.max(Math.abs(c), Math.abs(s)); return [c * k, h3, s * k]; };
  for (let i = 0; i < n; i++) { const t0 = (2 * Math.PI * i) / n, t1 = (2 * Math.PI * (i + 1)) / n; quad(sq(t0), sq(t1), [r * Math.cos(t1), h3, r * Math.sin(t1)], [r * Math.cos(t0), h3, r * Math.sin(t0)]); }
}
// The drum, its eave and the dome.
round(0, 0, DIM.drum, 0, 2 * Math.PI, h3, h4, 48);
path(steps(48, (u) => [DIM.drum * Math.cos(2 * Math.PI * u), h3, DIM.drum * Math.sin(2 * Math.PI * u)]));
for (let k = 0; k < 8; k++) { const t = ((k + 0.5) * Math.PI) / 4; post(DIM.drum * Math.cos(t), DIM.drum * Math.sin(t), h3, h4); }
for (let i = 0; i < 48; i++) {
  const t0 = (2 * Math.PI * i) / 48, t1 = (2 * Math.PI * (i + 1)) / 48, r0 = DIM.drum, r1 = DIM.dome;
  quad([r0 * Math.cos(t0), h4, r0 * Math.sin(t0)], [r0 * Math.cos(t1), h4, r0 * Math.sin(t1)], [r1 * Math.cos(t1), h4, r1 * Math.sin(t1)], [r1 * Math.cos(t0), h4, r1 * Math.sin(t0)]);
}
path(steps(48, (u) => [DIM.dome * Math.cos(2 * Math.PI * u), h4, DIM.dome * Math.sin(2 * Math.PI * u)]));
shell(0, 0, h4, DIM.dome, DIM.domeRise, 0, 2 * Math.PI, 48, 12, 8);
// The three apses, each under its conch.
for (const [z, k] of [[0, ap], [-sd.z, sd], [sd.z, sd]]) {
  round(A, z, k.r, -Math.PI / 2, Math.PI / 2, 0, k.h, 20);
  shell(A, z, k.h, k.r, k.rise, -Math.PI / 2, Math.PI / 2, 20, 8, 5);
  for (const t of [-Math.PI / 2, 0, Math.PI / 2]) post(A + k.r * Math.cos(t), z + k.r * Math.sin(t), 0, k.h);
}
// The narthex: three walls and a roof that leans on the nave.
{
  const lean = (u) => DIM.hn + (DIM.hn2 - DIM.hn) * u;
  wall([WEST, -A], [WEST, A], 0, DIM.hn);
  for (const z of [-A, A]) { wall([WEST, z], [-A, z], 0, lean, 2); post(WEST, z, 0, DIM.hn); }
  quad([WEST, DIM.hn, -A], [WEST, DIM.hn, A], [-A, DIM.hn2, A], [-A, DIM.hn2, -A]);
  line([-A, DIM.hn2, -A], [-A, DIM.hn2, A]);
}
// Inside: the four columns under the dome, and the icon screen, a low wall with its middle open.
for (const s of [-1, 1]) for (const t of [-1, 1]) round(s * a, t * a, DIM.column, 0, 2 * Math.PI, 0, h2, 10);
{
  const sc = DIM.screen;
  for (const s of [-1, 1]) { wall([sc.x, s * sc.gap], [sc.x, s * a], 0, sc.h); post(sc.x, s * sc.gap, 0, sc.h); }
}

// ---- The windows ---------------------------------------------------------------
for (let k = 0; k < 8; k++) window_(roundWall(0, 0, DIM.drum, (k * Math.PI) / 4), 0.17, h3 + 0.14, 0.22, 0.085); // the drum's eight
for (const s of [-1, 1]) {
  // The north and south arms: three lights, the middle one tallest.
  window_(flatWall(0, s * A, 1, 0, 0, s), 0.2, 1.22, 0.62, 0.1);
  for (const x of [-0.3, 0.3]) window_(flatWall(x, s * A, 1, 0, 0, s), 0.15, 1.22, 0.42, 0.075);
  for (const x of [-sd.z, sd.z]) window_(flatWall(x, s * A, 1, 0, 0, s), 0.15, 0.68, 0.32, 0.075); // the corner bays
  window_(flatWall(WEST, s * 0.78, 0, 1, -1, 0), 0.15, 0.48, 0.26, 0.075); // the narthex, either side of the door
  window_(roundWall(A, s * sd.z, sd.r, 0), 0.1, 0.42, 0.22, 0.05); // the side apses
}
window_(flatWall(A, 0, 0, 1, 1, 0), 0.15, 1.8, 0.28, 0.075); // over the middle apse
window_(flatWall(-A, 0, 0, 1, -1, 0), 0.18, 1.52, 0.45, 0.09); // over the narthex
for (const t of [-0.7, 0, 0.7]) window_(roundWall(A, 0, ap.r, t), 0.13, 0.52, 0.3, 0.065); // the middle apse's three
window_(flatWall(WEST, 0, 0, 1, -1, 0), 0.32, 0, 0.56, 0.16); // the west door

// ---- The plan on the floor ------------------------------------------------------
const arc = (cx, cz, r, a0, a1, n = 32) => steps(n, (u) => [cx + r * Math.cos(a0 + (a1 - a0) * u), cz + r * Math.sin(a0 + (a1 - a0) * u)]);
plan.push([[A, -A], [-A, -A], [WEST, -A], [WEST, A], [-A, A], [A, A]]); // the outer walls
plan.push([[-A, -A], [-A, A]]); // the nave's west wall
plan.push([[A, -A], [A, -sd.z - sd.r]], [[A, -sd.z + sd.r], [A, -ap.r]], [[A, ap.r], [A, sd.z - sd.r]], [[A, sd.z + sd.r], [A, A]]); // the east wall between the apses
plan.push(arc(A, 0, ap.r, -Math.PI / 2, Math.PI / 2), arc(A, -sd.z, sd.r, -Math.PI / 2, Math.PI / 2, 20), arc(A, sd.z, sd.r, -Math.PI / 2, Math.PI / 2, 20));
plan.push(arc(0, 0, DIM.drum, 0, 2 * Math.PI, 48)); // the dome, as a plan shows it: a circle on the floor
for (const s of [-1, 1]) {
  plan.push([[-A, s * a], [A, s * a]], [[s * a, -A], [s * a, A]]); // the cross
  for (const t of [-1, 1]) plan.push(arc(s * a, t * a, DIM.column + 0.02, 0, 2 * Math.PI, 12));
  plan.push([[DIM.screen.x, s * DIM.screen.gap], [DIM.screen.x, s * a]]);
}

// ---- The cross: plain, one bar, drawn last ----------------------------------------
const crossOutline = (() => {
  const c = DIM.cross, y = TOP + c.foot, w = c.bar / 2;
  // It stands across the church, so those who come in from the west see it whole.
  return [[-w, y], [w, y], [w, y + c.at], [c.w / 2, y + c.at], [c.w / 2, y + c.at + c.bar], [w, y + c.at + c.bar], [w, y + c.h], [-w, y + c.h], [-w, y + c.at + c.bar], [-c.w / 2, y + c.at + c.bar], [-c.w / 2, y + c.at], [-w, y + c.at], [-w, y]].map(([z, yy]) => [0, yy, z]);
})();

/** Where people stand: the nave and the narthex, west of the icon screen, clear of the walls and the columns. */
export function stands(x, z) {
  if (Math.abs(z) > A - 0.07) return false;
  const nave = x > -A + 0.07 && x < DIM.screen.x - 0.09, narthex = x > WEST + 0.07 && x < -A - 0.07;
  if (!nave && !narthex) return false;
  for (const s of [-1, 1]) for (const t of [-1, 1]) if (Math.hypot(x - s * a, z - t * a) < DIM.column + 0.07) return false;
  return true;
}

export const CHURCH = { tri, nor, lines, plan, glass, sill, crossOutline };
