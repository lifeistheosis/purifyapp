// Structural test records for the History timeline's performance and filter
// tests. These are OBVIOUSLY FAKE by construction (slug prefix "zz-test-",
// title prefix "Structural Test Record") and are generated only inside the
// test suite — nothing in app code or the content packager imports this
// file, and the integrity suite asserts no real event ever uses the prefix.

import type { HistoryEventMeta } from "../events";
import { EVENT_CATEGORIES, HISTORY_ERAS } from "../events";

export const TEST_RECORD_PREFIX = "zz-test-";

/** Deterministic pseudo-random structural records spread across all eras. */
export function generateStructuralRecords(count: number): HistoryEventMeta[] {
  const out: HistoryEventMeta[] = [];
  for (let i = 0; i < count; i++) {
    const era = HISTORY_ERAS[i % HISTORY_ERAS.length];
    const span = era.to - era.from;
    const year = era.from + ((i * 7) % Math.max(span, 1));
    const category = EVENT_CATEGORIES[i % EVENT_CATEGORIES.length].id;
    out.push({
      id: `${TEST_RECORD_PREFIX}id-${i}`,
      slug: `${TEST_RECORD_PREFIX}event-${i}`,
      title: `Structural Test Record ${i}`,
      yearStart: year,
      displayDate: String(year),
      precision: "year",
      era: era.id,
      categories: [category],
      importance: ((i % 3) + 1) as 1 | 2 | 3,
      preview: `Structural test preview ${i}.`,
      summary: `Structural test summary ${i}. Not a historical record.`,
      certainty: "editorial-synthesis",
      status: "published",
    });
  }
  return out.sort((a, b) => a.yearStart - b.yearStart);
}
