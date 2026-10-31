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

import { citeWords, staticShown, type Cite, type CouncilCite, type ScriptureCite, type WorkCite } from "@/lib/citations/cite";
import { resolveCitation } from "@/lib/citations/resolve";
import { shownCite } from "@/lib/citations/shown";
import { ACCOUNT_QUOTES, HIDDEN_ACCOUNT_QUOTES } from "@/lib/councils/accountQuotes";
import { COUNCILS, getCouncil } from "@/lib/councils/councils";
import { FRONT_VERSE, FRONT_VERSE_CITE } from "@/lib/marketing/frontVerse";
import { LOCALES } from "@/lib/i18n/locales";
import { HERESY_QUOTES, HIDDEN_HERESY_QUOTES } from "@/lib/heresies/accountQuotes";
import { HERESIES } from "@/lib/heresies/heresies";
import { LESSONS, getLesson } from "@/lib/prayers/learning";
import { ENTRIES, bylineOf, type WorkKey } from "@/lib/reading/entries";
import { HIDDEN_LINES } from "@/lib/citations/hidden";
import { HIDDEN_LIFE_QUOTES, LIFE_QUOTES } from "@/lib/saints/lifeQuotes";
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
/**
 * The paragraph a cite names, and the ones after it that the words run on
 * into (`through`). The edition's own section numbers printed inside a
 * paragraph ("... an equivalent. 2. For being over all ...") are not words
 * of the text, and are left out of it.
 */
function paragraph(c: WorkCite): { text: string; voice?: string } | null {
  const key = `${c.saint}/${c.work}`;
  if (!files.has(key)) files.set(key, readJson("data", "saints", c.saint, `${c.work}.json`));
  const s = files.get(key)!.sections.find((x) => x.n === c.section);
  const run = s?.paragraphs.slice(c.paragraph, (c.through ?? c.paragraph) + 1) ?? [];
  if (!run.length || run.length !== (c.through ?? c.paragraph) - c.paragraph + 1) return null;
  return { text: run.join(" ").replace(/(^|\s)\d{1,3}\.(?=\s)/g, " "), voice: s!.voice };
}

function councilSection(c: CouncilCite): string | null {
  const file = path.join(ROOT, "data", "councils", c.council, `${c.document}.json`);
  if (!fs.existsSync(file)) return null;
  const s = readJson<{ sections: Section[] }>("data", "councils", c.council, `${c.document}.json`).sections.find((x) => x.n === c.section);
  return s ? s.paragraphs.join(" ") : null;
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
    case "council": {
      const text0 = councilSection(cite);
      if (!text0) return `no such section ${cite.council}/${cite.document} s${cite.section}`;
      return words(text0).includes(words(text)) ? null : `not in ${cite.council}/${cite.document} s${cite.section}`;
    }
    case "inexact": {
      if (cite.differs.trim().length < 20) return "say how the words differ";
      const of = cite.of.kind === "scripture" ? verses(cite.of) : cite.of.kind === "council" ? councilSection(cite.of) : paragraph(cite.of)?.text ?? null;
      if (!of) return "the passage it is compared with is not there";
      return words(of).includes(words(text)) ? "marked not word for word, but it is" : null;
    }
    case "text":
      return cite.author.trim() && cite.work.trim() && cite.place.trim() && cite.edition.trim().length >= 3 ? null : "a text needs its author, work, place and edition";
    case "untraced":
      return cite.searched.trim().length >= 40 ? null : "say where we looked";
  }
}

/** Saint quotes with no public-domain text we can find, kept unseen with where we looked (1.8). One
 *  fewer from 2026-10-26: St. Nektarios's words from a letter whose only source was the page taken out. */
const UNTRACED_SAINT_QUOTES = 15;

