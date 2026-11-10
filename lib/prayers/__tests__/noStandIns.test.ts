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

//
// And in an answer of Apologetics (the arbiter's word of 2026-11-10, the
// same day: "readers seeing words written for editors, the same fault as the
// First Hour's stand-ins"). On deism and On sola scriptura showed, where
// their passages from the Fathers should be, "The verbatim patristic
// florilegium for this entry is being assembled and will be added here.",
// in English in every language; and every answer showed, under who curated
// it, the file's own note of how it came to be ("Opened in v9.9 as a
// foundation entry ... permission on record."). The last section holds:
//
//  - Nothing an answer shows a reader promises what is not there or speaks
//    to an editor, and the page draws neither the promise nor the file's
//    note (`origin`), which stays in the file as the editors' record.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
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
    // Each Hour's opening prayers: O Heavenly King, the Trisagion, the Lord's Prayer. The First
    // Hour's since build 90 note 7; the Third's, Sixth's and Ninth's since his yes to call 13
    // (2026-11-10, docs/editorial/hours-opening.md part 1), the same three parts, the same words.
    expect(pointing).toBe(12);
    for (const slug of ["first-hour", "third-hour", "sixth-hour", "ninth-hour"]) {
      expect(getHour(slug)!.prayers.slice(1, 4).map((p) => p.title), slug).toEqual(["O Heavenly King", "The Trisagion", "The Lord's Prayer"]);
      expect(getHour(slug)!.prayers[1].instruction, slug).toBe("The opening prayers, as in the Morning Rule.");
    }
  });

  it("stops the build where a part points at nothing, rather than show a reader a blank", () => {
    const broken = { id: "x", title: "x", intro: "", estimatedMinutes: 1, source: "", prayers: [{ id: "a", from: { ruleId: "morning", prayerId: "no-such-prayer" } }] };
    expect(() => resolveHour(broken)).toThrow(/points to morning\/no-such-prayer/);
  });
});


/** What a note to an editor says in a study, each with why a reader must never see it. */
const EDITORS: readonly { words: RegExp; why: string }[] = [
  { words: /\bbeing assembled\b/i, why: "a promise where the passages should be" },
  { words: /\bwill be added\b/i, why: "a promise of what is not there" },
  { words: /\bfoundation entry\b/i, why: "the editors' word for a first draft" },
  { words: /\bopened in v\d/i, why: "the editors' record of when the entry was opened" },
  { words: /\bpermission on record\b/i, why: "the editors' record of a permission" },
  { words: /\bchecked against source\b/i, why: "the editors' record of a check" },
  { words: /\b(TODO|TBD|FIXME|placeholder|lorem ipsum)\b/i, why: "an unfinished line" },
];
const editorsNotes = (text: string | undefined) => (text ? EDITORS.filter((r) => r.words.test(text)).map((r) => r.why) : []);

type Block = { kind: string; text?: string; items?: string[]; source?: string };
type Quoted = { author?: string; work?: string; reference?: string; text?: string; gloss?: string };
type Answer = {
  slug: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  origin?: string;
  essay?: Block[];
  florilegium?: Quoted[];
  scripture?: { ref?: string; note?: string }[];
};

describe("an answer of Apologetics", () => {
  const READER = "components/apologetics/ApologeticsReader.tsx";
  const reader = fs.readFileSync(path.join(ROOT, READER), "utf8");
  /** The reader's code without its notes, where the old lines are told of. */
  const drawn = reader
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const answers = APOLOGETICS_TOPICS.filter((t) => !t.planned).map((t) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "apologetics", `${t.slug}.json`), "utf8")) as Answer);

  it("refuses the two lines the answers showed, each for its reason", () => {
    expect(editorsNotes("The verbatim patristic florilegium for this entry is being assembled and will be added here.")).toEqual([
      "a promise where the passages should be",
      "a promise of what is not there",
    ]);
    expect(
      editorsNotes(
        "Opened in v9.9 as a foundation entry. Florilegium assembled and verified 2026-07-27 (NPNF and ANF, checked against source). Enriched with the transcendental and intentionality arguments from the dogma-exegesis thread, permission on record.",
      ).length,
    ).toBeGreaterThanOrEqual(4);
    // An answer's own words pass.
    expect(editorsNotes("Deism grants a first cause but denies His providence and His coming among us.")).toEqual([]);
  });

  it("shows a reader nothing written for an editor: not in its words, and not in what the page draws", () => {
    expect(answers.length).toBeGreaterThan(2);
    const found: string[] = [];
    for (const a of answers) {
      const shown: [string, string | undefined][] = [
        ["title", a.title],
        ["subtitle", a.subtitle],
        ["summary", a.summary],
        ...(a.essay ?? []).flatMap((b, i): [string, string | undefined][] => [[`essay ${i}`, b.text], [`essay ${i} source`, b.source], ...(b.items ?? []).map((it, k): [string, string | undefined] => [`essay ${i} item ${k}`, it])]),
        ...(a.florilegium ?? []).flatMap((q, i): [string, string | undefined][] => [[`passage ${i} author`, q.author], [`passage ${i} work`, q.work], [`passage ${i} place`, q.reference], [`passage ${i}`, q.text], [`passage ${i} note`, q.gloss]]),
        ...(a.scripture ?? []).flatMap((v, i): [string, string | undefined][] => [[`verse ${i}`, v.ref], [`verse ${i} note`, v.note]]),
      ];
      for (const [where, text] of shown) for (const why of editorsNotes(text)) found.push(`${a.slug} ${where}: ${why}`);
    }
    expect(found).toEqual([]);
    // The page: no promise typed into it, and the file's own note never drawn.
    expect(editorsNotes(drawn), READER).toEqual([]);
    expect(drawn, `${READER} draws the file's note to its editors`).not.toMatch(/\borigin\b/);
  });

  it("keeps the editors' record where it belongs: in the file, which says what it says", () => {
    // The note is the editors' and stays theirs. It is why the page must not draw it.
    const noted = answers.filter((a) => editorsNotes(a.origin).length > 0).map((a) => a.slug);
    expect(noted.length).toBeGreaterThan(0);
  });

  it("has no part for the Fathers where it has no passage of theirs, never an empty one or a promise", () => {
    // The part is drawn only when there are passages; nothing stands in its place.
    expect(drawn).toMatch(/\{body\.florilegium\.length > 0 \? \(\s*<LeafPart id="answer-fathers"[\s\S]*?\) : null\}/);
  });
});
