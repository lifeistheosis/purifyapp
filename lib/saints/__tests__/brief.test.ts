// The saints in brief, and the promise they exist to keep.
//
// Two things can go wrong, and neither shows on a screen until a reader is
// already looking at it.
//
// The file can fall behind the registry. data/calendar/profiled-saints.json
// is written by a script, so a profile added to lib/saints/saints.ts is not
// in it until the script is run. The calendar reads the file: that saint
// would have a profile and no place on his own feast day.
//
// And the registry can come back into the app's start. It is 484 KB of
// source. Until 1.6 the calendar imported it, the streak host in the root
// layout reaches the calendar, and so every cold open of the app and every
// page of the website read every saint's life. One import in any of the
// files the start reads undoes that, and nothing else would say so.
//
// If the second test fails, do not delete it. Either the new import wants
// only a type, and `import type` says so, or it wants a name, an icon or a
// feast day, and the saint in brief has those (lib/saints/brief.ts). A screen
// that truly needs the lives belongs behind the route that shows them.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import rows from "@/data/calendar/profiled-saints.json";
import { commemorationsOn, feastsOn } from "@/lib/calendar/orthodox";

import { briefOf, type SaintBrief } from "../brief";
import { SAINTS } from "../saints";

const ROOT = process.cwd();
const REGISTRY = "lib/saints/saints.ts";
/** What the app's one document renders: the root layout and the front door. */
const ENTRIES = ["app/layout.tsx", "app/page.tsx"];

describe("data/calendar/profiled-saints.json", () => {
  it("is the registry in brief, row for row", () => {
    expect(
      rows,
      "The file is behind lib/saints/saints.ts. Run: " +
        "node --experimental-strip-types scripts/emit-saint-briefs.mjs",
    ).toEqual(SAINTS.map(briefOf));
  });

  it("carries nothing but the six fields", () => {
    const allowed = ["slug", "name", "epithet", "feastDays", "iconUrl", "readMinutes"];
    for (const row of rows as SaintBrief[]) {
      expect(Object.keys(row).filter((k) => !allowed.includes(k)), row.slug).toEqual([]);
      expect(row.readMinutes, row.slug).toBeGreaterThanOrEqual(2);
      expect(row.readMinutes, row.slug).toBeLessThanOrEqual(12);
    }
  });

  it("stays a fraction of the registry", () => {
    const brief = fs.statSync(path.join(ROOT, "data/calendar/profiled-saints.json")).size;
    const registry = fs.statSync(path.join(ROOT, REGISTRY)).size;
    // 36 KB against 484 KB when this was written. A field added to the brief
    // is paid for on every cold open, so a tenth is the ceiling, not a target.
    expect(brief).toBeLessThan(registry / 10);
  });
});

describe("the calendar on the saints in brief", () => {
  // A leap year, so a feast on February 29 would be counted too.
  const YEAR = 2028;
  // The form this index can place: "November 13". Four profiles also name a
  // movable day ("Fifth Sunday of Great Lent"), which it has never placed.
  const FIXED_DATE = /^[A-Za-z]+\s+\d{1,2}$/;

  it("keeps every profiled saint on every fixed feast day of his", () => {
    const kept = new Map<string, number>();
    for (let d = new Date(Date.UTC(YEAR, 0, 1, 12)); d.getUTCFullYear() === YEAR; d = new Date(d.getTime() + 86_400_000)) {
      for (const s of feastsOn(d)) kept.set(s.slug, (kept.get(s.slug) ?? 0) + 1);
    }
    for (const saint of SAINTS) {
      const fixed = new Set(saint.feastDays.filter((f) => FIXED_DATE.test(f.trim()))).size;
      expect(kept.get(saint.slug) ?? 0, saint.slug).toBe(fixed);
    }
  });

  it("hands a commemoration the same saint the registry has", () => {
    const bySlug = new Map(SAINTS.map((s) => [s.slug, s]));
    let resolved = 0;
    for (let d = new Date(Date.UTC(YEAR, 0, 1, 12)); d.getUTCFullYear() === YEAR; d = new Date(d.getTime() + 86_400_000)) {
      for (const c of commemorationsOn(d)) {
        const profile = c.slug ? bySlug.get(c.slug) : undefined;
        // A slug that names a profile resolves, and one that does not, does not.
        expect(c.saint?.slug, `${d.toISOString().slice(0, 10)} ${c.name}`).toBe(profile?.slug);
        if (c.saint && profile) {
          expect(c.saint).toEqual(briefOf(profile));
          resolved += 1;
        }
      }
    }
    expect(resolved).toBeGreaterThan(SAINTS.length);
  });
});

// ── What the app's start reads ──────────────────────────────────────────────

const EXT = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"];

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(path.join(ROOT, from)), spec);
  else return null;
  for (const ext of [...EXT, "/index.ts", "/index.tsx"]) {
    const file = base + ext;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return path.relative(ROOT, file).split(path.sep).join("/");
    }
  }
  return null;
}

