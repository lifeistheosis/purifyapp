// The prayer book on a phone (1.8, note 72): one book of four chapters.
//
// The owner's pick of r3-26 for the Prayers tab, "A, the icon tiles. C, one
// prayer book." (Homebase/boards/purify-master/variants/
// r3-26-prayers-practices). Under the Practices tiles the book's chapters,
// I to IV, open one at a time onto a page of their prayers, each to its
// length, read like a printed book's contents (components/prayers/
// PrayerBookContents.tsx). What the chapters hold is decided here, from the
// registry (lib/prayers/rules.ts), so a test can read it:
//
//   - The Hours stand in the daily rule as one row, lit by the clock, not
//     as five: their own page is the day's five (DayTimeline).
//   - Today's prayer (/prayers/today, the day as a timeline) is a row of the
//     daily rule. Its Practices tile went, and this is its door now.
//   - The akathists close Devotional, the one akathist named under them.
//   - Your rule and Learn to pray are tiles above, so neither opens the book,
//     and the reader's own intercessions (Your rule's page) are not listed.
//   - A planned prayer is named in one line at its chapter's foot, as the
//     prayer book has named them since 1.7.
//
// The computer's /prayers keeps its own index (PrayerBookIndex.tsx).

import { HOUR_STARTS } from "@/lib/prayers/hourNow";
import { RULE_CATEGORY_ORDER, rulesByCategory, type RuleCategory, type RuleMeta } from "@/lib/prayers/rules";

/** A row of a chapter's page. */
export type BookLine =
  /** A prayer of its own, to its length. */
  | { kind: "prayer"; rule: RuleMeta }
  /** Today's prayer, the day as a timeline. */
  | { kind: "today"; href: "/prayers/today" }
  /** The Hours, lit by the clock. */
  | { kind: "hours"; href: "/prayers/hours" }
  /** The akathists. */
  | { kind: "akathists"; href: "/prayers/akathists" };

export type BookChapter = {
  category: RuleCategory;
  /** I to IV, as a printed book numbers its chapters. */
  numeral: string;
  /** The chapter's name in the catalogs. */
  nameKey: string;
  lines: BookLine[];
  /** Named at the page's foot: no verbatim text yet. */
  planned: RuleMeta[];
};

/** "The Church year" already exists in the saints namespace, so it is reused
 *  rather than re-translated into twenty languages (as PrayerBookIndex does). */
const CHAPTER_KEY: Record<RuleCategory, string> = {
  daily: "prayers.category.daily",
  "daily-life": "prayers.category.dailyLife",
  "church-year": "saints.theChurchYear",
  devotional: "prayers.category.devotional",
};

const NUMERALS = ["I", "II", "III", "IV"] as const;

/** The five Hours, one row of the daily rule. */
const HOURS: ReadonlySet<string> = new Set(HOUR_STARTS.map((h) => h.slug));

/** The reader's own intercessions: Your rule's page, a tile above. */
const ON_A_TILE: ReadonlySet<string> = new Set(["intercessory"]);

export function prayerBook(): BookChapter[] {
  return RULE_CATEGORY_ORDER.map((category, i) => {
    const rules = rulesByCategory(category).filter((r) => !ON_A_TILE.has(r.id));
    const lines: BookLine[] = rules
      .filter((r) => !r.planned && !HOURS.has(r.id))
      .map((rule) => ({ kind: "prayer", rule }));
    if (category === "daily") {
      lines.push({ kind: "today", href: "/prayers/today" }, { kind: "hours", href: "/prayers/hours" });
    }
    if (category === "devotional") lines.push({ kind: "akathists", href: "/prayers/akathists" });
    return {
      category,
      numeral: NUMERALS[i] ?? String(i + 1),
      nameKey: CHAPTER_KEY[category],
      lines,
      planned: rules.filter((r) => r.planned),
    };
  });
}

/** The chapter the book opens at: the daily rule. */
export const FIRST_OPEN = 0;