describe("a saint's own words", () => {
  const all = SAINTS.flatMap((s) => (s.quotes ?? []).map((q, i) => ({ who: `${s.slug}[${i}]`, q })));

  it("are all held: every quotation names where it stands, and its words are there", () => {
    expect(all.length).toBe(85);
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
    // A selection names the place in its source that its section prints.
    // (A Life, by no one we name as its author, is named by its own title.)
    expect(line("eustathius-of-antioch", 0)).toBe("The Confessor of Antioch, On Proverbs 8:22, kept by Theodoret, Ecclesiastical History I.7 (NPNF II.3)");
    // A public-domain text the library does not carry: its author, work, place and edition (F-49: the words were the page's, not Lecture VI's).
    expect(line("cyril-of-jerusalem", 0)).toBe("St. Cyril of Jerusalem, Catechetical Lectures, Lecture 6, §36, NPNF II 7");
    // A paragraph before a work's first division keeps its section's name and the work's edition.
    expect(line("photius-the-great", 0)).toBe("St. Photius the Great, The Bibliotheca, Photius's letter to his brother Tarasius, tr. Freese, 1920");
  });

  it("show only words traced to where they stand; the rest wait, unseen, with where we looked", () => {
    // Shown to others under the saint's name with its source (the Windows app's Discord presence): traced lines only.
    const presence = fs.readFileSync(path.join(ROOT, "lib/desktop/presenceAssemble.ts"), "utf8");
    expect(presence).toContain('.filter((q) => q.cite.kind !== "untraced" && q.cite.kind !== "inexact")');
    // The owner's word of 2026-10-18: a line no public-domain text carries is not shown.
    const page = fs.readFileSync(path.join(ROOT, "components/saints/QuotesSection.tsx"), "utf8");
    expect(page).toContain('all.filter((q) => q.cite.kind !== "untraced")');
    const life = fs.readFileSync(path.join(ROOT, "components/saints/SaintLife.tsx"), "utf8");
    expect(life).toContain('(saint.quotes ?? []).filter((q) => q.cite.kind !== "untraced")');
    const kinds = all.map(({ q }) => q.cite.kind);
    // The record of the 1.8 audit; a line moves out of these as its source is found.
    // The misattributed are gone, and the loose wordings are the library's own words now.
    expect(kinds.filter((k) => k === "inexact").length).toBe(0);
    expect(kinds.filter((k) => k === "untraced").length).toBe(UNTRACED_SAINT_QUOTES);
    for (const { who, q } of all) if (q.cite.kind === "untraced") expect(q.cite.searched.length, who).toBeGreaterThan(40);
    // Lines that were not the saint's own words.
    const texts = all.map(({ q }) => q.text);
    for (const gone of ["We believe in one Only and True God", "To call Mary Theotokos", "The illumination, or divine and deifying grace", "Concepts create idols", "Blessed are the poor in spirit"]) {
      expect(texts.some((t) => t.startsWith(gone)), gone).toBe(false);
    }
  });
});

