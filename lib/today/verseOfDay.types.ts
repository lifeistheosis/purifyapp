// Client-safe half of the Verse of the Day module.
//
// `verseOfDay.ts` is `server-only` (it reads data/bible off disk), but the
// card that renders the verse is a client component, so the shape they pass
// between them and the key they agree on have to live somewhere neither
// side is forbidden to import.

/**
 * The card's flat, render-ready shape: everything the Verse of the Day card
 * draws, and nothing else. Deliberately not the full `VerseOfDay` (which
 * carries the whole loaded passage), because a table of these is serialised
 * into the Android bundle and every field is paid for once per day in the
 * window.
 */
export type VerseOfDayEntry = {
  label: string;
  /** The verse text, already joined and whitespace-normalised. */
  text: string | null;
  href: string;
  /**
   * Where the verse is from, which is what the card marks it with. "related"
   * is a chosen verse that is NOT from the day's reading (lib/today/versePicks.ts),
   * and like "rotation" it carries no Gospel or Epistle mark.
   */
  source: "gospel" | "epistle" | "ot" | "rotation" | "related";
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  /**
   * TEMPORARY (lib/today/machineVerse.ts): the verse machine-translated into
   * a language that has no Bible of its own, by language code. Only a content
   * pack carries it (lib/packs/server.ts), so a verse chosen after a build
   * was made still reaches a reader in that language translated and
   * labelled. The build's own days leave it out: the apps find theirs in
   * the shipped file, and the window is not made heavier for anyone.
   */
  machine?: Readonly<Record<string, MachineVerseRow>>;
};

/** The editions the Verse of the Day's English comes from, as the Bible's own files name them. */
export type MachineSource = "kjv-pd" | "brenton-lxx-pd";

export const MACHINE_SOURCES: readonly MachineSource[] = ["kjv-pd", "brenton-lxx-pd"];

/** One machine translation of the Verse of the Day (lib/today/machineVerse.ts). */
export type MachineVerseRow = {
  /** A fingerprint of the English it was made from (englishPrint): the whole verse, or the piece of it the card shows. */
  of: string;
  /** The edition of that English. */
  from: MachineSource;
  /** The translation. */
  text: string;
};

/**
 * One translation as it arrives from the network or a file, rebuilt field by
 * field, or null when it is not one. Nothing else rides along.
 */
export function readMachineRow(v: unknown): MachineVerseRow | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const { of, from, text } = v as Record<string, unknown>;
  if (typeof of !== "string" || !/^[0-9a-f]{8}$/.test(of)) return null;
  if (typeof from !== "string" || !(MACHINE_SOURCES as readonly string[]).includes(from)) return null;
  if (typeof text !== "string" || !text.trim() || text.length > 1200) return null;
  return { of, from: from as MachineSource, text };
}

/** "YYYY-MM-DD" in the UTC frame the calendar lookups use. */
export function verseDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
