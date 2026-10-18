import { referenceIn } from "@/lib/bible/books";
import { TRANSLATIONS, type Translation } from "@/lib/bible/translations";
import {
  MACHINE_SOURCES,
  readMachineRow,
  type MachineSource,
  type MachineVerseRow,
  type VerseOfDayEntry,
} from "@/lib/today/verseOfDay.types";

export { MACHINE_SOURCES, type MachineSource, type MachineVerseRow };

/**
 * TEMPORARY: the Verse of the Day, machine-translated, for an app language
 * that has no Bible of its own.
 *
 * WHY. A Turkish reader wrote "I want Turkish Language" over a photo of
 * Purify in Turkish: every word of the app was Turkish but the Verse of the
 * Day, which was the English KJV. Purify has no Turkish Bible, and no Turkish
 * translation it may ship is public domain. The owner's decision of
 * 2026-10-18: translate the Verse of the Day only, and only until a
 * public-domain translation is found ("this is specifically only for the
 * verse of the day until they get a public domain translation ... a temporal
 * fix"). The Bible reader is not touched and stays in English.
 *
 * WHAT. Every verse the Verse of the Day can show (lib/today/verseOfDay.ts:
 * the chosen verses, the first verse of each appointed reading in every
 * table it reads, the rotation) was translated ahead of time, faithfully and
 * literally from the English the app shows (the KJV for the New Testament,
 * Brenton's Septuagint for the Old), into data/today/machine-verse/<language>.json.
 * Nothing is translated when a reader opens the app, and no service is asked.
 * The apps carry the translations as one static file (app/today-data/), which
 * only a reader in that language ever fetches.
 *
 * THE LABEL TRAVELS WITH THE WORDS. Nothing here hands out the translated
 * text without its label: `machineShown` returns the two together or
 * neither, and the copy, the picture and the widgets all take the label from
 * the same place. The original English is one tap away on the card.
 *
 * A VERSE CHOSEN AFTER A BUILD. The content packs (lib/packs) bring the apps
 * the days a store build did not know, and each of those days carries its
 * translation inside it (VerseOfDayEntry.machine, made by
 * lib/packs/server.ts), so the card shows it, with the same label, even when
 * the shipped file has never heard of the verse.
 *
 * TO RETIRE IT, once a public-domain Bible in the language is in the app:
 *   1. Set `on: false` below. The card, the copy, the picture and the
 *      widgets' next build go back to the English at once. (A Bible added to
 *      lib/bible/translations.ts in that language turns it off by itself, and
 *      lib/today/__tests__/machineVerse.test.ts fails until step 2 is done.)
 *   2. Delete the language's entry here, its file in data/today/machine-verse/,
 *      and, with the last language, this file, lib/today/machineVerse.server.ts,
 *      lib/today/useMachineVerse.ts, app/today-data/machine-verse/ and their
 *      calls in components/today/VerseOfDayView.tsx, VerseCardActions.tsx,
 *      scripts/emit-widget-data.mjs and lib/packs/server.ts, with the
 *      `machine` field of lib/today/verseOfDay.types.ts and its reader in
 *      lib/packs/types.ts.
 *
 * Client-safe: no filesystem, no data file. The translations are read by
 * lib/today/machineVerse.server.ts (for the file and the widgets) and fetched
 * by lib/today/useMachineVerse.ts (for the card).
 */

/** The translations are ours, so they wait for a future clergy review (docs/editorial-standards.md, Clergy item 15). */
export const MACHINE_VERSE_REVIEW = {
  status: "awaiting-clergy-review",
  since: "2026-10-18",
} as const;

export type MachineVerseWords = {
  /** The line under the verse, and in a copy or a picture of it: what it is, and what it is not. */
  note: Readonly<Record<MachineSource, string>>;
  /** The shortest honest form, for the widgets. */
  short: string;
  /** The line under the verse while the reader has the English open. */
  original: Readonly<Record<MachineSource, string>>;
  showOriginal: string;
  showTranslation: string;
};

export type MachineVerseLanguage = {
  /** The switch. False puts the English back everywhere at once. */
  on: boolean;
  words: MachineVerseWords;
};

/**
 * The languages with a machine-translated Verse of the Day, and their words.
 * The words live here and not in the catalogs because they belong to the
 * translation: they go when it goes, and no other language needs them.
 */
export const MACHINE_VERSE: Readonly<Record<string, MachineVerseLanguage>> = {
  tr: {
    on: true,
    words: {
      note: {
        "kjv-pd": "İngilizce KJV'den makine çevirisi. Onaylı bir Kutsal Kitap çevirisi değildir.",
        "brenton-lxx-pd": "Brenton'ın İngilizce Septuaginta'sından makine çevirisi. Onaylı bir Kutsal Kitap çevirisi değildir.",
      },
      short: "Makine çevirisi",
      original: {
        "kjv-pd": "İngilizce asıl metin: King James Version (KJV).",
        "brenton-lxx-pd": "İngilizce asıl metin: Brenton'ın Septuaginta'sı (1851).",
      },
      showOriginal: "İngilizcesini göster",
      showTranslation: "Türkçesini göster",
    },
  },
};

