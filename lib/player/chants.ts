import { isStreamed } from "@/lib/chants/media";
import type { ChantIndexRow, ChantIndexVariant } from "@/lib/chants/types";

/**
 * What can play under a prayer (1.7). The owner, 2026-10-15: "allow you to
 * play it while you're praying ... they can choose which chants, and there's
 * like previews ... it previews the best, most popular section". And on
 * 2026-10-16: "Pray with chant" in the prayer rules opens the same library as
 * Chants.
 *
 * So this is no list of its own any more: it is the chants library's index
 * (app/chants-index.json, written by the export from data/chants), narrowed
 * to the recordings marked to play under a prayer. A chant joins it by
 * joining the library with `underPrayer` on a version.
 */
export type PrayerChoice = { chant: ChantIndexRow; variants: ChantIndexVariant[] };

/**
 * The chants that may play under a prayer, each with its versions. A chant
 * whose recordings ship inside the app comes first, since it plays with no
 * signal; streamed ones follow, in the library's order.
 */
export function underPrayerChoices(index: ChantIndexRow[]): PrayerChoice[] {
  const choices = index
    .map((chant) => ({ chant, variants: chant.variants.filter((v) => v.underPrayer) }))
    .filter((c) => c.variants.length > 0);
  const bundled = (c: PrayerChoice) => c.variants.some((v) => !isStreamed(v.audio.src));
  return [...choices.filter(bundled), ...choices.filter((c) => !bundled(c))];
}

/** One recording's own name in a picker: "<slug>/<variant id>". */
export function choiceId(chant: Pick<ChantIndexRow, "slug">, variant: Pick<ChantIndexVariant, "id">): string {
  return `${chant.slug}/${variant.id}`;
}

/** Read app/chants-index.json, checked loosely: a list of rows with a slug and versions. */
export function readChantIndex(value: unknown): ChantIndexRow[] | null {
  if (!Array.isArray(value)) return null;
  const ok = value.every(
    (r) => r && typeof r === "object" && typeof (r as ChantIndexRow).slug === "string" && Array.isArray((r as ChantIndexRow).variants),
  );
  return ok ? (value as ChantIndexRow[]) : null;
}

let indexPromise: Promise<ChantIndexRow[] | null> | null = null;

/**
 * The library's index, fetched once per session from the file the export
 * writes (a relative address: inside the apps it is in the bundle and needs
 * no signal). A failure is forgotten so the next open tries again.
 */
export function loadChantIndex(): Promise<ChantIndexRow[] | null> {
  if (!indexPromise) {
    indexPromise = fetch("/chants-index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(readChantIndex)
      .catch(() => null);
    indexPromise.then((rows) => {
      if (!rows) indexPromise = null;
    });
  }
  return indexPromise;
}
