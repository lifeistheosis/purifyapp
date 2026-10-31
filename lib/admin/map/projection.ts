/**
 * Where a reader on the site now sits on the heat map's two frames.
 *
 * The shapes (./world.json, ./us.json) arrive already projected: the world in
 * Equal Earth, 1000 wide, the states in Albers USA at 975 x 610, both from the
 * r3-15 sheet's helper (Natural Earth and the US Census, public domain). A
 * live point comes as a latitude and a longitude, so it has to be put through
 * the same projection to land in the same place.
 *
 * Equal Earth's scale and offset were fitted from the helper's own cities
 * (48 of them, worst error a quarter of a unit); Albers USA is the standard
 * composite at the scale and offset us-atlas projects with. The constants are
 * repeated in world.json and us.json, and lib/admin/__tests__/map.test.ts
 * holds the two in step and both against the helper's cities.
 *
 * Pure, and small on purpose: no geography library is loaded for two
 * formulas.
 */

export const WORLD_VIEW = [1000, 442] as const;
export const US_VIEW = [975, 610] as const;

/** Equal Earth's fit to the shapes: x = TX + K * X, y = TY - K * Y. */
export const EQUAL_EARTH = { k: 188.245, tx: 499.979, ty: 245.74 } as const;

const RAD = Math.PI / 180;
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

function finite(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** A longitude and latitude on the world frame, or null for one that is not on Earth. */
export function projectWorld(lng: number, lat: number): [number, number] | null {
  if (!finite(lng, lat)) return null;
  const phi = lat * RAD;
  const l = Math.asin(M * Math.sin(phi));
  const l2 = l * l;
  const l6 = l2 * l2 * l2;
  const x = (lng * RAD * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
  const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
  return [EQUAL_EARTH.tx + EQUAL_EARTH.k * x, EQUAL_EARTH.ty - EQUAL_EARTH.k * y];
}

// ── Albers USA ─────────────────────────────────────────────────────────

type Conic = { parallels: [number, number]; rotate: number; center: [number, number]; scale: number; translate: [number, number] };

function conicEqualArea({ parallels, rotate, center, scale, translate }: Conic) {
  const sy0 = Math.sin(parallels[0] * RAD);
  const n = (sy0 + Math.sin(parallels[1] * RAD)) / 2;
  const c = 1 + sy0 * (2 * n - sy0);
  const r0 = Math.sqrt(c) / n;
  const raw = (x: number, y: number): [number, number] => {
    const r = Math.sqrt(c - 2 * n * Math.sin(y)) / n;
    const a = x * n;
    return [r * Math.sin(a), r0 - r * Math.cos(a)];
  };
  const mid = raw(center[0] * RAD, center[1] * RAD);
  const dx = translate[0] - scale * mid[0];
  const dy = translate[1] + scale * mid[1];
  return (lng: number, lat: number): [number, number] => {
    let l = (lng + rotate) * RAD;
    if (l > Math.PI) l -= 2 * Math.PI;
    if (l < -Math.PI) l += 2 * Math.PI;
    const p = raw(l, lat * RAD);
    return [dx + scale * p[0], dy - scale * p[1]];
  };
}

const K = 1300;
const T: [number, number] = [487.5, 305];
const E = 1e-6;
const LOWER48 = conicEqualArea({ parallels: [29.5, 45.5], rotate: 96, center: [-0.6, 38.7], scale: K, translate: T });
const ALASKA = conicEqualArea({
  parallels: [55, 65],
  rotate: 154,
  center: [-2, 58.5],
  scale: K * 0.35,
  translate: [T[0] - 0.307 * K, T[1] + 0.201 * K],
});
const HAWAII = conicEqualArea({
  parallels: [8, 18],
  rotate: 157,
  center: [-3, 19.9],
  scale: K,
  translate: [T[0] - 0.205 * K, T[1] + 0.212 * K],
});

const within = (p: [number, number], a: [number, number], b: [number, number]) =>
  p[0] >= a[0] && p[0] <= b[0] && p[1] >= a[1] && p[1] <= b[1];

/**
 * A longitude and latitude on the states frame: the lower 48, Alaska and
 * Hawaii each where us-atlas draws them. Null outside all three.
 */
export function projectUs(lng: number, lat: number): [number, number] | null {
  if (!finite(lng, lat)) return null;
  const p = LOWER48(lng, lat);
  if (within(p, [T[0] - 0.455 * K, T[1] - 0.238 * K], [T[0] + 0.455 * K, T[1] + 0.238 * K])) return p;
  const a = ALASKA(lng, lat);
  if (within(a, [T[0] - 0.425 * K + E, T[1] + 0.12 * K + E], [T[0] - 0.214 * K - E, T[1] + 0.234 * K - E])) return a;
  const h = HAWAII(lng, lat);
  if (within(h, [T[0] - 0.214 * K + E, T[1] + 0.166 * K + E], [T[0] - 0.115 * K - E, T[1] + 0.234 * K - E])) return h;
  return null;
}
