/**
 * How much a book's readings take on the phone, before they are saved (1.9,
 * his yes of 2026-11-09 to the sheet's 16: "the rough size beside the save
 * mark", no extra tap).
 *
 * A recording's own size is known only once it is saved, so this is the
 * length of each chapter not yet saved (data/readAloud/seconds.json, from the
 * timings, scripts/read-aloud-index.mjs) at the recordings' rate. The rate was
 * measured on 2026-11-09 from three of them as served (John 1, 2 and 3:
 * 1,645,656 bytes for 331 seconds, 838,848 for 167, 1,293,912 for 256), 4,972
 * to 5,052 bytes a second, about 40 kbit/s: 5,000 is within 1% of each.
 */

import seconds from "@/data/readAloud/seconds.json";

export const BYTES_PER_SECOND = 5_000;

const LENGTHS = seconds as Record<string, number>;

/** The bytes the chapters given would take, less those already saved ("book/chapter" keys). */
export function unsavedBytes(book: string, chapters: readonly number[], saved: ReadonlySet<string>): number {
  let total = 0;
  for (const c of chapters) {
    const key = `${book}/${c}`;
    if (!saved.has(key)) total += (LENGTHS[key] ?? 0) * BYTES_PER_SECOND;
  }
  return total;
}