describe("a quotation inside a saint's life", () => {
  it("names where it stands, and the words are there, or says they are not", () => {
    const entries = Object.entries(LIFE_QUOTES).flatMap(([slug, list]) => list.map((q) => ({ slug, q })));
    expect(entries.length).toBe(4);
    for (const { slug, q } of entries) {
      const life = SAINTS.find((s) => s.slug === slug)!.life.join("\n");
      expect(life.includes(q.words), `${slug}: ${q.words}`).toBe(true);
      expect(check(q.words, q.cite), `${slug}: ${q.words}`).toBeNull();
      expect(q.cite.kind, `${slug}: ${q.words}`).not.toBe("inexact");
      expect(shownCite(q.cite), slug).not.toBeNull();
    }
    // Waiting, out of the life's words, with where we looked (the owner's word of 2026-10-18).
    for (const [slug, list] of Object.entries(HIDDEN_LIFE_QUOTES)) {
      const life = SAINTS.find((s) => s.slug === slug)!.life.join("\n");
      for (const h of list) {
        expect(h.cite.kind, slug).toBe("untraced");
        expect(check(h.words, h.cite), slug).toBeNull();
        expect(life.includes(h.words), `${slug}: still shown`).toBe(false);
      }
    }
  });

  it("leaves no quotation of five words or more in an English life without its source", () => {
    const missing: string[] = [];
    for (const s of SAINTS) {
      const listed = LIFE_QUOTES[s.slug] ?? [];
      for (const p of s.life) {
        let prev: { end: number; covered: boolean } | null = null;
        for (const m of p.matchAll(/[“"]([^”"]+)[”"]/g)) {
          const quoted = m[1].trim();
          const start = m.index!;
          // A saying split by "he said," is one quotation.
          const continues: boolean = prev !== null && prev.covered && start - prev.end < 20;
          const covered: boolean = continues || listed.some((q) => words(q.words) === words(quoted));
          if (!covered && words(quoted).split(" ").length >= 5) missing.push(`${s.slug}: ${quoted}`);
          prev = { end: start + m[0].length, covered };
        }
      }
    }
    expect(missing).toEqual([]);
    const life = fs.readFileSync(path.join(ROOT, "components/saints/LifeSection.tsx"), "utf8");
    expect(life).toContain("marked(p, sources, LIFE_SOURCE)");
    expect(life).toContain("<SourceList ");
  });
});

describe("a quotation inside a council's account", () => {
  const accountOf = (slug: string) => {
    const c = COUNCILS.find((x) => x.slug === slug)!;
    return [...c.defined, ...c.condemned, ...c.life];
  };

  it("names where it stands, and the words are there, or says they are not", () => {
    const entries = Object.entries(ACCOUNT_QUOTES).flatMap(([slug, list]) => list.map((q) => ({ slug, q })));
    expect(entries.length).toBe(7);
    expect(entries.filter(({ q }) => q.cite.kind === "inexact").map(({ q }) => q.words)).toEqual(["One of the Trinity suffered in the flesh"]);
    for (const [slug, list] of Object.entries(HIDDEN_ACCOUNT_QUOTES)) {
      for (const h of list) {
        expect(h.cite.kind, slug).toBe("untraced");
        expect(check(h.words, h.cite), slug).toBeNull();
        // Said in our own words now, without quotation marks.
        expect(/["\u201C]/.test(accountOf(slug).join("\n").split(h.words)[0]?.slice(-1) ?? ""), `${slug}: still quoted`).toBe(false);
      }
    }
    for (const { slug, q } of entries) {
      expect(words(accountOf(slug).join("\n")), slug).toContain(words(q.words));
      expect(check(q.words, q.cite), `${slug}: ${q.words}`).toBeNull();
      expect(shownCite(q.cite), slug).not.toBeNull();
    }
  });

  it("leaves no quotation of five words or more without its source", () => {
    const missing: string[] = [];
    for (const c of COUNCILS) {
      const listed = ACCOUNT_QUOTES[c.slug] ?? [];
      for (const text of accountOf(c.slug)) {
        for (const m of text.matchAll(/[“"]([^”"]+)[”"]/g)) {
          const quoted = m[1].trim();
          if (words(quoted).split(" ").length < 5) continue; // a term ("Spirit-fighters", "out of nothing")
          if (!listed.some((q) => words(q.words) === words(quoted))) missing.push(`${c.slug}: ${quoted}`);
        }
      }
    }
    expect(missing).toEqual([]);
    const page = fs.readFileSync(path.join(ROOT, "app/(app)/councils/[slug]/page.tsx"), "utf8");
    expect(page).toContain("marked(para, sources, ACCOUNT_SOURCE)");
    expect(page).toContain('<SourceList id="account-sources"');
  });
});

describe("a line the interface gave to the Fathers", () => {
  it("is out of the words in every language, and waits with where we looked", () => {
    for (const h of HIDDEN_LINES) {
      expect(h.cite.kind).toBe("untraced");
      expect(check(h.words, h.cite)).toBeNull();
      for (const { code } of LOCALES) {
        const m = readJson<Record<string, string>>("lib", "i18n", "messages", `${code}.json`);
        for (const key of h.where) expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
      }
      for (const key of h.where) expect(/the Fathers/i.test(EN[key]), key).toBe(false);
    }
    for (const file of ["components/mobile/PrayersMobile.tsx", "app/(app)/prayers/page.tsx", "components/prayers/PrayersTodayClient.tsx"]) {
      expect(fs.readFileSync(path.join(ROOT, file), "utf8"), file).not.toContain('cite={{ kind: "untraced" }}');
    }
  });
});

describe("a quotation inside a heresy's claim or the Church's response", () => {
  it("names where it stands, and the words are there, or says they are not, and none is left without", () => {
    const entries = Object.entries(HERESY_QUOTES).flatMap(([slug, list]) => list.map((q) => ({ slug, q })));
    expect(entries.length).toBe(5);
    expect(entries.filter(({ q }) => q.cite.kind === "inexact" || q.cite.kind === "untraced")).toEqual([]);
    for (const [slug, list] of Object.entries(HIDDEN_HERESY_QUOTES)) {
      const hz = HERESIES.find((x) => x.slug === slug)!;
      for (const h of list) {
        expect(h.cite.kind, slug).toBe("untraced");
        // Said in our own words now, without quotation marks.
        expect(/["\u201C]/.test(`${hz.definition}\n${hz.response}`.split(h.words)[0]?.slice(-1) ?? ""), `${slug}: still quoted`).toBe(false);
      }
    }
    for (const { slug, q } of entries) {
      const h = HERESIES.find((x) => x.slug === slug)!;
      expect(`${h.definition}\n${h.response}`.includes(q.words), `${slug}: ${q.words}`).toBe(true);
      expect(check(q.words, q.cite), `${slug}: ${q.words}`).toBeNull();
      expect(shownCite(q.cite), slug).not.toBeNull();
    }
    const missing: string[] = [];
    for (const h of HERESIES) {
      for (const m of `${h.definition}\n${h.response}`.matchAll(/[“"]([^”"]+)[”"]/g)) {
        const quoted = m[1].trim();
        if (words(quoted).split(" ").length < 5) continue; // a party's name, a label
        if (!(HERESY_QUOTES[h.slug] ?? []).some((q) => words(q.words) === words(quoted))) missing.push(`${h.slug}: ${quoted}`);
      }
    }
    expect(missing).toEqual([]);
    const page = fs.readFileSync(path.join(ROOT, "app/(app)/heresies/[slug]/page.tsx"), "utf8");
    expect(page).toContain("marked(h.response, sources, HERESY_SOURCE)");
    expect(page).toContain('<SourceList id="heresy-sources"');
  });
});

describe("Today's saying of the Desert Fathers", () => {
  it("is word for word from the library every day, and names the Father and where the words stand", () => {
    // Since the owner's word of 2026-10-18: twelve sayings from the Life of
    // Antony and St John Cassian's Conferences, so the card has one every day.
    expect(allSayings().length).toBe(12);
    for (const s of allSayings()) {
      expect(s.attribution.trim(), s.text).toBeTruthy();
      expect(s.cite.kind, s.text).toBe("work");
      expect(check(s.text, s.cite), s.text).toBeNull();
      // The card chooses its saying on the device: its line is written with it, and is the line the server would give.
      expect(s.shown, s.text).toEqual(shownCite(s.cite));
    }
  });

  it("keeps the sayings it no longer shows, with where we looked, and never shows them", () => {
    const file = readJson<{ sayings: { cite: Cite }[]; hidden: { text: string; cite: Cite }[] }>("data", "today", "sayings.json");
    expect(file.hidden.length).toBe(12);
    for (const h of file.hidden) {
      expect(h.cite.kind, h.text).toBe("untraced");
      expect(check(h.text, h.cite), h.text).toBeNull();
      expect(allSayings().some((s) => s.text === h.text), h.text).toBe(false);
    }
    expect(staticShown({ kind: "untraced", searched: "x" })).toEqual({ kind: "untraced" });
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
          // Since the owner's word of 2026-10-18 only a traced line is shown (Tertullian, The Chaplet 3).
          expect(s.cite.kind, `${locale} ${lesson.id}`).toBe("text");
          expect(check(s.words, s.cite), `${locale} ${lesson.id}: ${s.words}`).toBeNull();
        }
        // The lines with no public-domain text behind them wait, out of the words, with where we looked.
        for (const h of lesson.hiddenSources ?? []) {
          expect(h.cite.kind, `${locale} ${lesson.id}: ${h.words}`).toBe("untraced");
          expect(check(h.words, h.cite), `${locale} ${lesson.id}: ${h.words}`).toBeNull();
          expect(lesson.intro.includes(h.words), `${locale} ${lesson.id}: still shown: ${h.words}`).toBe(false);
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
    expect(page).toContain("<SourceList ");
    const list = fs.readFileSync(path.join(ROOT, "components/citations/Marked.tsx"), "utf8");
    expect(list).toContain('<T k="cite.sources" />');
    for (const { code } of LOCALES) {
      const m = readJson<Record<string, string>>("lib", "i18n", "messages", `${code}.json`);
      for (const key of ["cite.sources", "cite.untraced", "cite.inexact", "saints.division.chapter"]) {
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key].includes(EM_DASH), `${code} ${key}`).toBe(false);
      }
      expect(m["saints.division.chapter"], code).toContain("{n}");
    }
  });
});

describe("a quotation in a book's Before you read", () => {
  const dir = path.join(ROOT, "data", "bible", "intros");
  const quotes = readJson<Record<string, { words: string; cite: Cite }[]>>("data", "bible", "intros", "quotes.json");
  const intro = (book: string) => fs.readFileSync(path.join(dir, `${book}.md`), "utf8");

  it("names where its words stand, and they are there, or says they are not", () => {
    const all = Object.entries(quotes).flatMap(([book, list]) => list.map((q) => ({ book, q })));
    expect(all.length).toBe(11);
    for (const { book, q } of all) {
      expect(intro(book).includes(q.words), `${book}: ${q.words}`).toBe(true);
      expect(check(q.words, q.cite), `${book}: ${q.words}`).toBeNull();
      expect(shownCite(q.cite), `${book}: ${q.words}`).not.toBeNull();
    }
    // The owner's word of 2026-10-18: Isaiah 7:14 is in Brenton's words now,
    // the line credited to St John Chrysostom on Romans is gone, and the title
    // of Isaiah is no longer quoted. What stays marked is the King James
    // "Lord is my shepherd", the psalm's name, under Brenton's psalm. Nothing
    // untraced is shown.
    expect(all.filter(({ q }) => q.cite.kind === "inexact").map(({ q }) => q.words)).toEqual(["Lord is my shepherd"]);
    expect(all.filter(({ q }) => q.cite.kind === "untraced")).toEqual([]);
    expect(intro("romans")).not.toContain("most profound");
  });

  it("leaves no quotation of three words or more without its source", () => {
    const books = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
    expect(books.length).toBeGreaterThan(70);
    const missing: string[] = [];
    for (const book of books) {
      const text = intro(book);
      for (const m of text.matchAll(/"([^"]+)"|“([^”]+)”/g)) {
        const quoted = (m[1] ?? m[2]).trim();
        if (words(quoted).split(" ").length < 3) continue; // a gloss ("going out", "I am"), not a quotation
        if (!(quotes[book] ?? []).some((q) => words(q.words) === words(quoted))) missing.push(`${book}: ${quoted}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("is numbered where it stands and listed under the introduction", () => {
    const screen = fs.readFileSync(path.join(ROOT, "components/bible/ChapterScreen.tsx"), "utf8");
    expect(screen).toContain("marked(intro, introSources, INTRO_SOURCE)");
    expect(screen.match(/<SourceList id="intro-sources"/g)?.length).toBe(2);
    const page = fs.readFileSync(path.join(ROOT, "app/(app)/bible/[book]/[chapter]/page.tsx"), "utf8");
    expect(page).toContain("loadIntroQuotes(book)");
    expect(page).toContain("introSources={introSources}");
  });
});

describe("the verse on the front page", () => {
  it("is the app's own Bible's words, word for word, and names its verse and Bible", () => {
    // Brenton's Nahum 1:7 since the owner's word of 2026-10-18; the page held a modern wording before.
    expect(FRONT_VERSE_CITE.kind).toBe("scripture");
    expect(check(FRONT_VERSE.en, FRONT_VERSE_CITE)).toBeNull();
    expect(shownCite(FRONT_VERSE_CITE)).toMatchObject({ kind: "scripture", reference: "1:7", translation: "brenton" });
    const page = fs.readFileSync(path.join(ROOT, "app/page.tsx"), "utf8");
    expect(page).toContain("FRONT_VERSE.en");
    expect(page).toContain('"reading.collection.brenton"');
  });
});

describe("a quotation in an event of Orthodox History", () => {
  type Block = { kind: string; text: string; source?: string; cite?: Cite };
  const blocks: { where: string; b: Block }[] = [];
  const walk = (v: unknown, where: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}.${i}`));
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.kind === "blockquote") blocks.push({ where, b: o as unknown as Block });
      for (const [k, x] of Object.entries(o)) walk(x, `${where}.${k}`);
    }
  };
  for (const f of fs.readdirSync(path.join(ROOT, "data", "history")).filter((x) => x.endsWith(".json"))) walk(readJson("data", "history", f), f);

  it("names its source, and where the app carries the words, opens them there", () => {
    expect(blocks.length).toBeGreaterThan(40);
    for (const { where, b } of blocks) {
      expect((b.source ?? "").trim().length, `${where}: a source`).toBeGreaterThan(10);
      if (!b.cite) continue;
      expect(check(b.text, b.cite), where).toBeNull();
      expect(shownCite(b.cite), where).not.toBeNull();
    }
    // The app's Bible, the library's works and the councils' documents: 18 at 1.8.
    expect(blocks.filter(({ b }) => b.cite).length).toBeGreaterThanOrEqual(18);
    const article = fs.readFileSync(path.join(ROOT, "components/history/EventArticle.tsx"), "utf8");
    expect(article).toContain("<SourceLine cite={cite} />");
    const council = fs.readFileSync(path.join(ROOT, "app/(app)/councils/[slug]/[document]/page.tsx"), "utf8");
    expect(council).toContain("id={`s${s.n}`}");
  });
});

describe("a Father, or a council, in a study of Theology or Apologetics", () => {
  type Entry = { author: string; saintSlug?: string; text: string; source?: string; cite?: Cite };
  type Council = { name: string; text: string; councilSlug?: string; cite?: Cite };
  const studies = (dir: string) =>
    fs
      .readdirSync(path.join(ROOT, "data", dir))
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ f, j: readJson<{ florilegium?: Entry[]; councils?: Council[] }>("data", dir, f) }));
  const entries = (dir: string) => studies(dir).flatMap(({ f, j }) => (j.florilegium ?? []).map((q, i) => ({ where: `${dir}/${f}[${i}]`, q })));

  for (const dir of ["theology", "apologetics"]) {
    it(`(${dir}) names where each quotation's words stand, or the page they were read on`, () => {
      for (const { where, q } of entries(dir)) {
        if (q.cite) {
          expect(check(q.text, q.cite), where).toBeNull();
          expect(shownCite(q.cite), where).not.toBeNull();
        } else {
          // Read word for word on the page its source names: the original NPNF or ANF edition's page at
          // ccel.org, or the scan it names (1.8, 2026-10-18).
          expect(q.source ?? "", where).toMatch(/^https:\/\//);
        }
      }
    });

    it(`(${dir}) shows the edition's own words, never New Advent's revised English`, () => {
      // The owner, 2026-10-18: "Swap the copyrighted wording. For public domain originals." Every line a
      // reader sees is the original translation: the library's copy of it, or its page at ccel.org.
      for (const { where, q } of entries(dir)) {
        if (q.cite?.kind === "untraced") continue;
        expect(q.source ?? "", where).not.toMatch(/newadvent\.org/);
        expect(q.cite?.kind ?? "page", where).not.toBe("inexact");
        expect(q.text.includes(EM_DASH), where).toBe(false);
      }
    });
  }

  it("say so plainly where the words are not yet traced, and keep them off the page", () => {
    // The record of the 1.8 audit: a line moves out of these as its source is found.
    const kinds = (dir: string) => {
      const out: Record<string, number> = {};
      for (const { q } of entries(dir)) out[q.cite?.kind ?? "page"] = (out[q.cite?.kind ?? "page"] ?? 0) + 1;
      return out;
    };
    expect(kinds("theology")).toEqual({ work: 63, council: 9, untraced: 42, page: 64 });
    expect(kinds("apologetics")).toEqual({ work: 9, page: 5 });
    for (const { where, q } of entries("theology")) if (q.cite?.kind === "untraced") expect(q.cite.searched.length, where).toBeGreaterThan(40);
  });

  it("leaves an untraced line out of what a reader is shown, and the saint it names off the cited list", async () => {
    const { loadTopicBody, saintsCitedIn } = await import("@/lib/theology/load");
    const { loadApologeticsBody } = await import("@/lib/apologetics/load");
    let hidden = 0;
    for (const { f, j } of studies("theology")) {
      const body = await loadTopicBody(f.replace(/\.json$/, ""));
      if (!body) continue;
      const untraced = (j.florilegium ?? []).filter((q) => q.cite?.kind === "untraced").length;
      expect(body.florilegium.length, f).toBe((j.florilegium ?? []).length - untraced);
      expect(body.florilegium.some((q) => q.cite?.kind === "untraced"), f).toBe(false);
      expect((body.councils ?? []).some((c) => c.cite?.kind === "untraced"), f).toBe(false);
      // A saint quoted only in lines still untraced is not named as cited.
      const named = new Set(saintsCitedIn(body).map((s) => s.saintSlug));
      const shownSaints = new Set((j.florilegium ?? []).filter((q) => q.cite?.kind !== "untraced").map((q) => q.saintSlug));
      for (const q of j.florilegium ?? []) {
        if (q.cite?.kind === "untraced" && q.saintSlug && !shownSaints.has(q.saintSlug)) expect(named.has(q.saintSlug), `${f}: ${q.saintSlug}`).toBe(false);
      }
      hidden += untraced;
    }
    expect(hidden).toBeGreaterThan(0);
    const atheism = await loadApologeticsBody("atheism");
    expect(atheism?.florilegium.length).toBe(14);
  });

  it("quotes a council from its own document where the app carries it, and opens the council that exists", () => {
    const councils = studies("theology").flatMap(({ f, j }) => (j.councils ?? []).map((c, i) => ({ where: `${f} council ${i}`, c })));
    expect(councils.length).toBe(16);
    for (const { where, c } of councils) {
      expect(c.cite, where).toBeTruthy();
      expect(check(c.text, c.cite!), where).toBeNull();
      expect(shownCite(c.cite!), where).not.toBeNull();
      if (c.councilSlug) expect(getCouncil(c.councilSlug), `${where}: /councils/${c.councilSlug}`).not.toBeNull();
    }
    // The Creed, Ephesus canon 7 and Chalcedon canon 28 in the edition's words since 1.8; the eight
    // councils the app does not carry, untraced, wait off the page.
    // 1.8: the papacy study adds Constantinople I, Canon 3, from the council's own document; and
    // once the app carried them, the sentence against Nestorius and the Sixth Council's on Honorius;
    // and the Theotokos study adds Cyril's first Anathematism, the Formula of Reunion and Chalcedon.
    expect(councils.filter(({ c }) => c.cite?.kind === "council").length).toBe(10);
    expect(councils.filter(({ c }) => c.cite?.kind === "inexact").length).toBe(0);
    expect(councils.filter(({ c }) => c.cite?.kind === "untraced").length).toBe(6);
  });

  it("shows the line under each quotation", () => {
    // A study of Theology resolves its passages in lib/theology/passages.ts
    // and draws its councils' words in StudyPartText since round 3 r3-13,
    // where it is read part by part.
    const readers: [string, string][] = [
      ["lib/theology/passages.ts", "components/theology/StudyPartText.tsx"],
      ["components/apologetics/ApologeticsReader.tsx", "components/apologetics/ApologeticsReader.tsx"],
    ];
    for (const [file, line] of readers) {
      expect(fs.readFileSync(path.join(ROOT, file), "utf8"), file).toContain("shownCite(q.cite)");
      expect(fs.readFileSync(path.join(ROOT, line), "utf8"), line).toContain("<SourceLine cite={");
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
