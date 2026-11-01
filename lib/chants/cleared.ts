import { wordsOf } from "@/lib/player/captions";

import { lineWordTimes, readTiming } from "./media";
import type { Chant, ChantLine, ChantTiming, ChantVariant } from "./types";

/**
 * Chant words as sung, cleared by their rights holder (1.8, build 86 note 78).
 *
 * Where a choir sings a translation still under copyright (Psalm 135 in
 * English), a version's words are the nearest public-domain wording, and a
 * letter asks the holder's permission. The owner: "then make the system and
 * add a button to the back end so I can switch it on when I receive
 * clearance". So the words as sung, their word timing and the clearance are
 * kept in the chant_cleared_words table (supabase/migrations/
 * 20261101000000_chant_cleared_words.sql), entered in the admin (Content,
 * Chant words) when the clearance comes and never before, and switched on
 * there. A row switched on reaches every app within minutes, read at run
 * time (/api/chants/cleared, lib/chants/clearedClient.ts); with no signal,
 * no row, or anything that does not check out here, the version shows the
 * words it carries.
 *
 * Pure, and light enough for the client: the public read is checked by hand
 * here, the admin's writes with zod in lib/chants/clearedInput.ts.
 */
export type ClearedWords = {
  slug: string;
  variant: string;
  lines: ChantLine[];
  timing: ChantTiming;
  wordsSource: string;
};

/** The columns a reader's app reads: the migration grants these and no others. */
export const CLEARED_PUBLIC_COLUMNS = "chant_slug, variant_id, lines, timing, words_source";

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readLine(value: unknown): ChantLine | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const text = typeof v.text === "string" ? v.text.trim() : "";
  if (!text) return null;
  const optional = (k: "translit" | "en") => {
    const x = v[k];
    return typeof x === "string" && x.trim() ? x.trim() : undefined;
  };
  const translit = optional("translit");
  const en = optional("en");
  return { text, ...(translit ? { translit } : {}), ...(en ? { en } : {}) };
}

/**
 * One version's cleared words, checked: lines with words, and a timing file
 * that times those lines and, where it times words, those words. Null for
 * anything else, so a slip in the admin shows the carried words, never
 * broken ones.
 */
export function readCleared(value: unknown): ClearedWords | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const slug = v.slug ?? v.chant_slug;
  const variant = v.variant ?? v.variant_id;
  const source = v.wordsSource ?? v.words_source;
  if (typeof slug !== "string" || !NAME.test(slug) || typeof variant !== "string" || !NAME.test(variant)) return null;
  if (typeof source !== "string" || !source.trim() || !Array.isArray(v.lines) || !v.lines.length) return null;
  const lines = v.lines.map(readLine);
  if (lines.some((l) => !l)) return null;
  const timing = readTiming(v.timing);
  if (!timing || !timingFits(lines as ChantLine[], timing)) return null;
  return { slug, variant, lines: lines as ChantLine[], timing, wordsSource: source.trim() };
}

/** The timing is line for line these words, and word for word wherever it times words. */
export function timingFits(lines: ChantLine[], timing: ChantTiming): boolean {
  if (timing.lines.length !== lines.length) return false;
  return timing.lines.every((t, i) => {
    if (t.text !== lines[i].text || !(t.end > t.at)) return false;
    return t.words === undefined || (t.words.length === wordsOf(t.text).length && lineWordTimes(t, t.text) !== undefined);
  });
}

/** The public list, checked: every row that checks out, at most one a version. */
export function readClearedList(value: unknown): ClearedWords[] {
  const rows = value && typeof value === "object" ? (value as { cleared?: unknown }).cleared : null;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: ClearedWords[] = [];
  for (const row of rows) {
    const c = readCleared(row);
    if (!c || seen.has(`${c.slug}/${c.variant}`)) continue;
    seen.add(`${c.slug}/${c.variant}`);
    out.push(c);
  }
  return out;
}

/** A version as a page shows it: with the cleared words and their timing where they are on. */
export type ShownVariant = ChantVariant & {
  /** The cleared words' own timing, in hand: used instead of the carried timing file. */
  clearedTiming?: ChantTiming;
};
export type ShownChant = Omit<Chant, "variants"> & { variants: ShownVariant[] };

/**
 * The chant with every version whose cleared words are on showing them: its
 * lines, where they come from, and their timing. A version with none is as
 * the chant carries it, and so is the chant when nothing is on.
 */
export function withCleared(chant: Chant, cleared: readonly ClearedWords[]): ShownChant {
  const mine = cleared.filter((c) => c.slug === chant.slug);
  if (!mine.length) return chant;
  return {
    ...chant,
    variants: chant.variants.map((v) => {
      const c = mine.find((x) => x.variant === v.id);
      return c ? { ...v, lines: c.lines, wordsSource: c.wordsSource, clearedTiming: c.timing } : v;
    }),
  };
}