type Read = { client: boolean; eager: string[]; lazy: string[] };
const cache = new Map<string, Read>();

/**
 * A file's imports, read from source. `eager` is what loads with the file;
 * `lazy` is a dynamic import(), which loads when it is called. `import type`,
 * and an import whose every name is marked `type`, are neither: the compiler
 * drops them.
 */
function read(file: string): Read {
  const hit = cache.get(file);
  if (hit) return hit;
  const info: Read = { client: false, eager: [], lazy: [] };
  cache.set(file, info);
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) return info;
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  info.client = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/|\s)*["']use client["']/.test(src);
  // A commented import is not an import.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const add = (list: string[], spec: string) => {
    const to = resolveImport(file, spec);
    if (to && !list.includes(to)) list.push(to);
  };
  for (const m of code.matchAll(/(?:^|[\n;])\s*import\s+([^;'"]*?)\s+from\s*["']([^"']+)["']/g)) {
    const clause = m[1].trim();
    if (/^type\s/.test(clause)) continue;
    const braces = clause.match(/\{([\s\S]*)\}/);
    const outside = clause.replace(/\{[\s\S]*\}/, "").replace(/,/g, "").trim();
    if (braces && !outside) {
      const names = braces[1].split(",").map((s) => s.trim()).filter(Boolean);
      if (names.length > 0 && names.every((n) => /^type\s/.test(n))) continue;
    }
    add(info.eager, m[2]);
  }
  for (const m of code.matchAll(/(?:^|[\n;])\s*import\s*["']([^"']+)["']/g)) add(info.eager, m[1]);
  for (const m of code.matchAll(/(?:^|[\n;])\s*export\s+(type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*["']([^"']+)["']/g)) {
    if (!m[1]) add(info.eager, m[2]);
  }
  for (const m of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) add(info.lazy, m[1]);
  return info;
}

/**
 * Every file the browser reads to open the app, each with the file that
 * brought it in. A server file ships nothing, so the walk goes down through
 * server files to the first client ones, and from there follows what loads
 * with each file.
 */
function readAtStart(): Map<string, string | null> {
  const boundaries: string[] = [];
  const seenServer = new Set<string>();
  const queue = [...ENTRIES];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seenServer.has(file)) continue;
    seenServer.add(file);
    const info = read(file);
    if (info.client) {
      boundaries.push(file);
      continue;
    }
    // A server file may render a client one it imports either way.
    for (const to of [...info.eager, ...info.lazy]) {
      if (read(to).client) boundaries.push(to);
      else queue.push(to);
    }
  }
  const parent = new Map<string, string | null>();
  for (const b of boundaries) if (!parent.has(b)) parent.set(b, null);
  const walk = [...parent.keys()];
  while (walk.length > 0) {
    const file = walk.shift()!;
    for (const to of read(file).eager) {
      if (parent.has(to)) continue;
      parent.set(to, file);
      walk.push(to);
    }
  }
  return parent;
}

describe("what the app reads to open", () => {
  const atStart = readAtStart();

  it("does not include the saints registry", () => {
    const chain: string[] = [];
    for (let f: string | null | undefined = atStart.has(REGISTRY) ? REGISTRY : null; f; f = atStart.get(f)) {
      chain.unshift(f);
    }
    expect(
      chain,
      "The app's start reads every saint's life again, by this chain of imports:\n  " +
        chain.join("\n  -> ") +
        "\nUse `import type`, or the saint in brief (lib/saints/brief.ts).",
    ).toEqual([]);
  });

  it("is still looking at the real thing", () => {
    // A rename would leave the test above passing on an empty walk.
    for (const entry of ENTRIES) expect(fs.existsSync(path.join(ROOT, entry)), entry).toBe(true);
    expect(fs.existsSync(path.join(ROOT, REGISTRY))).toBe(true);
    // The streak host, the calendar and the day's rail are how the registry
    // used to arrive. If the walk does not reach them it is not walking.
    for (const file of [
      "components/streak/StreakSavedHost.tsx",
      "lib/calendar/orthodox.ts",
      "lib/calendar/useChurchDay.ts",
      "components/today/ChurchTodayRail.tsx",
    ]) {
      expect(atStart.has(file), file).toBe(true);
    }
    expect(atStart.size).toBeGreaterThan(150);
  });

  it("would catch the import if it came back", () => {
    // The walk is only worth trusting if it can see a registry import at all.
    // (SaintSearch was this example until 1.8, when it became a door to the
    // one search and stopped carrying the registry.)
    const someScreen = "components/history/EventPeople.tsx";
    expect(read(someScreen).eager).toContain(REGISTRY);
    // And a type is not a value: this card names the type and ships no saint.
    expect(read("components/saints/SaintIcon.tsx").eager).not.toContain(REGISTRY);
  });
});
