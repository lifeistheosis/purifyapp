// "Featured today" on Discover: one topic and one council, rotating by day
// of the year.
//
// Pure, so both halves of Discover pick the same pair and so the rotation
// is testable. The arithmetic existed twice under two names,
// `dayOfYearUtc` in the desktop page and `dayOfYearLocal` in the mobile
// component, which is one function with two spellings.

export type FeaturedTopicSummary = {
  slug: string;
  title: string;
  definition: string;
  citationCount: number;
};

export type FeaturedCouncilSummary = {
  slug: string;
  byname: string;
  year?: number;
  location?: string;
};

/**
 * Day of the year, 1 to 366, read off the UTC fields.
 *
 * Callers hand in a date already normalised to the reader's local day
 * (lib/calendar/useToday.ts), whose UTC fields carry that local day. So
 * this reads the fields it is given rather than converting again.
 */
export function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

export function pickFeatured<
  T extends { slug: string },
  C extends { slug: string },
>(topics: T[], councils: C[], day: Date): { topic: T | null; council: C | null } {
  const n = dayOfYear(day);
  return {
    topic: topics.length ? topics[n % topics.length] : null,
    council: councils.length ? councils[n % councils.length] : null,
  };
}
