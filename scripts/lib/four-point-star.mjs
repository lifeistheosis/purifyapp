// The four-point sparkle star, measured where it is drawn. The owner's word
// of 2026-11-11 (CLAUDE.md, "No sparkle star"): the four-point sparkle is
// vibe-coded AI slop, and it appears nowhere. A glyph or the old Sparkle icon
// can be found by name; a star drawn as its own path cannot, which is how the
// app's Nativity star was missed by a search for the icon. So this reads the
// shapes in a source file (path data in quotes, and polygon points) and names
// the ones that are four-point stars, drawn either way one usually is:
//
//   - eight corners round a centre, every other one far out and the rest
//     close in (M12 1.5 L13.3 10.7 L22.5 12 ...), whatever joins them;
//   - four points round a centre, each joined to the next by a curve that
//     bows in toward the centre (the Sparkle icon, four arcs), where a circle's
//     curves bow out.
//
// A five-point star, the Octogram's square and diamond, a circle drawn in
// four curves and a horizon are not stars of this kind; the self-test in
// lib/marketing/__tests__/promoLooks.test.ts holds each of them.

const TOKEN = /[MLHVCSQTAZmlhvcsqtaz]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
const COMMAND = /^[MLHVCSQTAZ]$/i;

/** The midpoint of an arc, from its endpoints and flags (SVG 1.1, F.6.5). */
function arcMid(x1, y1, rx, ry, turn, large, sweep, x2, y2) {
  if (!rx || !ry) return [(x1 + x2) / 2, (y1 + y2) / 2];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (turn * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy;
  const yp = -sin * dx + cos * dy;
  const fit = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (fit > 1) {
    rx *= Math.sqrt(fit);
    ry *= Math.sqrt(fit);
  }
  const top = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const bottom = rx * rx * yp * yp + ry * ry * xp * xp;
  let k = bottom ? Math.sqrt(Math.max(0, top / bottom)) : 0;
  if (Boolean(large) === Boolean(sweep)) k = -k;
  const cxp = (k * rx * yp) / ry;
  const cyp = (-k * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let span = angle((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && span > 0) span -= 2 * Math.PI;
  if (sweep && span < 0) span += 2 * Math.PI;
  const t = start + span / 2;
  const ex = rx * Math.cos(t);
  const ey = ry * Math.sin(t);
  return [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy];
}

/**
 * Path data to its shapes: for each subpath, its points on the line (where
 * each segment ends) and each segment's midpoint, with whether it curves.
 */
export function shapesOf(d) {
  const tokens = d.match(TOKEN) ?? [];
  const shapes = [];
  let shape = null;
  let cmd = null;
  let i = 0;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let ctrl = null; // the last curve's second control point, for S and T
  const n = () => Number(tokens[i++]);
  const more = (count) => i + count <= tokens.length && tokens.slice(i, i + count).every((t) => !COMMAND.test(t));
  const segment = (to, mid, curved) => {
    shape.points.push(to);
    shape.mids.push({ mid, curved });
  };
  while (i < tokens.length) {
    if (COMMAND.test(tokens[i])) cmd = tokens[i++];
    else if (cmd === null) break;
    const C = cmd.toUpperCase();
    const rel = cmd !== C;
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (C === "Z") {
      if (shape && (x !== sx || y !== sy)) segment([sx, sy], [(x + sx) / 2, (y + sy) / 2], false);
      x = sx;
      y = sy;
      ctrl = null;
      if (i < tokens.length && !COMMAND.test(tokens[i])) break; // numbers after Z: not path data
      continue;
    }
    const need = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }[C];
    if (!more(need)) break;
    if (C === "M") {
      x = ox + n();
      y = oy + n();
      sx = x;
      sy = y;
      shape = { points: [[x, y]], mids: [] };
      shapes.push(shape);
      cmd = rel ? "l" : "L"; // pairs after a move are lines
      ctrl = null;
      continue;
    }
    if (!shape) {
      shape = { points: [[x, y]], mids: [] };
      shapes.push(shape);
    }
    let to;
    if (C === "L" || C === "H" || C === "V") {
      to = C === "L" ? [ox + n(), oy + n()] : C === "H" ? [ox + n(), y] : [x, oy + n()];
      segment(to, [(x + to[0]) / 2, (y + to[1]) / 2], false);
      ctrl = null;
    } else if (C === "C" || C === "S") {
      const c1 = C === "C" ? [ox + n(), oy + n()] : ctrl && ctrl.kind === "C" ? [2 * x - ctrl.at[0], 2 * y - ctrl.at[1]] : [x, y];
      const c2 = [ox + n(), oy + n()];
      to = [ox + n(), oy + n()];
      segment(to, [(x + 3 * c1[0] + 3 * c2[0] + to[0]) / 8, (y + 3 * c1[1] + 3 * c2[1] + to[1]) / 8], true);
      ctrl = { kind: "C", at: c2 };
    } else if (C === "Q" || C === "T") {
      const q = C === "Q" ? [ox + n(), oy + n()] : ctrl && ctrl.kind === "Q" ? [2 * x - ctrl.at[0], 2 * y - ctrl.at[1]] : [x, y];
      to = [ox + n(), oy + n()];
      segment(to, [(x + 2 * q[0] + to[0]) / 4, (y + 2 * q[1] + to[1]) / 4], true);
      ctrl = { kind: "Q", at: q };
    } else {
      const [rx, ry, turn, large, sweep] = [n(), n(), n(), n(), n()];
      to = [ox + n(), oy + n()];
      segment(to, arcMid(x, y, rx, ry, turn, large, sweep, to[0], to[1]), true);
      ctrl = null;
    }
    [x, y] = to;
  }
  return shapes;
}

const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

/** Whether the points go round their centre in even steps of `step` radians, all one way. */
function evenlyRound(angles, step) {
  const tolerance = (20 * Math.PI) / 180;
  const steps = angles.map((a, k) => {
    let d = angles[(k + 1) % angles.length] - a;
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    return d;
  });
  return steps.every((d) => Math.abs(d - step) < tolerance) || steps.every((d) => Math.abs(d + step) < tolerance);
}

/** Whether one shape is a four-point star. */
export function isFourPointStar({ points, mids }) {
  let pts = points;
  if (pts.length > 1 && near(pts[0], pts[pts.length - 1])) pts = pts.slice(0, -1);
  const count = pts.length;
  if (count !== 8 && count !== 4) return false;
  const cx = pts.reduce((s, p) => s + p[0], 0) / count;
  const cy = pts.reduce((s, p) => s + p[1], 0) / count;
  const r = pts.map(([px, py]) => Math.hypot(px - cx, py - cy));
  const a = pts.map(([px, py]) => Math.atan2(py - cy, px - cx));
  if (count === 8) {
    if (!evenlyRound(a, Math.PI / 4)) return false;
    const even = [0, 2, 4, 6].map((k) => r[k]);
    const odd = [1, 3, 5, 7].map((k) => r[k]);
    const [far, close] = Math.min(...even) > Math.max(...odd) ? [even, odd] : [odd, even];
    return Math.max(...close) > 0 ? Math.min(...far) / Math.max(...close) >= 2.2 : Math.min(...far) > 0;
  }
  // Four points: a sparkle only when every one of the four segments curves in.
  if (mids.length !== 4 || !mids.every((m) => m.curved)) return false;
  if (!evenlyRound(a, Math.PI / 2)) return false;
  if (Math.max(...r) / Math.min(...r) > 1.6) return false;
  const mean = r.reduce((s, v) => s + v, 0) / 4;
  return mids.every(({ mid }) => Math.hypot(mid[0] - cx, mid[1] - cy) < 0.55 * mean);
}

/**
 * The four-point stars drawn in a source file: path data in quotes (an
 * attribute, a prop or a constant) and polygon points, each with its line.
 * Path data with a template's ${} in it cannot be read, and is passed over.
 */
export function fourPointStars(source) {
  const found = [];
  const lineAt = (index) => source.slice(0, index).split("\n").length;
  for (const m of source.matchAll(/(["'`])\s*([Mm]\s*[-+.\d][^"'`$]*?)\1/g)) {
    for (const shape of shapesOf(m[2])) {
      if (isFourPointStar(shape)) found.push({ line: lineAt(m.index), shape: m[2].slice(0, 72) });
    }
  }
  for (const m of source.matchAll(/points\s*=\s*\{?\s*(["'`])([-+\d.,\s]+)\1/g)) {
    const nums = (m[2].match(/[+-]?(?:\d+\.?\d*|\.\d+)/g) ?? []).map(Number);
    const pts = [];
    for (let k = 0; k + 1 < nums.length; k += 2) pts.push([nums[k], nums[k + 1]]);
    const mids = pts.map((p, k) => {
      const q = pts[(k + 1) % pts.length];
      return { mid: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], curved: false };
    });
    if (pts.length && isFourPointStar({ points: pts, mids })) found.push({ line: lineAt(m.index), shape: m[2].slice(0, 72) });
  }
  return found;
}
