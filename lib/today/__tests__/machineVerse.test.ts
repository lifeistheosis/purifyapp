import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { localBookNames } from "@/lib/bible/books";
import { TRANSLATIONS, type Translation } from "@/lib/bible/translations";
import { OFFICIAL_FROM, OFFICIAL_TO } from "@/lib/calendar/officialReadings";
import { getMessages } from "@/lib/i18n";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { interpolate, resolvePluralKey } from "@/lib/i18n/plural";
import { NOTE, fitNote, type Measure } from "@/lib/share/verseCard";
import {
  MACHINE_SOURCES,
  MACHINE_VERSE,
  MACHINE_VERSE_REVIEW,
  englishPrint,
  machineCopyText,
  machineRowFor,
  machineShown,
  machineVerseFileUrl,
  machineVerseLanguage,
  readMachineVerseFile,
  verseRef,
  type MachineSource,
} from "@/lib/today/machineVerse";
import {
  machineVerseData,
  machineVerseDataLanguages,
  machineVerseFile,
  machineVerseFileParams,
  translationOf,
  widgetMachineVerses,
} from "@/lib/today/machineVerse.server";
import { getVerseOfDayTable } from "@/lib/today/verseOfDay";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";
import { VERSE_PICKS, shownVerse } from "@/lib/today/versePicks";
import { buildDayTable } from "@/lib/widget/dayTable";
import { widgetLabels } from "@/lib/widget/labels";

/**
 * The Verse of the Day machine-translated, TEMPORARY (lib/today/machineVerse.ts).
 *
 * Four promises, each held here: every verse the Verse of the Day can ever
 * choose has its translation, made from exactly the English the card shows;
 * the translation reads as Turkish, with the names Turkish Christians use;
 * its label goes everywhere its words go; and every other language is as it
 * was.
 */

const ROOT = process.cwd();
const EM_DASH = String.fromCharCode(0x2014);
const LANGUAGE = "tr";

const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

type Chapter = { source: string; verses: { n: number; text: string }[] };
const chapters = new Map<string, Chapter | null>();
function chapter(book: string, n: number): Chapter | null {
  const key = `${book}/${n}`;
  if (!chapters.has(key)) {
    const file = path.join(ROOT, "data/bible", book, `${n}.json`);
    chapters.set(key, fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Chapter) : null);
  }
  return chapters.get(key) ?? null;
}
function wholeVerse(book: string, c: number, v: number): { text: string; source: string } | null {
  const ch = chapter(book, c);
  const found = ch?.verses.find((x) => x.n === v);
  return ch && found ? { text: found.text.replace(/\s+/g, " ").trim(), source: ch.source } : null;
}

type Candidate = { book: string; chapter: number; verse: number; text: string; source: string; why: string };
type Reading = { kind: string; book: string; chapter: number; from: number };

/** The first Gospel, else Epistle, else Old Testament reading: the rule of lib/today/verseOfDay.ts. */
function firstOf(readings: Reading[]): Reading | null {
  for (const kind of ["gospel", "epistle", "ot"]) {
    const r = readings.find((x) => x.kind === kind);
    if (r) return r;
  }
  return null;
}

const dayMs = 86_400_000;
const noon = (key: string) => new Date(`${key}T12:00:00Z`);

/**
 * Every verse the Verse of the Day can show, two ways at once.
 *
 * The real picker, day by day, over the whole official list and two years
 * past it, so the chosen verses, the Paschal table and the official calendar
 * are read exactly as the app reads them. And every table it can fall back
 * to, whole: each chosen verse in the list whatever its date, the first
 * reading of each Paschal day and of each fixed date (any of which a later
 * build's window can reach in some year), and the rotation.
 */
let enumerated: Promise<{ all: Candidate[]; simulated: VerseOfDayEntry[] }> | null = null;
function candidates(): Promise<{ all: Candidate[]; simulated: VerseOfDayEntry[] }> {
  enumerated ??= enumerate();
  return enumerated;
}

