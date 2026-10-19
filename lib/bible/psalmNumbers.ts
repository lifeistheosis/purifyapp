/**
 * The Psalms in both numberings.
 *
 * Purify numbers the Psalms as the Church does, by the Septuagint: our Psalm
 * 22 is "The Lord is my shepherd", which most Bibles, numbered by the Hebrew,
 * call Psalm 23. A reader who typed "Psalm 23" landed on "The earth is the
 * Lord's" with no word that another psalm was meant. The owner said yes to
 * both numbers for 1.7 (2026-10-15, "automatic it"): a search shows both at
 * once, and a psalm's page names its other number. Nothing ever jumps a
 * reader to a psalm on its own, because "Psalm 50" means "Have mercy on me"
 * to an Orthodox reader and the other psalm to most others.
 *
 * The standard correspondence, by whole psalms (verses within a psalm can
 * differ by one where a title is counted, and are not mapped here):
 *   Septuagint 1-8      = Hebrew 1-8
 *   Septuagint 9        = Hebrew 9 and 10
 *   Septuagint 10-112   = Hebrew 11-113
 *   Septuagint 113      = Hebrew 114 and 115
 *   Septuagint 114, 115 = parts of Hebrew 116
 *   Septuagint 116-145  = Hebrew 117-146
 *   Septuagint 146, 147 = parts of Hebrew 147
 *   Septuagint 148-150  = Hebrew 148-150
 *   Septuagint 151      = not in the Hebrew Psalter
 */
export type HebrewNumber =
  | { kind: "same" }
  | { kind: "one"; n: number }
  | { kind: "two"; a: number; b: number }
  | { kind: "part"; n: number }
  | { kind: "none" };

/** What most Bibles call our psalm `lxx`. */
export function hebrewOf(lxx: number): HebrewNumber {
  if (lxx <= 8 || (lxx >= 148 && lxx <= 150)) return { kind: "same" };
  if (lxx === 9) return { kind: "two", a: 9, b: 10 };
  if (lxx >= 10 && lxx <= 112) return { kind: "one", n: lxx + 1 };
  if (lxx === 113) return { kind: "two", a: 114, b: 115 };
  if (lxx === 114 || lxx === 115) return { kind: "part", n: 116 };
  if (lxx >= 116 && lxx <= 145) return { kind: "one", n: lxx + 1 };
  if (lxx === 146 || lxx === 147) return { kind: "part", n: 147 };
  return { kind: "none" };
}

/** Our psalm or psalms for what most Bibles call psalm `hebrew`. */
export function septuagintOf(hebrew: number): number[] {
  if (hebrew <= 8 || (hebrew >= 148 && hebrew <= 150)) return [hebrew];
  if (hebrew === 9 || hebrew === 10) return [9];
  if (hebrew >= 11 && hebrew <= 113) return [hebrew - 1];
  if (hebrew === 114 || hebrew === 115) return [113];
  if (hebrew === 116) return [114, 115];
  if (hebrew >= 117 && hebrew <= 146) return [hebrew - 1];
  if (hebrew === 147) return [146, 147];
  return [];
}

/** The catalog line that names a psalm's other number, or null when both
 *  numberings agree. Keys under bible.psalm.hebrew.*; English says "in most
 *  Bibles", languages whose Bibles count by the Septuagint say "in the Hebrew
 *  numbering". */
export function hebrewLine(lxx: number): { key: string; values: Record<string, number> } | null {
  const h = hebrewOf(lxx);
  switch (h.kind) {
    case "same":
      return null;
    case "one":
      return { key: "bible.psalm.hebrew.one", values: { n: h.n } };
    case "two":
      return { key: "bible.psalm.hebrew.two", values: { a: h.a, b: h.b } };
    case "part":
      return { key: "bible.psalm.hebrew.part", values: { n: h.n } };
    case "none":
      return { key: "bible.psalm.hebrew.none", values: {} };
  }
}
