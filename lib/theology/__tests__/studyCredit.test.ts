// Where a study began, said to a reader in plain words (1.9, the owner's yes
// to call 19 on 2026-11-10).
//
// Fourteen studies of Theology grew from threads on Purify's Discord server.
// Each said so at its foot in the editors' shorthand ("Discord,
// dogma-exegesis: The Annihilation of the Filioque."), which reads as a
// filing note. The owner chose the words of a credit instead: "Began as a
// thread on Purify's Discord server, in dogma-exegesis: ...".
//
// What this holds:
//   1. every study that has such a line says it in those words, with the
//      thread's own name, and none keeps the shorthand;
//   2. the script that lands a study writes the same words, so landing one
//      again does not bring the shorthand back;
//   3. the foot draws the credit on a line of its own, marked as the English
//      it is, in the quiet ink every palette can read (it was at 35 percent,
//      under the 45 to 60 the palettes lift to 4.5:1).
//
// What a reader would notice if this broke: a line at a study's end that
// reads like a note between editors, or one too faint to read.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const studies = fs
  .readdirSync(path.join(ROOT, "data", "theology"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: f, body: JSON.parse(read(`data/theology/${f}`)) as { slug: string; origin?: string } }));

const CREDIT = /^Began as a thread on Purify's Discord server, in (dogma-exegesis|liturgics-forum): \S.*[.?!]$/;

describe("a study's credit", () => {
  const credited = studies.filter((s) => s.body.origin);

  it("says where the study began in the owner's words, with the thread's own name", () => {
    expect(credited).toHaveLength(14);
    for (const s of credited) {
      expect(s.body.origin, s.file).toMatch(CREDIT);
      // One mark at its end, the thread's own where it asks a question.
      expect(s.body.origin, s.file).not.toMatch(/[.?!]{2}$/);
      // No em dash in words a reader sees.
      expect(s.body.origin, s.file).not.toContain("—");
    }
    expect(credited.filter((s) => s.body.origin!.includes("in liturgics-forum: ")).map((s) => s.body.slug).sort()).toEqual(["the-divine-liturgy", "vestments"]);
  });

  it("keeps none of the editors' shorthand, in the files or in the script that lands a study", () => {
    for (const s of studies) expect(s.body.origin ?? "", s.file).not.toMatch(/^Discord, /);
    const landing = read("scripts/land-theology-studies.mjs");
    expect(landing).toContain("origin: `Began as a thread on Purify's Discord server, in ${origin[0]}: ${origin[1]}${/[.?!]$/.test(origin[1]) ? \"\" : \".\"}`,");
    expect(landing).not.toContain("origin: `Discord, ");
  });

  it("is drawn on a line of its own, as the English it is, in ink a reader can read", () => {
    const foot = read("components/theology/StudyPartText.tsx");
    const from = foot.indexOf("export function StudyCurated");
    const drawn = foot.slice(from, foot.indexOf("\n}\n", from) + 2);
    expect(drawn).toContain('<div data-study-credit="" className="mt-12 space-y-1 font-sans text-caption leading-[1.6] text-paper/55">');
    expect(drawn).toMatch(/\{body\.origin \? \(\s*<p lang="en" dir="ltr" className="rtl:text-right">\s*\{body\.origin\}\s*<\/p>\s*\) : null\}/);
    // The palettes lift 45 to 60 percent to 4.5:1 (lib/ui/__tests__/faintText.test.ts); nothing here is fainter.
    expect(drawn).not.toMatch(/text-paper\/(?:[1-3]\d|4[0-4])\b/);
    // And the study's last page still ends on it.
    expect(read("app/(app)/theology/[topic]/read/page.tsx")).toContain("{i === last ? <StudyCurated body={body} /> : null}");
  });
});
