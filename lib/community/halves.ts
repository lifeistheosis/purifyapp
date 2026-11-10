// Community's two halves and the feed's filters (1.8): the owner's pick of
// r3-02, "B with A's top" (Homebase/boards/purify-master/variants/
// r3-02-community.html, INDEX.md "Round 3", locked 2026-10-30).
//
// One switch at the top, Pray together and Talk together, in place of the
// bar of seven pills (All, Following, Ask a Priest, Prayer wall, Discussion,
// Scripture, From the Fathers) the owner wanted gone (build 80 note 18).
// Talk together shows three words, All, Ask a Priest and Discussion, and
// keeps Following, Scripture and the Fathers behind the sliders. The prayer
// wall left the bar for Pray together, which campaigns joined in 1.9; then
// the wall itself went (his word, 2026-11-10), and Pray together is prayer
// campaigns alone, behind a door drawn only where they are open (prayDoor).
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

/**
 * The door to Pray together, which is the switch between the two halves
 * (1.9). Since the prayer wall went, Pray together holds prayer campaigns
 * and nothing else, so its door is drawn only where there is something
 * behind it for this reader:
 *
 *   "open"     Campaigns are open for this reader, or the app runs a campaign
 *              of its own. The switch is drawn.
 *   "waiting"  The server has not said yet whether campaigns are open for
 *              this reader. Nothing is drawn, and the switch's place is kept
 *              empty, so the page under it does not move when the switch
 *              comes.
 *   "shut"     The place was kept and the answer was no. The place closes.
 *   "none"     The answer was already no when the page was drawn: no switch
 *              and no place.
 *
 * A door is never shown and then taken away: while it waits, a reader sees
 * nothing where the switch would be.
 */
export type PrayDoor = "open" | "waiting" | "shut" | "none";

export function prayDoor(opts: {
  /** Whether campaigns are open for this reader; null until the server has said (lib/campaigns/useCampaignsOpen.ts). */
  campaigns: boolean | null;
  /** The app runs a campaign of its own (lib/community/runningCampaign.ts). */
  ownCampaign: boolean;
  /** This screen has kept the switch's place while it waited. */
  placeKept: boolean;
}): PrayDoor {
  if (opts.campaigns === true || opts.ownCampaign) return "open";
  if (opts.campaigns === null) return "waiting";
  return opts.placeKept ? "shut" : "none";
}

/**
 * The half that is shown: the one the address or the switch asks for while
 * the door is open, and while it is not yet known (a reader who came by an
 * address for Pray together is not shown the conversations first); with no
 * door, the conversations, whatever was asked.
 */
export function halfShown(asked: CommunityHalf, door: PrayDoor): CommunityHalf {
  return door === "open" || door === "waiting" ? asked : "talk";
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
