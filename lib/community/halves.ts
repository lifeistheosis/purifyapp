// Community's two halves and the feed's filters (1.8): the owner's pick of
// r3-02, "B with A's top" (Homebase/boards/purify-master/variants/
// r3-02-community.html, INDEX.md "Round 3", locked 2026-10-30).
//
// One switch at the top, Pray together and Talk together, in place of the
// bar of seven pills (All, Following, Ask a Priest, Prayer wall, Discussion,
// Scripture, From the Fathers) the owner wanted gone (build 80 note 18).
// Talk together shows three words, All, Ask a Priest and Discussion, and
// keeps Following, Scripture and the Fathers behind the sliders. The prayer
// wall left the bar for Pray together, which campaigns join in 1.9.
//
// Pure, so the choices can be held by tests without a screen.

import type { CommunityPostKind } from "./types";

/** Which half of Community is open. */
export type CommunityHalf = "pray" | "talk";

/** The halves in the order the switch draws them: Pray together first. */
export const COMMUNITY_HALVES: readonly CommunityHalf[] = ["pray", "talk"];

/** The # that opens Pray together. Talk together, the half Community opens on, has none. */
export const PRAY_HASH = "#pray";

/**
 * The half an address asks for. Talk together unless it says #pray: a post
 * (#post-), a group's thread (#group-), a profile (#@handle) and the old
 * #conversations all live in Talk together.
 */
export function halfFromHash(hash: string): CommunityHalf {
  return hash === PRAY_HASH ? "pray" : "talk";
}

/** The # for a half: #pray, or none for Talk together. */
export function hashForHalf(half: CommunityHalf): string {
  return half === "pray" ? PRAY_HASH : "";
}

/** What the feed in Talk together shows. */
export type FeedFilter = "all" | "following" | "questions" | CommunityPostKind;

/** Each filter's word, by catalog key: every one the bar already had. */
export const FEED_FILTER_KEYS: Record<FeedFilter, string> = {
  all: "community.filterAll",
  following: "community.filterFollowing",
  questions: "community.filterQuestions",
  discussion: "community.kindDiscussion",
  scripture: "community.kindScripture",
  father: "community.kindFather",
};

/**
 * The three words across Talk together. A group's thread has no Ask a
 * Priest: questions go to the whole Community.
 */
export function feedTabs(inGroup: boolean): FeedFilter[] {
  return inGroup ? ["all", "discussion"] : ["all", "questions", "discussion"];
}

/**
 * What sits behind the sliders: Following (for a reader with an account,
 * outside a group's thread), Scripture and the Fathers.
 */
export function feedSliders({ signedIn, inGroup }: { signedIn: boolean; inGroup: boolean }): FeedFilter[] {
  return [...(signedIn && !inGroup ? (["following"] as const) : []), "scripture", "father"];
}
