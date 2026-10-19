// The reading room's editor's shelf (1.7).
//
// Until 1.7 this held "Popular reads" (six picks no reader's habit ever
// measured), "Your next read" and its paths. The room is rows of covers now
// (components/reading/ReadingRoom.tsx), and the shelf became the row for
// someone new to Orthodoxy, whose order lives with the works' own entries
// (lib/reading/entries.ts, BEGIN_ORDER). What stays here is the promise the
// old shelf made: every route it names is real. lib/reading/__tests__/
// curated.test.ts reads data/ and fails on a dead one.

import { BEGIN_ORDER } from "@/lib/reading/entries";
import { workHref } from "@/lib/reading/workHref";

/** New to Orthodoxy, as routes. */
export const WHERE_TO_BEGIN: readonly string[] = BEGIN_ORDER.map((key) => {
  const [saint, work] = key.split("/");
  return workHref(saint, work);
});

/** All curated routes, for the link assertion. */
export function allCuratedHrefs(): string[] {
  return [...WHERE_TO_BEGIN];
}
