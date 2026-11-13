// The map (BRIEF.md, "The map"): state outlines from us-atlas, the package
// built from the US Census Bureau's cartographic boundary files (public
// domain), already drawn in the Albers USA projection on a 975 by 610 field.
// This writes map.json, one outline a state, so the film needs no map tools.
//
//   node docs/promo/orthodox-america/build-map.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = path.resolve(HERE, "../../../.promo/orthodox-america/tools");
const require = createRequire(path.join(TOOLS, "package.json"));
const { feature } = require("topojson-client");
const topo = require("us-atlas/states-albers-10m.json");

// The Census Bureau's four regions, by state FIPS code. Pew's regions are these.
export const REGIONS = {
  Northeast: ["09", "23", "25", "33", "44", "50", "34", "36", "42"],
  Midwest: ["17", "18", "26", "39", "55", "19", "20", "27", "29", "31", "38", "46"],
  South: ["10", "11", "12", "13", "24", "37", "45", "51", "54", "01", "21", "28", "47", "05", "22", "40", "48"],
  West: ["04", "08", "16", "30", "32", "35", "49", "56", "02", "06", "15", "41", "53"],
};
const regionOf = (id) => Object.keys(REGIONS).find((r) => REGIONS[r].includes(id));

/** A ring as a path, dropping points nearer than 0.7 of a unit to the last kept. */
const ring = (pts) => {
  const kept = [pts[0]];
  for (const p of pts.slice(1, -1)) {
    const [x, y] = kept[kept.length - 1];
    if (Math.hypot(p[0] - x, p[1] - y) >= 0.7) kept.push(p);
  }
  if (kept.length < 3) return "";
  return "M" + kept.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
};

const states = [];
for (const f of feature(topo, topo.objects.states).features) {
  const region = regionOf(f.id);
  if (!region) continue; // the territories are not in Pew's four regions
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys) for (const [x, y] of poly[0]) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  states.push({
    id: f.id,
    name: f.properties.name,
    region,
    box: [x0, y0, x1, y1].map((n) => Math.round(n)),
    d: polys.map((poly) => poly.map(ring).join("")).join(""),
  });
}
if (states.length !== 51) throw new Error(`expected fifty states and the District, got ${states.length}`);
states.sort((a, b) => a.id.localeCompare(b.id));
const out = { from: `us-atlas ${require("us-atlas/package.json").version}, states-albers-10m.json`, field: [975, 610], states };
fs.writeFileSync(path.join(HERE, "map.json"), JSON.stringify(out));
console.log("map.json", states.length, "outlines,", fs.statSync(path.join(HERE, "map.json")).size, "bytes");
