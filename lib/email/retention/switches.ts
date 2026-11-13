import { isMarketingList } from "../lists";

import { RETENTION_KINDS, type RetentionKind } from "./kinds";
import type { FastId } from "./fasts";

/**
 * The switch for each retention email, and the owner's words that move it.
 *
 * THE SWITCH IS A CONSTANT IN VERSION CONTROL, as campaigns' is
 * (lib/campaigns/flags.ts): it carries a date and a reason, it cannot be
 * turned on by accident from a dashboard, and moving it is a push to main,
 * which waits for his word anyway.
 *
 * THREE POSITIONS, the arbiter's brief of 2026-11-13: "Behind one switch per
 * email that stays OFF until he says yes to its design. The FIRST send of
 * each goes to him alone (ADMIN_EMAILS) before any reader gets it."
 *
 *   off      Nothing is read and nothing is sent. Where all three stand.
 *   owner    The real email, through the real path (the send-once ledger,
 *            the budget, the unsubscribe link and headers), to the accounts
 *            behind ADMIN_EMAILS and to nobody else. It goes to him whether
 *            or not he turned the list on, and its foot says why.
 *   readers  Every reader who turned the list on, under the weekly cap.
 *
 * WHAT HOLDS EACH STEP, in retentionPosition below, whatever the constant
 * says:
 *
 *   - Past off only with his yes to that email's design (DESIGN_YES), word
 *     for word and dated. Until then the email exists only as the plain
 *     stand-in in letters.ts, which is never sent to anyone, him included:
 *     he sees designs on the kit, where Fable draws them and justifies each
 *     choice, and answers yes or no there.
 *   - Readers only with his word after the first send reached him
 *     (READERS_YES), and only once the unsubscribe page knows the list by
 *     name (lib/email/lists.ts), so that the Unsubscribe button in the email
 *     stops that one list. Short of either, the switch holds at owner.
 *
 * lib/email/retention/__tests__/switches.test.ts holds the constants: all off
 * today, and never past a step his words have not reached.
 */

export type RetentionPosition = "off" | "owner" | "readers";

/** His words, as he gave them, with the date and roughly the time (UTC). */
export type HisWord = { on: string; words: string };

/** The switches. All off (the arbiter's brief of 2026-11-13): the designs have his yes, and the first send waits on his word. */
export const RETENTION_SWITCHES: Record<RetentionKind, RetentionPosition> = {
  first_week: "off",
  pick_up: "off",
  fasting_companion: "off",
};

/**
 * His yes to each email's design, once Fable has drawn it on the kit with its
 * reasons. All three on 2026-11-13: "yes to all", his answer to the arbiter's
 * message of 20:41 UTC that set out the eleven design pages, among them the
 * emails' round 3 (every email Dark, the fast's calendar drawn again), which
 * drew the first week, where you left off and the companion in the kit's look
 * (docs/1.9-build/BRAINSTORM.md). The look is look.ts; the switches above stay
 * off (the arbiter's brief), so the first send, to him alone, waits on his word.
 */
const ALL_DESIGNS: HisWord = { on: "2026-11-13 about 20:47 UTC", words: "yes to all" };
export const DESIGN_YES: Record<RetentionKind, HisWord | null> = {
  first_week: ALL_DESIGNS,
  pick_up: ALL_DESIGNS,
  fasting_companion: ALL_DESIGNS,
};

/** His word, after the first send reached him alone, that readers may have it. */
export const READERS_YES: Record<RetentionKind, HisWord | null> = {
  first_week: null,
  pick_up: null,
  fasting_companion: null,
};

/**
 * The fasts the companion covers. The arbiter's brief: "The Nativity Fast is
 * first, then Great Lent and the rest." fasts.ts knows all four from the
 * calendar; each is added here once its season's look has his yes, since a
 * season wears its own look (docs/brand/kit/email/README.md, "Later seasons
 * take the same place").
 */
export const FASTS_ON: readonly FastId[] = ["nativity"];

let switches: Record<RetentionKind, RetentionPosition> = { ...RETENTION_SWITCHES };
let designs: Record<RetentionKind, HisWord | null> = { ...DESIGN_YES };
let readers: Record<RetentionKind, HisWord | null> = { ...READERS_YES };
let pageKnows: (kind: RetentionKind) => boolean = (kind) => isMarketingList(kind);
let fastsOn: readonly FastId[] = FASTS_ON;

/** Where an email's switch stands, as the sender obeys it: never past what his words allow. */
export function retentionPosition(kind: RetentionKind): RetentionPosition {
  const set = switches[kind];
  if (set === "off" || !designs[kind]) return "off";
  if (set === "readers" && (!readers[kind] || !pageKnows(kind))) return "owner";
  return set;
}

/** True when any email's switch is past off: the lifecycle job reads nothing for retention otherwise. */
export function anyRetentionOn(): boolean {
  return RETENTION_KINDS.some((kind) => retentionPosition(kind) !== "off");
}

/** The fasts the companion covers now. */
export function companionFasts(): readonly FastId[] {
  return fastsOn;
}

/** Test seam: a switch as a case needs it. Never called by the app. */
export function __setRetention(
  kind: RetentionKind,
  set: { position?: RetentionPosition; design?: HisWord | null; readers?: HisWord | null; pageKnows?: boolean },
): void {
  if (set.position !== undefined) switches = { ...switches, [kind]: set.position };
  if (set.design !== undefined) designs = { ...designs, [kind]: set.design };
  if (set.readers !== undefined) readers = { ...readers, [kind]: set.readers };
  if (set.pageKnows !== undefined) {
    const before = pageKnows;
    const known = set.pageKnows;
    pageKnows = (k) => (k === kind ? known : before(k));
  }
}

/** Test seam: the fasts as a case needs them. */
export function __setCompanionFasts(fasts: readonly FastId[]): void {
  fastsOn = fasts;
}

/** Test seam: everything back as the constants have it. */
export function __resetRetention(): void {
  switches = { ...RETENTION_SWITCHES };
  designs = { ...DESIGN_YES };
  readers = { ...READERS_YES };
  pageKnows = (kind) => isMarketingList(kind);
  fastsOn = FASTS_ON;
}
