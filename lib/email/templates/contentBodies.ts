import { numberToWords } from "@/lib/i18n/numberWords";
import type { Entry } from "@/lib/whatsNew/entries";
import { groupByCategory } from "@/lib/whatsNew/updateHierarchy";

import { siteUrl } from "./build";
import type { MarketingBody } from "./marketingBodies";
import type { WeekLine } from "../weekly";

/**
 * Phase 2 of the funnel: the library list ("What is new in the library").
 * Three sends, each built from something the app already knows, so none of
 * them is copy anyone has to write:
 *
 *   weekly    Sunday. The week's feasts and saints from the calendar.
 *   monthly   The 1st. What was added, counted, because counting is what
 *             makes depth land ("eleven saints, two books").
 *   release   A hard push only. The body IS the patch note, unchanged, in the
 *             patch notes voice. A soft push gets no note and no email.
 */

export function weeklyBody(opts: {
  lines: readonly WeekLine[];
  saint: { name: string; slug: string } | null;
}): MarketingBody {
  const feast = opts.lines.find((l) => l.kind === "feast");
  return {
    subject: feast ? `The week ahead: ${feast.name}` : "The week ahead in the Church calendar",
    heading: "The week ahead",
    paragraphs: [
      ...opts.lines.map((l) => `${l.day}: ${l.name}`),
      opts.saint
        ? `This week, read about ${opts.saint.name} in the library.`
        : "The full calendar, every day and every saint, is in the library.",
      "Dates follow the new calendar.",
    ],
    action: opts.saint
      ? { label: `Read about ${opts.saint.name}`, href: siteUrl(`/saints/${opts.saint.slug}`) }
      : { label: "Open the calendar", href: siteUrl("/calendar") },
  };
}

export type LibraryCounts = { saints: number; books: number; chapters: number; verses: number };

const NOUNS: [keyof LibraryCounts, string, string][] = [
  ["saints", "saint", "saints"],
  ["books", "book", "books"],
  ["chapters", "chapter", "chapters"],
  ["verses", "verse", "verses"],
];

/**
 * A count as a reader says it: in words up to 999, as the board asks ("eleven
 * saints, two books"), and with a thousands comma above that, because "thirty
 * five thousand two hundred and six verses" is not a sentence anyone reads.
 */
export function countWord(n: number): string {
  return n <= 999 ? numberToWords(n, "en") : n.toLocaleString("en-US");
}

/** "Eleven saints, two books and four hundred verses." */
export function countSentence(counts: Partial<LibraryCounts>, suffix = ""): string | null {
  const parts = NOUNS.flatMap(([key, one, many]) => {
    const n = counts[key] ?? 0;
    if (n <= 0) return [];
    return [`${countWord(n)} ${n === 1 ? one : many}${suffix}`];
  });
  if (parts.length === 0) return null;
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1) + ".";
}

/** What the library gained since the last monthly note. Negative changes are not news. */
export function addedSince(now: LibraryCounts, before: LibraryCounts | null): Partial<LibraryCounts> | null {
  if (!before) return null;
  return {
    saints: Math.max(0, now.saints - before.saints),
    books: Math.max(0, now.books - before.books),
    chapters: Math.max(0, now.chapters - before.chapters),
    verses: Math.max(0, now.verses - before.verses),
  };
}

/**
 * The monthly note. With a baseline it counts what was added; the first one,
 * with nothing to compare against, says what the library holds. Returns null
 * when there is a baseline and nothing was added: an email that says "nothing
 * new" is one nobody needs.
 */
export function monthlyBody(opts: {
  monthLabel: string;
  now: LibraryCounts;
  before: LibraryCounts | null;
}): MarketingBody | null {
  const added = addedSince(opts.now, opts.before);
  const addedLine = added ? countSentence(added, "") : null;
  if (added && !addedLine) return null;

  return {
    subject: added ? `What was added to Purify in ${opts.monthLabel}` : `The Purify library, ${opts.monthLabel}`,
    heading: added ? `Added in ${opts.monthLabel}` : "The library so far",
    paragraphs: added
      ? [
          `In ${opts.monthLabel} the library gained: ${addedLine!.charAt(0).toLowerCase()}${addedLine!.slice(1)}`,
          `It now holds ${countSentence(opts.now)!.charAt(0).toLowerCase()}${countSentence(opts.now)!.slice(1)}`,
        ]
      : [
          `The library holds ${countSentence(opts.now)!.charAt(0).toLowerCase()}${countSentence(opts.now)!.slice(1)}`,
          "From next month, this note will say what was added.",
        ],
    action: { label: "See what is new", href: siteUrl("/whats-new") },
  };
}

/** The release email: the patch note, unchanged, grouped the way /whats-new groups it. */
export function releaseBody(entry: Pick<Entry, "version" | "kind" | "blurb" | "items">): MarketingBody {
  const { uncategorised, groups } = groupByCategory(entry.items);
  return {
    subject: entry.kind ? `Purify ${entry.version}: ${entry.kind}` : `Purify ${entry.version}`,
    heading: `Purify ${entry.version}`,
    paragraphs: [
      ...(entry.blurb ? [entry.blurb] : []),
      ...uncategorised,
      ...groups.flatMap((g) => [`${g.category.emoji} ${g.category.label}`, ...g.items]),
    ],
    action: { label: "Read it on Purify", href: siteUrl("/whats-new") },
  };
}
