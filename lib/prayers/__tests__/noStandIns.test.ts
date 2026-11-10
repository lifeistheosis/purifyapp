// No stand-in where a prayer should be (1.9, build 90 note 7, his "All
// recommendations. Start." of 2026-11-10). His words, on The First Hour: "I
// don't know why it says this, right? See morning rule. Like, what does that
// even mean? It should say the prayer." Its opening section had held, since
// the Hours first shipped (2026-05-30), "(see Morning Rule: Heavenly King ·
// Trisagion · ... · Our Father.)" for its prayer, "Cite the standard text
// from the Morning Rule if you have it open" for its instruction, and its
// troparion "Insert the troparion appointed for today": an editor's notes to
// himself. Nothing read a prayer's words for that: the sweep's placeholder
// test measures a field's hint, `attribution.test.ts` a file's source line,
// `akathists.test.ts` the Akathist alone.
//
// What this holds, in every file a reader is shown as prayer (the rules and
// their German, the Hours, the Akathist, the lessons in English and German):
//
//  - No prayer's words are a pointer to another rule or a list of prayers'
//    names, and no title, instruction, intro or refrain speaks to an editor.
//    Each phrase refused is listed with its reason, and the list is proved
//    on the three lines The First Hour had.
//  - A part of an Hour that points to another rule's prayer draws exactly
//    that prayer, its title, words and rubric (lib/prayers/hours.ts): the
//    words exist once.
//  - Where a lesson's rubric names the Jesus Prayer, its words follow, as the
//    Morning Rule gives them in that language.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getHour, listHours, resolveHour } from "@/lib/prayers/hours";
import type { Prayer, PrayerFrom, Rule } from "@/lib/prayers/types";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(ROOT, "data", "prayers");
const read = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(DIR, rel), "utf8")) as T;
const files = (sub: string) =>
  fs
    .readdirSync(path.join(DIR, sub))
    .filter((n) => n.endsWith(".json"))
    .map((n) => `${sub}/${n}`);