async function enumerate(): Promise<{ all: Candidate[]; simulated: VerseOfDayEntry[] }> {
  const found = new Map<string, Candidate>();
  const add = (book: string, c: number, v: number, shown: string | null, why: string) => {
    const whole = wholeVerse(book, c, v);
    if (!whole) return; // a verse our Bible does not hold shows no words at all
    const text = shown ?? whole.text;
    const key = `${verseRef(book, c, v)}|${text}`;
    if (!found.has(key)) found.set(key, { book, chapter: c, verse: v, text, source: whole.source, why });
  };

  const from = noon(OFFICIAL_FROM);
  const days = Math.round((noon(OFFICIAL_TO).getTime() - from.getTime()) / dayMs) + 1 + 2 * 366;
  const table = await getVerseOfDayTable(from, days);
  const simulated = Object.values(table);
  for (const e of simulated) if (e.text) add(e.book, e.chapter, e.verse, e.text, "picker");

  for (const [date, pick] of Object.entries(VERSE_PICKS)) {
    const whole = wholeVerse(pick.book, pick.chapter, pick.verse);
    if (whole) add(pick.book, pick.chapter, pick.verse, shownVerse(whole.text, pick), `pick ${date}`);
  }
  const movable = read("data/calendar/movable-readings.json").offsets as Record<string, { readings: Reading[] }>;
  for (const [offset, day] of Object.entries(movable)) {
    const r = firstOf(day.readings);
    if (r) add(r.book, r.chapter, r.from, null, `Pascha ${offset}`);
  }
  const fixed = read("data/calendar/daily-readings.json") as Record<string, unknown>;
  for (const [date, list] of Object.entries(fixed)) {
    const r = Array.isArray(list) ? firstOf(list as Reading[]) : null;
    if (r) add(r.book, r.chapter, r.from, null, `fixed ${date}`);
  }
  for (const r of read("data/today/verses.json").rotation as Reading[]) add(r.book, r.chapter, r.from, null, "rotation");

  return { all: [...found.values()], simulated };
}

const data = machineVerseData(LANGUAGE)!;
const file = machineVerseFile(LANGUAGE)!;
const words = MACHINE_VERSE[LANGUAGE].words;
const turkishBooks = localBookNames((key) => getMessages(LANGUAGE)[key] ?? key);

describe("every verse the Verse of the Day can choose", () => {
  it("has a Turkish translation, made from exactly the English the card shows", async () => {
    const { all, simulated } = await candidates();
    // An empty enumeration would pass everything below.
    expect(simulated.length).toBeGreaterThan(1000);
    expect(all.length).toBeGreaterThan(400);
    const missing = all
      .filter((c) => !data.verses.some((row) => row.ref === verseRef(c.book, c.chapter, c.verse) && row.en === c.text && translationOf(row, LANGUAGE)))
      .map((c) => `${verseRef(c.book, c.chapter, c.verse)} (${c.why}): ${c.text}`);
    expect(missing).toEqual([]);
    // And the card finds each one in the file it fetches.
    for (const c of all) expect(machineRowFor(file, c), verseRef(c.book, c.chapter, c.verse)).not.toBeNull();
  }, 120_000);

  it("and the file holds nothing the picker can no longer choose", async () => {
    const { all } = await candidates();
    const wanted = new Set(all.map((c) => `${verseRef(c.book, c.chapter, c.verse)}|${c.text}`));
    expect(data.verses.filter((row) => !wanted.has(`${row.ref}|${row.en}`)).map((row) => row.ref)).toEqual([]);
  }, 120_000);
});

