import "server-only";

import trVerses from "@/data/today/machine-verse/tr.json";
import trMessages from "@/lib/i18n/messages/tr.json";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import {
  MACHINE_VERSE,
  englishPrint,
  machineRowFor,
  machineVerseLanguage,
  type MachineSource,
  type MachineVerseFile,
  type MachineVerseRow,
} from "@/lib/today/machineVerse";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";

/**
 * TEMPORARY, with lib/today/machineVerse.ts (which says why, and how to
 * retire it): the server's half of the machine-translated Verse of the Day.
 *
 * It reads data/today/machine-verse/<language>.json, where each verse keeps
 * its reference, the edition and the exact English it was made from, and the
 * translation, and makes from it the two things that leave the server:
 *
 * - the file the card fetches (app/today-data/machine-verse/), with each
 *   English replaced by its fingerprint, since the card has the English
 *   already and the apps' bundle is near its ceiling;
 * - the widgets' copy, inside each day of the day table
 *   (scripts/emit-widget-data.mjs, docs/WIDGETS.md), with the reference in
 *   the language and the shortest form of the label.
 */

/** One verse as the data file keeps it, for a reviewer. */
export type MachineVerseDataRow = {
  /** "luke 4:22" */
  ref: string;
  /** Set when the translation is of the piece of the verse a chosen verse shows (lib/today/versePicks.ts). */
  part?: boolean;
  source: MachineSource;
  /** The English exactly as the card shows it. */
  en: string;
} & Record<string, unknown>;

export type MachineVerseData = {
  language: string;
  made: string;
  review: { status: "awaiting-clergy-review" | "reviewed"; drafted: string; basis: string };
  verses: MachineVerseDataRow[];
};

/** Each language's data file and its catalog (for the names of the books). */
const SOURCES: Readonly<Record<string, { data: unknown; messages: unknown }>> = {
  tr: { data: trVerses, messages: trMessages },
};

/** A language's data file as committed, or null. */
export function machineVerseData(language: string): MachineVerseData | null {
  const data = SOURCES[language]?.data as MachineVerseData | undefined;
  return data && data.language === language ? data : null;
}

/** The languages that have a data file. */
export function machineVerseDataLanguages(): string[] {
  return Object.keys(SOURCES).filter((language) => machineVerseData(language) && MACHINE_VERSE[language]);
}

/** A row's translation, which the data file keeps under the language's own code. */
export function translationOf(row: MachineVerseDataRow, language: string): string {
  const text = row[language];
  return typeof text === "string" ? text : "";
}

/** The file the card fetches, for one language. */
export function machineVerseFile(language: string): MachineVerseFile | null {
  const data = machineVerseData(language);
  if (!data) return null;
  const verses: Record<string, MachineVerseRow[]> = {};
  for (const row of data.verses) {
    const text = translationOf(row, language);
    if (!text) continue;
    (verses[row.ref] ??= []).push({ of: englishPrint(row.en), from: row.source, text });
  }
  return { language, verses };
}

/**
 * The file's routes: one per language with a data file, on or off. A
 * language switched off keeps its file until it is deleted, so turning the
 * switch never leaves a route with nothing to export; nothing fetches it.
 */
export function machineVerseFileParams(): { file: string }[] {
  return machineVerseDataLanguages().map((language) => ({ file: `${language}.json` }));
}

/** The widgets' copy of a translated verse (docs/WIDGETS.md, section 1). */
export type WidgetMachineVerse = {
  text: string;
  /** In the language, in capitals as the widgets set it, cased by the language's own rules: "LUKA 4:22". */
  ref: string;
  /** The shortest honest form of the label. A widget shows the text only with it. */
  note: string;
};

const files = new Map<string, MachineVerseFile | null>();
const books = new Map<string, Readonly<Record<string, string>>>();

function fileFor(language: string): MachineVerseFile | null {
  if (!files.has(language)) files.set(language, machineVerseFile(language));
  return files.get(language) ?? null;
}

function booksFor(language: string): Readonly<Record<string, string>> {
  let names = books.get(language);
  if (!names) {
    const messages = (SOURCES[language]?.messages ?? {}) as Record<string, string>;
    names = localBookNames((key) => messages[key] ?? key);
    books.set(language, names);
  }
  return names;
}

/**
 * The day's verse in every language that has it, for the widgets, or
 * undefined when none does. Only a language whose switch is on, and only a
 * translation of exactly the English the entry shows.
 */
export function widgetMachineVerses(entry: VerseOfDayEntry): Record<string, WidgetMachineVerse> | undefined {
  const out: Record<string, WidgetMachineVerse> = {};
  for (const language of machineVerseDataLanguages()) {
    if (!machineVerseLanguage(language)) continue;
    const file = fileFor(language);
    const row = file ? machineRowFor(file, entry) : null;
    if (!row) continue;
    out[language] = {
      text: row.text,
      ref: referenceIn(entry.label, entry.book, booksFor(language)).toLocaleUpperCase(language),
      note: MACHINE_VERSE[language].words.short,
    };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
