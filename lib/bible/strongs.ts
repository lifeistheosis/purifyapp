import "server-only";
import lexicon from "./strongs-greek.json";

/**
 * Strong's Greek lexicon, slimmed to lemma, transliteration, and a short
 * definition. Source: Open Scriptures (CC-BY-SA, derived from Strong's 1890).
 *
 * Keys are like "G25", "G3056". The "G" prefix is included so we can
 * disambiguate Greek from Hebrew Strong's numbers later.
 */
export type StrongsEntry = {
 /** Lemma (dictionary form). */
 l: string;
 /** Transliteration with stress marks. */
 t: string;
 /** Definition (concise). */
 d: string;
};

const LEX = lexicon as unknown as Record<string, StrongsEntry>;

/** Look up a Strong's entry by raw number ("25") or full key ("G25"). */
export function strongs(idOrNum: string): StrongsEntry | null {
 if (!idOrNum) return null;
 const key = idOrNum.startsWith("G") ? idOrNum : `G${idOrNum}`;
 return LEX[key] ?? null;
}

/**
 * Resolve a list of token Strong's numbers into a map keyed by the raw
 * number (no "G" prefix), suitable for shipping to a client component.
 */
export function strongsMap(nums: string[]): Record<string, StrongsEntry> {
 const out: Record<string, StrongsEntry> = {};
 for (const n of nums) {
 const e = strongs(n);
 if (e) out[n] = e;
 }
 return out;
}