/** What a stand-in or an editor's note says, each with why a reader must never see it. */
const REFUSED: readonly { words: RegExp; why: string }[] = [
  { words: /^\s*\(\s*see\b/i, why: "a pointer in brackets where the prayer's words should be" },
  { words: /\b(see|siehe)\s+(the\s+|die\s+|das\s+)?(morning|evening|morgen|abend)\w*\s*(rule|prayers|regel|gebete)\b/i, why: "another rule named as where the words are" },
  { words: /(?:[A-Z][\w'’ -]{2,40} · ){3,}/, why: "a list of prayers' names in the prayer's place" },
  { words: /\bcite\b/i, why: "an editor's note: cite the text" },
  { words: /\binsert\b/i, why: "an editor's note: insert the text" },
  { words: /if you have it open/i, why: "an editor's note: the words are elsewhere" },
  { words: /\bthe usual beginning\b/i, why: "a stand-in for the opening prayers" },
  { words: /\bstandard text\b/i, why: "a stand-in for a text" },
  { words: /\b(TODO|TBD|FIXME|placeholder|lorem ipsum)\b/i, why: "an unfinished line" },
  { words: /needs-content|being typeset|team@purify\.app/i, why: "a request to the team, not a prayer" },
];

/** Every refused phrase in a piece of text, with its reason. */
export function standIns(text: string | undefined): string[] {
  if (!text) return [];
  return REFUSED.filter((r) => r.words.test(text)).map((r) => r.why);
}

type AnyPart = Partial<Prayer> & Partial<PrayerFrom>;
type AnyRule = Partial<Omit<Rule, "prayers">> & { prayers?: AnyPart[] };
type Lesson = { id: string; title?: string; summary?: string; intro?: string; prayer?: string; tryThis?: string };

/** Each piece of a rule a reader is shown, named for the message. */
function pieces(rel: string, rule: AnyRule): [string, string | undefined][] {
  const out: [string, string | undefined][] = [
    [`${rel} title`, rule.title],
    [`${rel} intro`, rule.intro],
    [`${rel} refrain`, rule.refrain],
  ];
  for (const p of rule.prayers ?? []) {
    out.push([`${rel} ${p.id} title`, p.title], [`${rel} ${p.id} instruction`, p.instruction], [`${rel} ${p.id} text`, p.text], [`${rel} ${p.id} refrain`, p.refrain]);
    for (const v of p.variants ?? []) out.push([`${rel} ${p.id} (${v.jurisdiction}) text`, v.text], [`${rel} ${p.id} (${v.jurisdiction}) instruction`, v.instruction]);
  }
  return out;
}

describe("a prayer's place", () => {
  it("is read in every file a reader is shown as prayer", () => {
    const all = [...files("rules"), ...files("hours"), ...files("akathists")];
    expect(all.length).toBeGreaterThan(20);
    expect(all).toContain("hours/first-hour.json");
  });

  it("refuses the three lines The First Hour had, each for its reason", () => {
    expect(standIns("(see Morning Rule: Heavenly King · Trisagion · Most Holy Trinity · Lord have mercy · Glory · Now and ever · Our Father.)").length).toBeGreaterThanOrEqual(2);
    expect(standIns("Pray the usual beginning. Cite the standard text from the Morning Rule if you have it open.").length).toBeGreaterThanOrEqual(3);
    expect(standIns("Insert the troparion appointed for today; the simple form below applies to ordinary weekdays of Great Lent and the fasts.")).toEqual(["an editor's note: insert the text"]);
    // A prayer's own words and a reader's rubric pass.
    expect(standIns("Holy God, Holy Mighty, Holy Immortal, have mercy on us. (3x)")).toEqual([]);
    expect(standIns("Three times, with a small bow at each:")).toEqual([]);
  });

  it("holds the prayer, never a stand-in or an editor's note, in the rules, the Hours and the Akathist", () => {
    const found: string[] = [];
    for (const rel of [...files("rules"), ...files("hours"), ...files("akathists")]) {
      for (const [where, text] of pieces(rel, read<AnyRule>(rel))) for (const why of standIns(text)) found.push(`${where}: ${why}`);
    }
    expect(found).toEqual([]);
  });

  it("holds the prayer in the lessons, and shows the Jesus Prayer's words where its rubric names it", () => {
    const found: string[] = [];
    for (const [rel, ruleFile, rubric] of [
      ["learning/lessons.json", "rules/morning.json", "[Pray the Jesus Prayer slowly, ten times.]"],
      ["learning/lessons.de.json", "rules/morning.de.json", "[Bete das Jesusgebet langsam, zehnmal.]"],
    ] as const) {
      const words = read<Rule>(ruleFile).prayers.find((p) => p.id === "jesus-prayer-block")!.text!.replace(/\s*\(10x\)\s*$/, "");
      let named = 0;
      for (const lesson of read<Lesson[]>(rel)) {
        for (const [key, text] of Object.entries(lesson)) {
          if (typeof text === "string") for (const why of standIns(text)) found.push(`${rel} ${lesson.id} ${key}: ${why}`);
        }
        const prayer = lesson.prayer ?? "";
        for (let at = prayer.indexOf(rubric); at >= 0; at = prayer.indexOf(rubric, at + 1)) {
          named += 1;
          expect(prayer.slice(at + rubric.length).startsWith(`\n\n${words}`), `${rel} ${lesson.id}: the Jesus Prayer's words follow its rubric`).toBe(true);
        }
      }
      expect(named, rel).toBe(2);
    }
    expect(found).toEqual([]);
  });

  it("is, where an Hour points to another rule's prayer, exactly that prayer", () => {
    const morning = read<Rule>("rules/morning.json");
    let pointing = 0;
    for (const { slug } of listHours()) {
      const file = read<AnyRule>(`hours/${slug}.json`);
      const hour = getHour(slug)!;
      (file.prayers ?? []).forEach((part, i) => {
        if (!part.from) return;
        pointing += 1;
        expect(part.from.ruleId, `${slug} ${part.id}`).toBe("morning");
        const source = morning.prayers.find((p) => p.id === part.from!.prayerId)!;
        const drawn = hour.prayers[i];
        expect(drawn.id).toBe(part.id);
        expect(drawn.title).toBe(source.title);
        expect(drawn.text).toBe(source.text);
        expect(drawn.instruction).toBe(part.instruction ?? source.instruction);
        // The file names the prayer; it never holds its words a second time.
        expect(part.text ?? part.title).toBeUndefined();
      });
    }
    // The First Hour's opening prayers: O Heavenly King, the Trisagion, the Lord's Prayer.
    expect(pointing).toBe(3);
    expect(getHour("first-hour")!.prayers.slice(1, 4).map((p) => p.title)).toEqual(["O Heavenly King", "The Trisagion", "The Lord's Prayer"]);
    expect(getHour("first-hour")!.prayers[1].instruction).toBe("The opening prayers, as in the Morning Rule.");
  });

  it("stops the build where a part points at nothing, rather than show a reader a blank", () => {
    const broken = { id: "x", title: "x", intro: "", estimatedMinutes: 1, source: "", prayers: [{ id: "a", from: { ruleId: "morning", prayerId: "no-such-prayer" } }] };
    expect(() => resolveHour(broken)).toThrow(/points to morning\/no-such-prayer/);
  });
});
