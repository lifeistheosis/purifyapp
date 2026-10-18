import type { Cite } from "@/lib/citations/cite";

/**
 * Lines the interface's own words used to credit to "the Fathers" with no
 * public-domain text behind them (1.8). Since the owner's word of 2026-10-18
 * they are out of the words in every language, and wait here with where we
 * looked, so a line can come back once its source is found. Never shown.
 *
 * The other places keep theirs beside their own data: the saints' quotes in
 * lib/saints/saints.ts (cite "untraced"), Today's in data/today/sayings.json
 * (`hidden`), the lessons' in data/prayers/learning (`hiddenSources`), the
 * lives', councils' and heresies' in lib/saints/lifeQuotes.ts,
 * lib/councils/accountQuotes.ts and lib/heresies/accountQuotes.ts, the
 * studies' in data/theology and data/apologetics (cite "untraced").
 */
export const HIDDEN_LINES: readonly { where: readonly string[]; words: string; cite: Cite }[] = [
  {
    where: ["prayers.heart.note", "prayers.today.jesusPrayerBlurb"],
    words: "The Fathers say the bringing-back is half the work.",
    cite: {
      kind: "untraced",
      searched: "A teaching the Prayers page gave to \"the Fathers\" in general, naming no Father and no work. Not found in the library or the commentary in these words; the lesson on the Jesus Prayer says it in our own voice.",
    },
  },
];
