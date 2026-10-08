// Projects Natural Earth land (public domain, via world-atlas) to map pixels for the Mediterranean.
//   node tools/mapdata.mjs <world-atlas>/land-50m.json assets/map.json
// world-atlas 2.0.2 (ISC) packages Natural Earth 4.1.0; get it with: npm pack world-atlas@2.0.2
import fs from 'node:fs';
import { feature } from 'topojson-client';
const [src, out] = process.argv.slice(2);
const topo = JSON.parse(fs.readFileSync(src, 'utf8'));
const land = feature(topo, topo.objects.land);
const P = { lon0: -12, lon1: 42, lat0: 20, lat1: 60, k: 72 };       // 72 px per degree of longitude
const merc = lat => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * 180 / Math.PI;
const m1 = merc(P.lat1);
const px = ([lon, lat]) => [+((lon - P.lon0) * P.k).toFixed(1), +((m1 - merc(lat)) * P.k).toFixed(1)];
const W = Math.round((P.lon1 - P.lon0) * P.k), H = Math.round((m1 - merc(P.lat0)) * P.k);
const rings = [];
const inBox = ([lon, lat]) => lon >= P.lon0 - 3 && lon <= P.lon1 + 3 && lat >= P.lat0 - 3 && lat <= P.lat1 + 3;
for (const f of land.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) for (const ring of poly) {
    if (!ring.some(inBox)) continue;
    const pts = []; let last = null;
    for (const c of ring) { const p = px(c); if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.6) { pts.push(p); last = p; } }
    if (pts.length > 3) rings.push(pts);
  }
}
fs.writeFileSync(out, JSON.stringify({ proj: { ...P, m1, W, H }, rings }));
console.log('map', W, 'x', H, 'px,', rings.length, 'rings,', rings.reduce((a, r) => a + r.length, 0), 'points');
