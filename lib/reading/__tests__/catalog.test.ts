// The reading room's entries (lib/reading/entries.ts) held to the library.
//
// What a reader would notice if this broke: a book missing from the room, a
// book shown twice, a theme row opening a chapter that is not there or is
// named "Book 8" when it is Book 9, a cover saying "By St Leo" over our own
// words, or a retelling in the row of the Fathers' teaching on a passion.
// The tags themselves are claims about what a Father teaches, so each must
// say why (its basis), and all wait for a future clergy review.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import stats from "@/data/reading/stats.json";
import { ERA_IDS, FORMS, THEMES, THEME_IDS, TRADITION_IDS, themesIn } from "@/lib/reading/catalog";
import { AUTHOR_META, BEGIN_ORDER, ENTRIES, SUBJECTS, bylineOf, coverSubject, type WorkKey } from "@/lib/reading/entries";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const STATS = stats as unknown as Record<string, { sections: [number, number][] }>;
const entries = Object.entries(ENTRIES) as [WorkKey, (typeof ENTRIES)[WorkKey]][];
const works = SAINTS.flatMap((s) => s.works.map((w) => `${s.slug}/${w.slug}`));
const SAINT_SLUGS = new Set(SAINTS.map((s) => s.slug));
const EM_DASH = String.fromCharCode(0x2014);

type Section = { n: number; title: string; voice?: string; paragraphs: string[] };
const sectionsOf = (key: string): Section[] => {
  const [saint, work] = key.split("/");
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8")).sections;
};

describe("the reading room's entries", () => {
  it("are one for every work in the library, and none for a work that is not", () => {
    expect(works.filter((k) => !(k in ENTRIES))).toEqual([]);
    expect(entries.map(([k]) => k).filter((k) => !works.includes(k))).toEqual([]);
  });

  it("show a work registered twice once, as its twin", () => {
    for (const [key, e] of entries) {
      if (!e.sameAs) continue;
      const twin = ENTRIES[e.sameAs];
      expect(twin, `${key} -> ${e.sameAs}`).toBeTruthy();
      expect(twin.sameAs, `${key}: a twin of a twin`).toBeUndefined();
      expect(e.sameAs).not.toBe(key);
    }
  });

  it("name only saints the library knows, and know each one's tradition and era", () => {
    for (const [key, e] of entries) {
      if (e.by) {
        expect(SAINT_SLUGS.has(e.by), `${key} by ${e.by}`).toBe(true);
        expect(AUTHOR_META[e.by], `${key}: no tradition for ${e.by}`).toBeTruthy();
      }
      if (e.about) expect(Boolean(AUTHOR_META[e.about] || SUBJECTS[e.about]), `${key} about ${e.about}`).toBe(true);
      if (e.about && !SUBJECTS[e.about]) expect(SAINT_SLUGS.has(e.about), `${key} about ${e.about}`).toBe(true);
      expect(FORMS).toContain(e.form);
      expect(e.review).toBe("pending-clergy");
      for (const t of e.traditions ?? []) expect(TRADITION_IDS).toContain(t);
      if (e.era) expect(ERA_IDS).toContain(e.era);
    }
    for (const [slug, meta] of Object.entries({ ...AUTHOR_META, ...SUBJECTS })) {
      for (const t of meta.traditions) expect(TRADITION_IDS, slug).toContain(t);
      if (meta.era) expect(ERA_IDS, slug).toContain(meta.era);
    }
    // Every book has someone on its cover or is anonymous on purpose.
    const plain = entries.filter(([, e]) => !coverSubject(e)).map(([k]) => k);
    expect(plain).toEqual(["theophan-the-recluse/way-of-a-pilgrim"]);
  });

  it("give every tag a reason, and tag only parts of works that exist", () => {
    for (const [key, e] of entries) {
      const have = new Set((STATS[key]?.sections ?? []).map(([n]) => n));
      expect(have.size, `${key} has no counted sections`).toBeGreaterThan(0);
      const seen = new Set<string>();
      for (const tag of e.themes) {
        expect(THEME_IDS).toContain(tag.theme);
        expect(seen.has(tag.theme), `${key}: ${tag.theme} twice`).toBe(false);
        seen.add(tag.theme);
        expect(tag.basis.trim().length, `${key} ${tag.theme}: no basis`).toBeGreaterThan(10);
        expect(tag.basis.includes(EM_DASH), `${key} ${tag.theme}: an em dash`).toBe(false);
        for (const [from, to] of tag.sections ?? []) {
          expect(from <= to, `${key} ${tag.theme} ${from}..${to}`).toBe(true);
          expect(have.has(from) && have.has(to), `${key} ${tag.theme}: sections ${from}..${to} are not all there`).toBe(true);
        }
      }
    }
  });

  it("open each theme's row on one reading, the Fathers' own words, never a retelling", () => {
    for (const group of ["passions", "virtues", "life"] as const) {
      for (const theme of themesIn(group)) {
        const best = entries.filter(([, e]) => e.themes.some((t) => t.theme === theme && t.best));
        expect(best.map(([k]) => k), `${theme}: one best reading`).toHaveLength(1);
        const [key, e] = best[0];
        expect(e.form, `${theme}: ${key}`).not.toBe("retelling");
        expect(e.sameAs, `${theme}: ${key}`).toBeUndefined();
      }
    }
    // No season and no other theme has a "best": the seasons show every reading.
    const seasons = THEMES.filter((t) => t.group === "seasons").map((t) => t.id as string);
    for (const [key, e] of entries) for (const t of e.themes) if (t.best) expect(seasons, key).not.toContain(t.theme);
  });

  it("name each part on a row as its own sections name it", () => {
    const word = { book: "Book", conference: "Conference", homily: "Homily", sermon: "Sermon", chapter: "Chapter" } as const;
    for (const [key, e] of entries) {
      for (const tag of e.themes) {
        if (!tag.part) continue;
        expect(tag.sections?.length, `${key} ${tag.theme}: a part needs its sections`).toBeTruthy();
        const secs = sectionsOf(key);
        const first = Math.min(...tag.sections!.map(([f]) => f));
        const last = Math.max(...tag.sections!.map(([, t]) => t));
        const name = (n: number) => secs.find((s) => s.n === n)?.title ?? "";
        const w = word[tag.part.kind];
        expect(name(first), `${key} ${tag.theme}`).toMatch(new RegExp(`^${w} ${tag.part.from}\\b`));
        expect(name(last), `${key} ${tag.theme}`).toMatch(new RegExp(`^${w} ${tag.part.to ?? tag.part.from}\\b`));
      }
    }
  });

  it("say By only over a text that is mostly the author's own, and About over our own words", () => {
    const wrong: string[] = [];
    for (const [key, e] of entries) {
      if (e.form === "retelling") {
        if (e.by !== null) wrong.push(`${key}: a retelling with an author`);
        if (bylineOf(e).kind === "by") wrong.push(`${key}: a retelling says By`);
        continue;
      }
      if (!e.by) continue;
      const secs = sectionsOf(key);
      const words = (s: Section) => s.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
      const total = secs.reduce((n, s) => n + words(s), 0);
      const editorial = secs.filter((s) => s.voice === "editorial").reduce((n, s) => n + words(s), 0);
      if (editorial * 2 >= total) wrong.push(`${key}: ${Math.round((editorial / total) * 100)}% editorial, yet By ${e.by}`);
    }
    expect(wrong).toEqual([]);
  });

  it("keep the first reads in their entries", () => {
    for (const key of BEGIN_ORDER) expect(ENTRIES[key]?.begin, key).toBe(true);
  });
});
