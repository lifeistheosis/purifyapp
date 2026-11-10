// Words that may mean someone is in danger, and what follows from them (1.9;
// his item 129, answered 2026-11-10: "a plain safety line points a reader in
// danger to emergency help", with no priest and no lawyer needed for it).
//
// WHAT IT DOES. A campaign, an update or a comment whose words may mean its
// writer, or someone they write of, is in danger:
//
//   is read by a moderator first    it stands at the head of their queue,
//                                   marked "Read first: the writer may be in
//                                   danger" (lib/campaigns/moderation.ts;
//                                   dangerFirst below for a note's hold);
//   waits for that moderator        a campaign always waits while campaigns
//                                   are new; an update or a comment is held
//                                   for this reason alone
//                                   (lib/campaigns/thread.ts);
//   and its writer is shown,        "A moderator will read your words
//   at once,                        first." over the safety line
//                                   (components/campaigns/SafetyLine.tsx).
//
// The safety line itself is always there besides, on the rules page and at
// the foot of the start screen, for a reader who never writes such words.
//
// WHAT IT IS NOT. It is no judgment of anyone and no diagnosis. It reads
// English alone, which is said plainly: a reader in danger who writes in
// another language is read by the moderator who reads every campaign, and
// no sooner, and still has the line that is always there. It says nothing
// of doctrine, and the words a reader is shown are the ones he approved
// (campaigns.safety.line, campaigns.safety.first), in every language.
//
// Shared by the server and the screens: no secret is here, only a pattern
// and two small questions.

const DANGER = /\b(?:suicid\w*|kill\s+my\s?self|end\s+my\s+(?:own\s+)?life|take\s+my\s+(?:own\s+)?life|want\s+to\s+die|(?:don'?t|do\s+not)\s+want\s+to\s+(?:live|be\s+alive)|self[-\s]?harm)\b/i;

/** Whether any of these words may mean someone is in danger. */
export function maySpeakOfDanger(texts: readonly (string | null | undefined)[]): boolean {
  return DANGER.test(texts.filter(Boolean).join("\n"));
}

/** The word a held campaign's reasons carry for it, and a note's hold begins with. */
export const DANGER_MARK = "crisis";

/**
 * Why an update or a comment waits, when it waits for this. A hold's reason
 * is one of the few the table allows, and none of them is this one; so the
 * reason is the one a note held at writing already uses ("spam", as words
 * that ask for money are filed) and the truth is in its detail, which the
 * moderators' queue reads: it draws the mark from the detail, not the
 * reason, and puts the hold first.
 */
export const DANGER_HOLD_DETAIL = `${DANGER_MARK}: the writer may be in danger`;

/** A hold's detail with the mark before whatever else held it. */
export function withDangerMark(detail: string | null | undefined): string {
  const rest = (detail ?? "").trim();
  return rest ? `${DANGER_MARK}; ${rest}`.slice(0, 300) : DANGER_HOLD_DETAIL;
}

/** Whether a hold's detail, or a campaign's reasons, carry the mark. */
export function saysDanger(detail: string | null | undefined): boolean {
  return new RegExp(`(?:^|;\\s*)${DANGER_MARK}\\b`).test(detail ?? "");
}

/** The moderators' holds with those that may mean danger first, each group in the order it came. */
export function dangerFirst<T extends { detail?: string | null }>(holds: readonly T[]): T[] {
  return [...holds.filter((h) => saysDanger(h.detail)), ...holds.filter((h) => !saysDanger(h.detail))];
}

/** The site the safety line names, as it stands in every language's line, and where it opens. */
export const HELPLINES_SITE = "findahelpline.com";
export const HELPLINES_URL = "https://findahelpline.com";
