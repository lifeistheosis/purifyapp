// Every quotation the app shows has its source, exactly (1.8).
//
// The owner, 2026-10-17: "whenever it quotes a father, I want that quote
// linked specifically to their book ... Whatever quote, the father, or
// scripture, or something ... you can easily see where it comes from." So
// each quotation carries a `cite` (lib/citations/cite.ts) and its line is
// read from it. These tests hold every one to its text:
//
//   scripture  the words are in the verses of the app's own Bible
//   work       the words are in the paragraph of the library work, which
//              is the author's own text (no section in our voice, no work
//              the reading room calls a retelling)
//   inexact    the words are close to the passage named and are NOT in it,
//              word for word (so the mark is true), and how they differ is
//              written down for the owner
//   text       a public-domain text the app does not carry, with its place
//              and edition
//   untraced   where we looked, written down for the owner
//
// "Word for word" is the words in order, letters and digits; capitals and
// punctuation at the edges of an excerpt are not words. Nothing here
// changes a quotation to fit a source: the marks say what is true of the
// words as they are.
//
// What a reader would notice if this broke: a quotation credited to a book
// that does not say it, a link that opens the wrong page, a line our own
// summary wrote shown as a Father's words.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { citeWords, staticShown, type Cite, type ScriptureCite, type WorkCite } from "@/lib/citations/cite";
import { resolveCitation } from "@/lib/citations/resolve";
import { shownCite } from "@/lib/citations/shown";
import { LOCALES } from "@/lib/i18n/locales";
import { HERESIES } from "@/lib/heresies/heresies";
import { LESSONS, getLesson } from "@/lib/prayers/learning";
import { ENTRIES, bylineOf, type WorkKey } from "@/lib/reading/entries";
import { SAINTS } from "@/lib/saints/saints";
import { allSayings } from "@/lib/today/saying";
import type { TopicCitation } from "@/lib/topics/topics";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const readJson = <T,>(...p: string[]) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8")) as T;
const EN = readJson<Record<string, string>>("lib", "i18n", "messages", "en.json");
const EM_DASH = String.fromCharCode(0x2014);

/** The words in order: letters and digits, lower case. */
const words = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

type Verse = { n: number; text: string };
function verses(c: ScriptureCite): string | null {
  const file = path.join(ROOT, "data", "bible", c.book, `${c.chapter}.json`);
  if (!fs.existsSync(file)) return null;
  const list = readJson<{ verses: Verse[] }>("data", "bible", c.book, `${c.chapter}.json`).verses;
  const to = c.to ?? c.from;
  const run = list.filter((v) => v.n >= c.from && v.n <= to);
  return run.length === to - c.from + 1 ? run.map((v) => v.text).join(" ") : null;
}

type Section = { n: number; voice?: string; paragraphs: string[] };
const files = new Map<string, { sections: Section[] }>();
function paragraph(c: WorkCite): { text: string; voice?: string } | null {
  const key = `${c.saint}/${c.work}`;
  if (!files.has(key)) files.set(key, readJson("data", "saints", c.saint, `${c.work}.json`));
  const s = files.get(key)!.sections.find((x) => x.n === c.section);
  const text = s?.paragraphs[c.paragraph];
  return text === undefined ? null : { text, voice: s!.voice };
}

/** Holds one quotation to its cite; returns what is wrong, or null. */
function check(text: string, cite: Cite): string | null {
  switch (cite.kind) {
    case "scripture": {
      const v = verses(cite);
      if (!v) return `no such verses ${cite.book} ${cite.chapter}:${cite.from}-${cite.to ?? cite.from}`;
      return words(v).includes(words(text)) ? null : `not in ${cite.book} ${cite.chapter}:${cite.from}`;
    }
    case "work": {
      const p = paragraph(cite);
      if (!p) return `no such paragraph ${cite.saint}/${cite.work} s${cite.section} p${cite.paragraph}`;
      if (p.voice === "editorial") return "a section in our own voice";
      const entry = ENTRIES[`${cite.saint}/${cite.work}` as WorkKey];
      if (entry?.form === "retelling") return "a work the reading room calls a retelling";
      return words(p.text).includes(words(text)) ? null : `not in ${cite.saint}/${cite.work} s${cite.section} p${cite.paragraph}`;
    }
    case "inexact": {
      if (cite.differs.trim().length < 20) return "say how the words differ";
      const of = cite.of.kind === "scripture" ? verses(cite.of) : paragraph(cite.of)?.text ?? null;
      if (!of) return "the passage it is compared with is not there";
      return words(of).includes(words(text)) ? "marked not word for word, but it is" : null;
    }
    case "text":
      return cite.author.trim() && cite.work.trim() && cite.place.trim() && cite.edition.trim().length >= 3 ? null : "a text needs its author, work, place and edition";
    case "untraced":
      return cite.searched.trim().length >= 40 ? null : "say where we looked";
  }
}

