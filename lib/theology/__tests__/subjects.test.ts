// The faith, by subject (1.8): every link the map makes is to something real,
// and every picture is a file on disk with its record.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const records = ["SECTION_MEDIA.md", "HISTORY_MEDIA.md"]
  .map((f) => fs.readFileSync(path.join(ROOT, "docs", "licensing", f), "utf8"))
  .join("\n");

describe("the faith, by subject", () => {
  it("covers every heresy and every one of the Seven at least once", () => {
    const heresies = new Set(THEOLOGY_SUBJECTS.flatMap((s) => s.heresies));
    for (const h of HERESIES) expect(heresies.has(h.slug), h.slug).toBe(true);
    const councils = new Set(THEOLOGY_SUBJECTS.flatMap((s) => s.councils));
    for (const c of COUNCILS.filter((x) => x.kind !== "local")) expect(councils.has(c.slug), c.slug).toBe(true);
  });

  for (const s of THEOLOGY_SUBJECTS) {
    it(`${s.title}: links resolve, picture on disk and recorded`, () => {
      for (const t of s.topics) expect(fs.existsSync(path.join(ROOT, "data", "topics", `${t}.json`)), t).toBe(true);
      for (const t of s.studies) expect(THEOLOGY_TOPICS.some((x) => x.slug === t), t).toBe(true);
      for (const h of s.heresies) expect(HERESIES.some((x) => x.slug === h), h).toBe(true);
      for (const c of s.councils) expect(COUNCILS.some((x) => x.slug === c), c).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "public", s.picture.src)), s.picture.src).toBe(true);
      // The band's crop (round 12, A): an object-position, when it moves.
      if (s.picture.focus) expect(s.picture.focus).toMatch(/^\d{1,3}% \d{1,3}%$/);
      const file = path.basename(s.picture.src);
      if (s.picture.src.startsWith("/theology/")) expect(records.includes(file), file).toBe(true);
      expect(`${s.title} ${s.line} ${s.picture.credit}`.includes(String.fromCharCode(0x2014))).toBe(false);
    });
  }
});
