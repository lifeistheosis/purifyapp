// Plus, introduced once (1.9, the owner's 111): "Plus never shows in the
// questions or the first week. After week one, one calm card shows the one
// Plus feature that fits that reader. Nothing pushy."
//
// The card is on Today (components/onboarding/RoadCards.tsx, PlusIntroCard),
// and whether a reader meets it at all is a test against Purify as it is
// (lib/ab/tests.ts, PLUS_INTRODUCED), shut until he has seen its stills
// (./flags.ts, PLUS_INTRO_LIVE). These are its rules, pure, so they are
// tested directly (./__tests__/plusIntro.test.ts):
//
//   - a week after the questions ended, never sooner, and never while a step
//     of the first week is still up on Today;
//   - only a reader who does not have Plus where Plus is sold. Where it is
//     not sold (an iPhone today) the app answers "has Plus" for everyone, so
//     no card is drawn there, and while the answer is not yet known, none;
//   - never a reader who is back and was asked the new questions: they have
//     met the locks already, and the test asks about new readers;
//   - never the newcomer's road, and never a reader with no road: they meet
//     the locks where the locks are, and nothing more;
//   - once. Tapped or closed, it is gone.
//
// Every word on the card is the feature's own, as the Plus sheet says it
// (lib/premium/plusRows.ts): its name and what it does. Nothing is written
// for the card, and it opens that feature's Try it, which shows and never
// grants.

import { PLUS_ROWS, type PlusLock, type PlusRow } from "@/lib/premium/plusRows";

import { daysBetween } from "./counting";
import type { Road } from "./road";

/** Days after the questions ended before the card may show. */
export const PLUS_INTRO_AFTER_DAYS = 7;

/**
 * The one Plus feature for each road, from what that reader came for
 * (docs/1.9-build/notes/onboarding-fable.md, 3.7). His to rearrange.
 */
export const INTRO_FEATURE: Readonly<Record<Road, PlusLock | null>> = {
  // The reader who already prays daily: the verses they keep, brought back until known.
  practicing: "remember",
  // A habit to keep.
  returning: "plans",
  catechumen: "plans",
  // The reader who came for the councils and the Fathers.
  catholic: "history",
  seeker: "history",
  // Bible study, in terms this reader already values.
  protestant: "crossrefs",
  christian: "crossrefs",
  // Nothing: they meet the locks where the locks are.
  newcomer: null,
};

/** The Plus sheet's own row for a road's feature, or null where the road has none. */
export function introRow(road: Road | null): PlusRow | null {
  const feature = road ? INTRO_FEATURE[road] : null;
  return feature ? (PLUS_ROWS.find((r) => r.feature === feature) ?? null) : null;
}

/** Whether the card's moment has come for this reader. */
export function plusIntroDue(o: {
  road: Road | null;
  /** The reader was asked the questions again, as one who is back. */
  again: boolean;
  /** The device's own day the questions ended, YYYY-MM-DD; null for a device from before it was kept. */
  onboardedDay: string | null;
  today: string;
  /** Whether the reader has the Plus feature layer: null while unknown. */
  plus: boolean | null;
  done: boolean;
  /** A step of the first week is up on Today. */
  weekUp: boolean;
}): boolean {
  if (o.done || o.again || o.weekUp) return false;
  if (!introRow(o.road)) return false;
  if (o.plus !== false) return false;
  if (!o.onboardedDay) return false;
  return daysBetween(o.onboardedDay, o.today) >= PLUS_INTRO_AFTER_DAYS;
}