/**
 * The language whose machine translation a reader in `locale` is shown, or
 * null for every other reader. Null when the switch is off, and null when
 * the app has a Bible of its own in that language: then that Bible is the
 * one to read, and this is the reminder to retire the rest.
 */
export function machineVerseLanguage(
  locale: string | null | undefined,
  translations: readonly Translation[] = TRANSLATIONS,
): string | null {
  if (!locale) return null;
  const language = MACHINE_VERSE[locale];
  if (!language?.on) return null;
  if (translations.some((t) => t.available && t.language === locale)) return null;
  return locale;
}

/** "luke 4:22": a verse's place, the key the translations are filed under. */
export function verseRef(book: string, chapter: number, verse: number): string {
  return `${book} ${chapter}:${verse}`;
}

/**
 * A short fingerprint of the English a translation was made from (FNV-1a,
 * 32 bits, as eight hex digits). The shipped file carries this instead of
 * the English, which the reader already has on the card, so a verse whose
 * English has changed since it was translated finds no translation, and the
 * reader sees the English rather than a translation of other words.
 */
export function englishPrint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** What app/today-data/machine-verse/<language>.json answers. */
export type MachineVerseFile = {
  language: string;
  verses: Record<string, MachineVerseRow[]>;
};

/** The address of a language's file: relative, so the apps read it from their own bundle. */
export function machineVerseFileUrl(language: string): string {
  return `/today-data/machine-verse/${language}.json`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The fetched file, read row by row: null when it is not a file this build understands. */
export function readMachineVerseFile(v: unknown, language: string): MachineVerseFile | null {
  if (!isRecord(v) || v.language !== language || !isRecord(v.verses)) return null;
  const verses: Record<string, MachineVerseRow[]> = {};
  for (const [ref, rows] of Object.entries(v.verses)) {
    if (!Array.isArray(rows)) return null;
    const read: MachineVerseRow[] = [];
    for (const row of rows) {
      const ok = readMachineRow(row);
      if (!ok) return null;
      read.push(ok);
    }
    verses[ref] = read;
  }
  return { language, verses };
}

/** The translation of exactly the English an entry shows, from the shipped file, or null. */
export function machineRowFor(file: MachineVerseFile, entry: Pick<VerseOfDayEntry, "book" | "chapter" | "verse" | "text">): MachineVerseRow | null {
  if (!entry.text) return null;
  const print = englishPrint(entry.text);
  return file.verses[verseRef(entry.book, entry.chapter, entry.verse)]?.find((row) => row.of === print) ?? null;
}

/**
 * The translation of exactly the English an entry shows, in `language`: the
 * one a content pack's day carries inside it first (a verse chosen after the
 * build was made), then the shipped file's. Either is used only when it was
 * made from these very words.
 */
export function machineRowOf(
  language: string,
  file: MachineVerseFile | null,
  entry: Pick<VerseOfDayEntry, "book" | "chapter" | "verse" | "text" | "machine">,
): MachineVerseRow | null {
  if (!entry.text) return null;
  const carried = entry.machine?.[language];
  if (carried && carried.of === englishPrint(entry.text)) return carried;
  return file && file.language === language ? machineRowFor(file, entry) : null;
}

/** Everything the card shows of a translated verse: never the words without their label. */
export type MachineShown = {
  language: string;
  text: string;
  /** The label, from the same edition as the English the text was made from. */
  note: string;
  /** Where it is from, with the book in the reader's language: "Luka 4:22". */
  reference: string;
  /** The line under the English, while the reader has it open. */
  original: string;
  showOriginal: string;
  showTranslation: string;
};

/**
 * The translated verse for an entry, with its label, or null: no language,
 * or no translation of these exact words, neither carried by the day (a
 * content pack's) nor in the shipped file (not loaded yet, or an English
 * that has changed). Null leaves the card as it is for every other reader:
 * the English, with no label.
 */
export function machineShown(
  language: string | null,
  file: MachineVerseFile | null,
  entry: VerseOfDayEntry | null,
  localBooks: Readonly<Record<string, string>>,
): MachineShown | null {
  if (!language || !entry) return null;
  const words = MACHINE_VERSE[language]?.words;
  const row = machineRowOf(language, file, entry);
  if (!words || !row) return null;
  return {
    language,
    text: row.text,
    note: words.note[row.from],
    reference: referenceIn(entry.label, entry.book, localBooks),
    original: words.original[row.from],
    showOriginal: words.showOriginal,
    showTranslation: words.showTranslation,
  };
}

/** What "Copy verse text" puts on the clipboard: the verse, where it is from, and its label. */
export function machineCopyText(shown: Pick<MachineShown, "text" | "reference" | "note">): string {
  return `${shown.text}\n${shown.reference}\n${shown.note}`;
}
