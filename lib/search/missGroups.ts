/**
 * Searches that found nothing, folded by their words (admin item A11): how
 * often each was asked, on how many days, when last, and in which languages.
 * The most asked first; a word asked once is still shown, last, since one
 * reader asking for a saint Purify lacks is worth seeing.
 *
 * Pure. Tested in lib/search/__tests__/missGroups.test.ts.
 */

export type MissRow = { words: string; day: string; locale: string | null; platform: string | null };

export type MissGroup = {
  words: string;
  count: number;
  /** Distinct days it was asked on: a burst from one evening reads differently from a steady need. */
  days: number;
  lastDay: string;
  /** Languages, the most frequent first. */
  locales: string[];
};

export function groupMisses(rows: readonly MissRow[], limit = 200): MissGroup[] {
  const by = new Map<string, { count: number; days: Set<string>; lastDay: string; locales: Map<string, number> }>();
  for (const r of rows) {
    let g = by.get(r.words);
    if (!g) {
      g = { count: 0, days: new Set(), lastDay: r.day, locales: new Map() };
      by.set(r.words, g);
    }
    g.count += 1;
    g.days.add(r.day);
    if (r.day > g.lastDay) g.lastDay = r.day;
    if (r.locale) g.locales.set(r.locale, (g.locales.get(r.locale) ?? 0) + 1);
  }
  return [...by.entries()]
    .map(([words, g]) => ({
      words,
      count: g.count,
      days: g.days.size,
      lastDay: g.lastDay,
      locales: [...g.locales.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l),
    }))
    .sort((a, b) => b.count - a.count || b.days - a.days || (a.lastDay < b.lastDay ? 1 : -1) || a.words.localeCompare(b.words))
    .slice(0, limit);
}