describe("the data file", () => {
  it("keeps each verse's reference, the edition and the exact English it came from", () => {
    expect(data.verses.length).toBeGreaterThan(400);
    for (const row of data.verses) {
      const m = /^([a-z0-9-]+) (\d+):(\d+)$/.exec(row.ref);
      expect(m, row.ref).not.toBeNull();
      const whole = wholeVerse(m![1], Number(m![2]), Number(m![3]));
      expect(whole, row.ref).not.toBeNull();
      expect(row.source, row.ref).toBe(whole!.source);
      expect((MACHINE_SOURCES as readonly string[]).includes(row.source), row.ref).toBe(true);
      if (row.part) expect(whole!.text.includes(row.en) && whole!.text !== row.en, row.ref).toBe(true);
      else expect(row.en, row.ref).toBe(whole!.text);
    }
  });

  it("files each verse once", () => {
    const keys = data.verses.map((row) => `${row.ref}|${row.en}`);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it("is marked for a future clergy review", () => {
    expect(data.review.status).toBe("awaiting-clergy-review");
    expect(data.review.drafted).toBe("2026-10-18");
    expect(data.review.basis).toMatch(/not an approved Bible translation/);
    expect(MACHINE_VERSE_REVIEW).toEqual({ status: "awaiting-clergy-review", since: "2026-10-18" });
    expect(data.language).toBe(LANGUAGE);
    // And the review queue says so, where a reviewer looks.
    const standards = fs.readFileSync(path.join(ROOT, "docs/editorial-standards.md"), "utf8");
    expect(standards).toContain("MACHINE_VERSE_REVIEW");
    expect(standards).toContain("data/today/machine-verse/tr.json");
  });

  it("is small in the apps: the shipped file carries a fingerprint of the English, not the English", () => {
    const shipped = Buffer.byteLength(JSON.stringify(file), "utf8");
    expect(shipped).toBeLessThan(100_000);
    expect(JSON.stringify(file)).not.toContain(data.verses[0].en);
    expect(machineVerseFileParams()).toEqual([{ file: "tr.json" }]);
    expect(machineVerseFileUrl(LANGUAGE)).toBe("/today-data/machine-verse/tr.json");
  });

  it("reads back from the file the card fetches, and refuses anything else", () => {
    const fetched = JSON.parse(JSON.stringify(file));
    expect(readMachineVerseFile(fetched, LANGUAGE)).toEqual(file);
    expect(readMachineVerseFile(fetched, "ka")).toBeNull();
    expect(readMachineVerseFile({ language: "tr", verses: { "john 1:1": [{ of: "x", from: "kjv-pd", text: "a" }] } }, "tr")).toBeNull();
    expect(readMachineVerseFile({ language: "tr", verses: { "john 1:1": [{ of: "811c9dc5", from: "niv", text: "a" }] } }, "tr")).toBeNull();
    expect(readMachineVerseFile({ language: "tr", verses: { "john 1:1": [{ of: "811c9dc5", from: "kjv-pd", text: " " }] } }, "tr")).toBeNull();
    expect(readMachineVerseFile(null, "tr")).toBeNull();
  });

  it("knows the English by a fingerprint that moves with a single letter", () => {
    expect(englishPrint("")).toBe("811c9dc5");
    expect(englishPrint("Jesus wept.")).toMatch(/^[0-9a-f]{8}$/);
    expect(englishPrint("Jesus wept.")).not.toBe(englishPrint("Jesus wept!"));
    // A changed English finds no translation: the reader sees the English, never a translation of other words.
    const row = data.verses.find((r) => r.ref === "luke 4:22")!;
    const entry = { book: "luke", chapter: 4, verse: 22, text: row.en };
    expect(machineRowFor(file, entry)?.text).toBe(translationOf(row, LANGUAGE));
    expect(machineRowFor(file, { ...entry, text: `${row.en} ` })).toBeNull();
  });
});

/** Lower case by Turkish rules: I to ı, İ to i. */
const lower = (s: string) => s.toLocaleLowerCase("tr");

/**
 * English names and words of the Gospel, and the Turkish a translation must
 * then carry, as Turkish Christians use them (Kutsal Kitap usage). Stems,
 * matched in lower case, so a suffix or a softened last letter (melek,
 * meleği) still counts.
 */
const NAMES: [RegExp, RegExp][] = [
  [/\bJesus\b/i, /isa/],
  [/\bChrist\b/, /mesih/],
  [/\bGod\b/, /tanrı/],
  [/\bLord\b/, /rab/],
  [/\bHoly (Ghost|Spirit)\b/, /kutsal ruh/],
  [/\bSon of man\b/, /insanoğlu/],
  [/\bkingdom of heaven\b/, /göklerin egemenliği/],
  [/\bkingdom of God\b/, /tanrı'nın egemenliği/],
  [/\bPeter\b/, /petrus/],
  [/\bJohn\b/, /yuhanna|yahya/],
  [/\bJames\b/, /yakup/],
  [/\bAndrew\b/, /andreas/],
  [/\bSimon\b/, /simun/],
  [/\bPhilip\b/, /filipus/],
  [/\bMatthew\b/, /matta/],
  [/\bJudas\b/, /yahuda/],
  [/\bMary\b/, /meryem/],
  [/\bMartha\b/, /marta/],
  [/\bLazarus\b/, /lazar/],
  [/\bJoseph\b/, /yusuf/],
  [/\bMoses\b/, /musa/],
  [/\bDavid\b/, /davut/],
  [/\bAbraham\b/, /ibrahim/],
  [/\bJacob\b/, /yakup/],
  [/\bIsrael\b/, /israil/],
  [/\bElias\b/, /ilyas/],
  [/\bJonas\b/, /yunus/],
  [/\bNoe\b/, /nuh/],
  [/\bHerod\b/, /hirodes/],
  [/\bPilate\b/, /pilatus/],
  [/\bCaesar\b/, /sezar/],
  [/\bGalilee\b/, /celile/],
  [/\bJerusalem\b/, /yeruşalim/],
  [/\bJud(a)?ea\b/, /yahudiye/],
  [/\bCapernaum\b/, /kefarnahum/],
  [/\bNazareth\b/, /nasıra/],
  [/\bBethany\b/, /beytanya/],
  [/\bJericho\b/, /eriha/],
  [/\bJordan\b/, /şeria/],
  [/\bEgypt\b/, /mısır/],
  [/\bPharisees?\b/, /ferisi/],
  [/\bSadducees\b/, /saduki/],
  [/\bscribes\b/, /din bilgin/],
  [/\bchief priests\b/, /başkâhin/],
  [/\bsabbath\b/i, /şabat/],
  [/\bsynagogues?\b/, /havra/],
  [/\btemple\b/, /tapına/],
  [/\bdisciples?\b/, /öğrenci/],
  [/\bprophets?\b/, /peygamber/],
  [/\bangels?\b/, /mele/],
  [/\bpassover\b/, /fısıh/],
  [/\bcross\b/, /haç/],
  [/\bcrucif/i, /çarmıh/],
  [/\bFather\b/, /baba/],
  [/\bfaith\b/, /iman/],
  [/\bdevils?\b/, /cin/],
  [/\bpublicans?\b/, /vergi görevli/],
  [/\bAmen\b/, /amin/],
];

/**
 * English that would mean a verse was left untranslated, matched as whole
 * words in any script. A suffix after an apostrophe (Celile'ye) is Turkish.
 */
const ENGLISH = /(?<![\p{L}'])(the|and|of|unto|that|with|which|shall|him|his|they|thou|thee|ye)(?![\p{L}'])/iu;

describe("the translation", () => {
  it("reads as Turkish, with the names Turkish Christians use", () => {
    const faults: string[] = [];
    for (const row of data.verses) {
      const tr = translationOf(row, LANGUAGE);
      const at = `${row.ref}${row.part ? " (part)" : ""}`;
      if (!tr.trim()) faults.push(`${at}: empty`);
      if (tr.includes(EM_DASH)) faults.push(`${at}: an em dash`);
      if (ENGLISH.test(tr)) faults.push(`${at}: English left in it`);
      if (/ {2}|\s[,.;:!?]|[([]\s/.test(tr)) faults.push(`${at}: a stray space`);
      if ((tr.match(/\(/g) ?? []).length !== (tr.match(/\)/g) ?? []).length) faults.push(`${at}: an unclosed bracket`);
      if ((tr.match(/\?/g) ?? []).length !== (row.en.match(/\?/g) ?? []).length) faults.push(`${at}: not the English's questions`);
      if ((tr.match(/!/g) ?? []).length > (row.en.match(/!/g) ?? []).length) faults.push(`${at}: an exclamation the English does not make`);
      // A verse that runs on in English runs on in Turkish, and one that ends, ends.
      const end = (s: string) => (/[.!?]$/.test(s.trim()) ? "end" : /[,;:]$/.test(s.trim()) ? "on" : "open");
      if (end(tr) !== end(row.en)) faults.push(`${at}: ends ${end(tr)}, the English ${end(row.en)}`);
      // A piece of a verse that starts mid-sentence starts mid-sentence.
      if (/^\p{Ll}/u.test(row.en) !== /^\p{Ll}/u.test(tr)) faults.push(`${at}: begins in the wrong case`);
      for (const [en, turkish] of NAMES) {
        if (en.test(row.en) && !turkish.test(lower(tr))) faults.push(`${at}: ${en} without ${turkish}`);
      }
      // The pronoun for God and for Christ is capitalised, as Turkish Bibles set it.
      if (/(?<!\p{L})o'(n|na|nu|nun|ndan|nda)(?!\p{L})/u.test(tr)) faults.push(`${at}: a lower-case o'n... for Him`);
    }
    expect(faults).toEqual([]);
  });

  it("never names the books and persons in English", () => {
    const english = /\b(Jesus|Christ|John|Peter|Galilee|Jerusalem|Pharisees?|Moses|Herod|Pilate|Holy Ghost|Lord|God)\b/;
    expect(data.verses.filter((row) => english.test(translationOf(row, LANGUAGE))).map((row) => row.ref)).toEqual([]);
  });
});

/** A rough width for the picture's arithmetic: half the size per letter, as lib/share's own test measures. */
const measure: Measure = (text, size) => text.length * size * 0.5;

describe("the label", () => {
  it("says what it is and what it is not, for each edition", () => {
    for (const source of MACHINE_SOURCES) {
      expect(lower(words.note[source]), source).toContain("makine çevirisi");
      expect(words.note[source], source).toContain("Onaylı bir Kutsal Kitap çevirisi değildir.");
      expect(words.original[source], source).toContain("İngilizce");
    }
    expect(words.note["kjv-pd"]).toContain("KJV");
    expect(words.note["brenton-lxx-pd"]).toContain("Septuaginta");
    expect(words.short).toBe("Makine çevirisi");
    for (const w of [words.short, words.showOriginal, words.showTranslation, ...Object.values(words.note), ...Object.values(words.original)]) {
      expect(w).not.toContain(EM_DASH);
    }
  });

  it("always comes with the words, on the card, in a copy and in a picture", async () => {
    const { simulated } = await candidates();
    let shownCount = 0;
    for (const entry of simulated) {
      const shown = machineShown(LANGUAGE, file, entry, turkishBooks);
      if (!entry.text) continue;
      expect(shown, entry.label).not.toBeNull();
      shownCount++;
      const source = wholeVerse(entry.book, entry.chapter, entry.verse)!.source as MachineSource;
      expect(shown!.note).toBe(words.note[source]);
      expect(shown!.text.trim()).not.toBe("");
      expect(shown!.reference).not.toMatch(/^(Matthew|Mark|Luke|John) /);
      const copied = machineCopyText(shown!);
      expect(copied.startsWith(shown!.text)).toBe(true);
      expect(copied.endsWith(`\n${shown!.reference}\n${shown!.note}`)).toBe(true);
    }
    expect(shownCount).toBeGreaterThan(1000);
    // The picture is made only when the label fits on it whole.
    for (const source of MACHINE_SOURCES) {
      const lines = fitNote(words.note[source], measure);
      expect(lines, source).not.toBeNull();
      expect(lines!.length).toBeLessThanOrEqual(NOTE.maxLines);
      expect(lines!.join(" ")).toBe(words.note[source]);
    }
    expect(fitNote("x ".repeat(400), measure)).toBeNull();
  }, 120_000);

  it("is the card's own: the view sets the translation down only beside it", () => {
    const view = fs.readFileSync(path.join(ROOT, "components/today/VerseOfDayView.tsx"), "utf8");
    const actions = fs.readFileSync(path.join(ROOT, "components/today/VerseCardActions.tsx"), "utf8");
    // The words come from `translated`, which is null without the machine verse and its note.
    expect(view).toContain("translated ? translated.text : vod?.text");
    expect(view).toContain("translated ? machine.note : machine.original");
    expect(view).toContain("translated={translated ?? undefined}");
    // Copy and picture take the label with the words.
    expect(actions).toContain("machineCopyText(translated)");
    expect(actions).toContain("note: translated.note");
  });

  it("goes onto the widgets in its shortest form, with every translated verse", async () => {
    const { simulated } = await candidates();
    for (const entry of simulated.slice(0, 400)) {
      if (!entry.text) continue;
      const machine = widgetMachineVerses(entry);
      expect(machine?.[LANGUAGE], entry.label).toBeDefined();
      const tr = machine![LANGUAGE];
      expect(tr.note).toBe("Makine çevirisi");
      expect(tr.text.trim()).not.toBe("");
      // In capitals by Turkish rules, so a phone in English still writes İ.
      expect(tr.ref).toBe(tr.ref.toLocaleUpperCase("tr"));
      expect(tr.ref).toMatch(/ \d+:\d+$/);
    }
    const luke = simulated.find((e) => e.book === "luke" && e.chapter === 4 && e.verse === 22);
    if (luke) expect(widgetMachineVerses(luke)?.tr.ref).toBe("LUKA 4:22");
    const hebrews = { label: "Hebrews 12:1", text: data.verses.find((r) => r.ref === "hebrews 12:1")!.en, href: "/bible/hebrews/12#v1", source: "related", book: "hebrews", bookName: "Hebrews", chapter: 12, verse: 1 } as VerseOfDayEntry;
    expect(widgetMachineVerses(hebrews)?.tr.ref).toBe("İBRANİLER 12:1");
  }, 120_000);
});

/** The app's translator for a language, as MessagesProvider builds it. */
function speaking(code: LocaleCode) {
  const messages = getMessages(code);
  return {
    locale: code,
    t: (key: string, vars?: Record<string, string | number>) => interpolate(messages[key] ?? key, vars),
    tn: (key: string, count: number, vars?: Record<string, string | number>) =>
      interpolate(resolvePluralKey(messages, key, count, code), { ...(vars ?? {}), count }),
  };
}

describe("every other language", () => {
  const others = LOCALES.map((l) => l.code).filter((code) => code !== LANGUAGE);

  it("is offered no translation, so its card, copy, picture and widgets are as they were", async () => {
    expect(machineVerseLanguage(LANGUAGE)).toBe(LANGUAGE);
    const { simulated } = await candidates();
    const sample = simulated.filter((e) => e.text).slice(0, 60);
    for (const code of others) {
      expect(machineVerseLanguage(code), code).toBeNull();
      for (const entry of sample) expect(machineShown(machineVerseLanguage(code), file, entry, turkishBooks)).toBeNull();
    }
    expect(machineVerseLanguage(null)).toBeNull();
    expect(machineVerseLanguage("xx")).toBeNull();
  }, 120_000);

  it("keeps the widget's English verse word for word; the translation only rides beside it", async () => {
    const start = noon(OFFICIAL_FROM);
    const vod = await getVerseOfDayTable(start, 30);
    const verses = Object.fromEntries(
      Object.entries(vod)
        .filter(([, e]) => e.text)
        .map(([k, e]) => {
          const machine = widgetMachineVerses(e);
          return [k, { text: e.text!, ref: e.label, href: e.href, ...(machine ? { machine } : {}) }];
        }),
    );
    const table = buildDayTable(start, 30, verses);
    for (const [k, day] of Object.entries(table.days)) {
      expect(day.verse?.text, k).toBe(vod[k].text);
      expect(day.verse?.ref, k).toBe(vod[k].label);
      expect(day.verse?.href, k).toBe(vod[k].href);
      expect(Object.keys(day.verse?.machine ?? {})).toEqual([LANGUAGE]);
    }
    // The table grows by little: about one short verse a day.
    const added = JSON.stringify(Object.values(table.days).map((d) => d.verse?.machine)).length / 30;
    expect(added).toBeLessThan(400);
  }, 120_000);

  it("hands the widgets its language, which finds no translation", () => {
    for (const code of [LANGUAGE as LocaleCode, ...others]) {
      const labels = widgetLabels({ ...speaking(code), streak: 3, nameDayIn: 9 });
      expect(labels.language, code).toBe(code);
    }
  });
});

describe("retiring it", () => {
  const turkishBible: Translation = { id: "tr-pd", shortLabel: "TR", fullLabel: "A Turkish Bible", testament: "BOTH", available: true, language: "tr" };

  it("stops by itself once the app has a Bible in the language", () => {
    expect(machineVerseLanguage(LANGUAGE, [...TRANSLATIONS, turkishBible])).toBeNull();
    expect(machineVerseLanguage(LANGUAGE, [...TRANSLATIONS, { ...turkishBible, available: false }])).toBe(LANGUAGE);
  });

  it("has no language switched on that has a Bible of its own: retire it as lib/today/machineVerse.ts says", () => {
    for (const language of Object.keys(MACHINE_VERSE)) {
      const own = TRANSLATIONS.filter((t) => t.available && t.language === language).map((t) => t.id);
      expect(own, `${language} has a Bible of its own (${own.join(", ")}): set MACHINE_VERSE.${language}.on to false and delete its translations`).toEqual([]);
    }
  });

  it("has a data file for every language it lists, and the other way round", () => {
    expect(machineVerseDataLanguages().sort()).toEqual(Object.keys(MACHINE_VERSE).sort());
  });
});
