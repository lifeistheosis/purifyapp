#!/usr/bin/env node
// Where each time zone's city is, for Candlelight at Vespers (1.9, s2-02 of
// docs/1.9-build/ideas.json): the app works out sunset and sunrise from the
// phone's time zone, never from its location, so no permission is asked and
// nothing about where a reader is leaves the phone.
//
// From the tz database (public domain; https://www.iana.org/time-zones):
// zone.tab and zone1970.tab give each zone's principal city in ISO 6709, and
// tzdata.zi's links name the old spellings a phone may still report
// (Asia/Calcutta for Asia/Kolkata, Europe/Kiev for Europe/Kyiv), each given
// its zone's place. Writes data/calendar/zone-coords.json: latitude and
// longitude in degrees, to two places, which is closer than the city is to
// most of the people in its zone.
//
//   node scripts/zone-coords.mjs [zoneinfo folder, default /usr/share/zoneinfo]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "/usr/share/zoneinfo";
const OUT = new URL("../data/calendar/zone-coords.json", import.meta.url);

/** ISO 6709 (+DDMM+DDDMM or +DDMMSS+DDDMMSS) to [latitude, longitude]. */
function iso6709(s) {
  const m = /^([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?$/.exec(s);
  if (!m) throw new Error(`not ISO 6709: ${s}`);
  const deg = (sign, d, mi, se) => (sign === "-" ? -1 : 1) * (Number(d) + Number(mi) / 60 + Number(se ?? 0) / 3600);
  const round = (n) => Math.round(n * 100) / 100;
  return [round(deg(m[1], m[2], m[3], m[4])), round(deg(m[5], m[6], m[7], m[8]))];
}

const zones = {};
for (const file of ["zone1970.tab", "zone.tab"]) {
  for (const line of readFileSync(join(dir, file), "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [, coords, zone] = line.split("\t");
    if (zone && !zones[zone]) zones[zone] = iso6709(coords);
  }
}
let links = 0;
const zi = readFileSync(join(dir, "tzdata.zi"), "utf8");
const version = /^# version (\S+)/.exec(zi)?.[1] ?? "unknown";
for (const line of zi.split("\n")) {
  if (!line.startsWith("L ")) continue;
  const [, target, alias] = line.split(" ");
  if (zones[target] && !zones[alias]) {
    zones[alias] = zones[target];
    links += 1;
  }
}
const sorted = Object.fromEntries(Object.entries(zones).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify({ source: "tz database", version, zones: sorted }) + "\n");
console.log(`${Object.keys(sorted).length} zones (${links} old spellings), tz ${version} -> data/calendar/zone-coords.json`);
