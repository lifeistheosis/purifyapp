// Slug-validation gate for the Theology cross-section relations map.
//
// Every slug the curated graph references must resolve to a real registry
// entry, so a "related" link can never 404. Registries are imported directly
// (all pure, no server-only modules); topic slugs are checked against the
// data/topics JSON files, the way the heresies gate does.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { _curatedEntries, type SectionKind } from "@/lib/theology/relations";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";
import { HERESIES } from "@/lib/heresies/heresies";
import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { COUNCILS } from "@/lib/councils/councils";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const TOPICS_DIR = path.join(ROOT, "data", "topics");

const doctrineSlugs = new Set(THEOLOGY_TOPICS.map((t) => t.slug));
const heresySlugs = new Set(HERESIES.map((h) => h.slug));
const apologeticsSlugs = new Set(APOLOGETICS_TOPICS.map((t) => t.slug));
const councilSlugs = new Set(COUNCILS.map((c) => c.slug));
const saintSlugs = new Set(SAINTS.map((s) => s.slug));
const topicExists = (slug: string) => fs.existsSync(path.join(TOPICS_DIR, `${slug}.json`));

function keyExists(kind: SectionKind, slug: string): boolean {
  if (kind === "doctrine") return doctrineSlugs.has(slug);
  if (kind === "heresies") return heresySlugs.has(slug);
  if (kind === "apologetics") return apologeticsSlugs.has(slug);
  return topicExists(slug); // topics
}

describe("theology relations map", () => {
  const entries = _curatedEntries();

  it("has entries", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [k, rel] of entries) {
    const [kind, slug] = k.split(":") as [SectionKind, string];

    it(`key ${k} is a real node`, () => {
      expect(keyExists(kind, slug)).toBe(true);
    });

    it(`${k} → all related slugs resolve`, () => {
      for (const s of rel.doctrine ?? []) expect(doctrineSlugs.has(s), `doctrine:${s}`).toBe(true);
      for (const s of rel.heresies ?? []) expect(heresySlugs.has(s), `heresies:${s}`).toBe(true);
      for (const s of rel.apologetics ?? []) expect(apologeticsSlugs.has(s), `apologetics:${s}`).toBe(true);
      for (const s of rel.councils ?? []) expect(councilSlugs.has(s), `councils:${s}`).toBe(true);
      for (const s of rel.saints ?? []) expect(saintSlugs.has(s), `saints:${s}`).toBe(true);
      for (const s of rel.topics ?? []) expect(topicExists(s), `topics:${s}`).toBe(true);
    });
  }
});