describe("a saint's own words", () => {
  const all = SAINTS.flatMap((s) => (s.quotes ?? []).map((q, i) => ({ who: `${s.slug}[${i}]`, q })));

  it("are all held: every quotation names where it stands, and its words are there", () => {
    expect(all.length).toBeGreaterThan(100);
    const wrong = all.map(({ who, q }) => [who, q.cite ? check(q.text, q.cite) : "no cite"] as const).filter(([, e]) => e);
    expect(wrong.map(([who, e]) => `${who}: ${e}`)).toEqual([]);
  });

  it("each show a line on the page, which opens the words where they stand", () => {
    for (const { who, q } of all) {
      const shown = shownCite(q.cite);
      expect(shown, who).not.toBeNull();
      if (shown!.kind === "scripture" || shown!.kind === "father") expect(shown!.href, who).toMatch(/^\/(bible|saints)\//);
      if (shown!.kind === "father") expect(shown!.href, who).toContain(`/saints/${(q.cite as WorkCite).saint}/${(q.cite as WorkCite).work}#p-`);
    }
  });

  it("cite a work by its edition's own numbers where it keeps them", () => {
    const line = (slug: string, i: number) => {
      const q = SAINTS.find((s) => s.slug === slug)!.quotes![i];
      return citeWords(shownCite(q.cite)!, (k) => EN[k] ?? k);
    };
    expect(line("athanasius-the-great", 0)).toBe("St. Athanasius the Great, On the Incarnation, Chapter 54, NPNF II 4");
    expect(line("athanasius-the-great", 2)).toBe("St. Athanasius the Great, Four Discourses Against the Arians, Discourse I, §9, NPNF II 4");
    expect(line("john-chrysostom", 8)).toBe("St. John Chrysostom, On the Priesthood, Book III, §6, NPNF I 9");
    expect(line("justin-martyr", 0)).toBe("St. Justin Martyr, Dialogue with Trypho the Jew, Chapter 8, ANF 1");
    expect(line("theotokos", 0)).toBe("Luke 1:38, King James Version");
  });

  it("say so plainly where they are not word for word, or not yet traced", () => {
    const kinds = all.map(({ q }) => q.cite.kind);
    // The record of the 1.8 audit; a line moves out of these as its source is found.
    expect(kinds.filter((k) => k === "untraced").length).toBe(34);
    expect(kinds.filter((k) => k === "inexact").length).toBe(10);
    const t = (k: string) => EN[k] ?? k;
    expect(citeWords({ kind: "untraced" }, t)).toBe("Not yet traced to its source");
  });
});

describe("Today's saying of the Desert Fathers", () => {
  it("names the Father, and where the words come from, on the device", () => {
    for (const s of allSayings()) {
      expect(s.attribution.trim(), s.text).toBeTruthy();
      expect(check(s.text, s.cite), s.text).toBeNull();
      // The card chooses its saying on the device: its line must need no file read.
      expect(staticShown(s.cite), s.text).not.toBeNull();
    }
  });
});

describe("a lesson of Learn to pray", () => {
  // A line that credits a Father, or the Fathers, with a teaching.
  const CREDIT = /\b(?:St\.|Saint|Der heilige|Die heilige)\s+[A-ZÄÖÜ][\p{L}.]*(?:\s[\p{L}.]+){0,4}?\s(?:writes|says|teaches|schreibt|sagt|lehrt)\b|\b(?:The Fathers|Die Väter)\s(?:say|describe|call|see|teach|sagen|beschreiben|nennen|sehen|lehren)\b|\bTertullian\b/gu;

  for (const [locale, list] of [["en", LESSONS], ["de", LESSONS.map((l) => getLesson(l.id, "de")!)]] as const) {
    it(`(${locale}) marks every line that credits a Father, and each mark is in the lesson's own words`, () => {
      for (const lesson of list) {
        const sources = lesson.sources ?? [];
        for (const s of sources) {
          expect(lesson.intro.includes(s.words), `${locale} ${lesson.id}: ${s.words}`).toBe(true);
          expect(s.cite.kind === "text" || s.cite.kind === "untraced", `${locale} ${lesson.id}`).toBe(true);
          expect(check(s.words, s.cite), `${locale} ${lesson.id}: ${s.words}`).toBeNull();
        }
        for (const m of lesson.intro.matchAll(CREDIT)) {
          const at = m.index!;
          const covered = sources.some((s) => {
            const from = lesson.intro.indexOf(s.words);
            return from >= 0 && at >= from && at < from + s.words.length;
          });
          expect(covered, `${locale} ${lesson.id}: "${lesson.intro.slice(at, at + 60)}" has no mark`).toBe(true);
        }
      }
    });
  }

  it("shows the marks where the words stand and lists where each comes from, in every language", () => {
    const page = fs.readFileSync(path.join(ROOT, "app/(app)/prayers/learning/[lessonId]/page.tsx"), "utf8");
    expect(page).toContain("marked(");
    expect(page).toContain('<T k="prayers.learning.sources" />');
    for (const { code } of LOCALES) {
      const m = readJson<Record<string, string>>("lib", "i18n", "messages", `${code}.json`);
      for (const key of ["prayers.learning.sources", "cite.untraced", "cite.inexact", "saints.division.chapter"]) {
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key].includes(EM_DASH), `${code} ${key}`).toBe(false);
      }
      expect(m["saints.division.chapter"], code).toContain("{n}");
    }
  });
});

describe("a Father on a topic's or a heresy's page", () => {
  const topics = fs
    .readdirSync(path.join(ROOT, "data", "topics"))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => readJson<{ citations: TopicCitation[] }>("data", "topics", f).citations);
  const all = [...topics, ...HERESIES.flatMap((h) => h.refutedBy)];

  it("is quoted only in his own words: never the edition's chapter heading, never our summary", async () => {
    expect(all.length).toBeGreaterThan(20);
    for (const c of all) {
      const r = await resolveCitation(c);
      if (!r) continue;
      const where = `${c.saintSlug}/${c.workSlug} s${c.sectionN}`;
      expect(r.cite, where).not.toBeNull();
      if (r.paragraph === null) continue;
      const entry = ENTRIES[`${c.saintSlug}/${c.workSlug}` as WorkKey];
      if (entry) {
        expect(entry.form, where).not.toBe("retelling");
        expect(bylineOf(entry).kind, where).toBe("by");
      }
      expect(r.paragraph, where).not.toMatch(/^(?:§\d+\.|Chapter [IVXLC]+\.--)/);
      // It opens the paragraph it quotes.
      expect(r.href, where).toMatch(/#p-\d+-\d+$/);
    }
  });
});
