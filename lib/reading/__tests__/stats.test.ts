// data/reading/stats.json, counted again (1.7).
//
// The reading room and every book page show minutes read from that file, and
// the theme rows the minutes of one book of a work. It is written by
// scripts/reading-stats.mjs and committed, so neither build reads the 31 MB
// corpus. When a work's text changes and the script was not run, this fails
// and names the work: run `node scripts/reading-stats.mjs`.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import stats from "@/data/reading/stats.json";
import { WORDS_PER_MINUTE, wordCount } from "@/lib/bible/readability";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Stat = { words: number; minutes: number; sections: [number, number][] };
const STATS = stats as unknown as Record<string, Stat>;

describe("the counted lengths of the works", () => {
  it("use the house's reading pace", () => {
    const script = fs.readFileSync(path.join(ROOT, "scripts", "reading-stats.mjs"), "utf8");
    expect(script).toContain(`export const WORDS_PER_MINUTE = ${WORDS_PER_MINUTE};`);
  });

  it("are counted for every work, and match the text as it is", () => {
    const keys = SAINTS.flatMap((s) => s.works.map((w) => `${s.slug}/${w.slug}`));
    expect(Object.keys(STATS).sort()).toEqual([...keys].sort());
    const drift: string[] = [];
    for (const key of keys) {
      const [saint, work] = key.split("/");
      const json = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8")) as {
        sections: { n: number; paragraphs?: string[] }[];
      };
      const sections = json.sections.map((s) => [s.n, (s.paragraphs ?? []).reduce((n, p) => n + wordCount(p), 0)] as [number, number]);
      const words = sections.reduce((n, [, w]) => n + w, 0);
      const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
      const have = STATS[key];
      if (!have || have.words !== words || have.minutes !== minutes || JSON.stringify(have.sections) !== JSON.stringify(sections)) drift.push(key);
    }
    expect(drift, "run node scripts/reading-stats.mjs").toEqual([]);
  });
});
