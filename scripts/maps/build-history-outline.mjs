// The history map's land (data/maps/church-history.json), rebuilt (1.9).
//
// Natural Earth land, public domain, as world-atlas 2.0.2 packages it (ISC),
// cut to a box, put on the map by the app's own sums (lib/councils/map.ts,
// projectorFor: equirectangular scaled for latitude 37), one decimal, and
// simplified within `tol` map units. Not a dependency of the app: install the
// two packages for the run alone, from the repository's root:
//
//   npm i --no-save world-atlas@2.0.2 topojson-client@3.1.0
//   node scripts/maps/build-history-outline.mjs
//
// 1.9 widened the map to longitude -172 to 50 and latitude 25 to 64, at the
// 1.8 map's scale, so Alaska and America stand where they are (the owner,
// 2026-11-06: "Alaska, that should be in Alaska").
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";

export function build({ res = "50m", box, k, tol = 0, west = null }) {
  const [lon0, lon1, lat0, lat1] = box;
  const cos = Math.cos((37 * Math.PI) / 180);
  const view = [Math.round((lon1 - lon0) * cos * k), Math.round((lat1 - lat0) * k)];
  const kk = view[0] / ((lon1 - lon0) * cos);
  const P = ([lon, lat]) => [(lon - lon0) * cos * kk, (lat1 - lat) * kk];
  const load = (r) => {
    const topo = JSON.parse(readFileSync(`node_modules/world-atlas/land-${r}.json`, "utf8"));
    return feature(topo, topo.objects.land);
  };
  const rings = (geo) => geo.features.flatMap((f) => (f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat()));
  // Sutherland-Hodgman against the box, in lon/lat (the projection is linear in both).
  const clip = (ring, [xmin, xmax, ymin, ymax]) => {
    const edges = [
      [(p) => p[0] >= xmin, (a, b) => [xmin, a[1] + ((b[1] - a[1]) * (xmin - a[0])) / (b[0] - a[0])]],
      [(p) => p[0] <= xmax, (a, b) => [xmax, a[1] + ((b[1] - a[1]) * (xmax - a[0])) / (b[0] - a[0])]],
      [(p) => p[1] >= ymin, (a, b) => [a[0] + ((b[0] - a[0]) * (ymin - a[1])) / (b[1] - a[1]), ymin]],
      [(p) => p[1] <= ymax, (a, b) => [a[0] + ((b[0] - a[0]) * (ymax - a[1])) / (b[1] - a[1]), ymax]],
    ];
    let out = ring;
    for (const [inside, cut] of edges) {
      const inp = out; out = [];
      if (!inp.length) break;
      let prev = inp[inp.length - 1];
      for (const cur of inp) {
        if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
        else if (inside(prev)) out.push(cut(prev, cur));
        prev = cur;
      }
    }
    return out;
  };
  const dp = (pts, t) => {
    if (t <= 0 || pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop(); let idx = -1, max = 0;
      const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay; const L = Math.hypot(dx, dy) || 1e-9;
      for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > max) { max = d; idx = i; } }
      if (max > t && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const parts = [];
  const add = (geo, region) => {
    for (const r of rings(geo)) {
      let c = clip(r, region);
      if (c.length < 3) continue;
      let pts = c.map(P).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
      pts = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
      pts = dp(pts, tol);
      if (pts.length < 3) continue;
      parts.push("M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L"));
    }
  };
  if (west) {
    // Coarser land west of `west` (the Americas), the finer one east of it.
    add(load(west.res), [lon0, west.lon, lat0, lat1]);
    add(load(res), [west.lon, lon1, lat0, lat1]);
  } else add(load(res), [lon0, lon1, lat0, lat1]);
  return { view, land: parts.join("") };
}

// Run directly: write the map the app reads.
if (import.meta.url === `file://${process.argv[1]}`) {
  const k = 1000 / (56 * Math.cos((37 * Math.PI) / 180)); // the 1.8 map's scale
  const box = [-172, 50, 25, 64];
  const { view, land } = build({ box, k, tol: 0.4 });
  const comment =
    "The history map (Purify 1.9): Natural Earth land at 1:50m, public domain, as packaged by world-atlas 2.0.2 (ISC, Mike Bostock), cut to longitude -172 to 50 and latitude 25 to 64, equirectangular scaled for latitude 37 at the 1.8 map's scale, simplified within 0.4 of a unit (scripts/maps/build-history-outline.mjs). Widened in 1.9 so Alaska and America stand where they are. lib/history/map.ts places an event by the same sums.";
  writeFileSync("data/maps/church-history.json", JSON.stringify({ comment, view, box, land }) + "\n");
  console.log(view, land.length);
}
