// The doors of a Community profile (r3-28 A, "fade and doors", the owner's
// pick of 2026-10-31): under the picture, the name, the status and Follow,
// About, Badges, Posts, and Campaigns once prayer campaigns ship (1.9, note
// 70), each switching what is shown below them, as a saint's page does
// (components/saints/SaintDoors.tsx). Only the doors a profile has are drawn.
//
// Pure, so the viewer, the shared page and the tests ask the same question.

import type { PublicProfile } from "./publicProfile";

export type ProfileDoor = "about" | "badges" | "posts" | "campaigns";

/**
 * The Campaigns door, drawn on the sheet for 1.9: the campaigns a reader ran
 * stay on their profile when they end. Off until campaigns ship; turning it
 * on is the only step, its label and its place in the row are here.
 */
export const CAMPAIGNS_DOOR = false;

type Shown = Pick<PublicProfile, "private" | "postsHidden" | "badges" | "bio" | "patronSaint" | "favoriteVerse" | "joinedAt" | "parish" | "nowReading"> &
  Partial<Pick<PublicProfile, "clergy" | "links">>;

/** Whether About has anything to show: the private notice counts. */
export function aboutHasWords(p: Shown, inCommon = 0): boolean {
  if (p.private) return true;
  return Boolean(
    p.bio ||
      p.patronSaint ||
      p.favoriteVerse ||
      p.parish ||
      p.joinedAt ||
      p.nowReading ||
      p.clergy ||
      (p.links ?? []).length > 0 ||
      inCommon > 0,
  );
}

/**
 * The doors a profile shows, in the sheet's order. About when it has
 * anything; Badges unless a private profile holds no standing badge (a
 * private profile shows those alone); Posts unless they are hidden, by the
 * reader or by a private profile; Campaigns when it opens.
 */
export function profileDoors(
  p: Shown,
  opts: { inCommon?: number; posts?: boolean; campaigns?: boolean } = {},
): ProfileDoor[] {
  const doors: ProfileDoor[] = [];
  if (aboutHasWords(p, opts.inCommon ?? 0)) doors.push("about");
  if (!p.private || p.badges.length > 0) doors.push("badges");
  if (opts.posts !== false && !p.postsHidden) doors.push("posts");
  if (opts.campaigns ?? CAMPAIGNS_DOOR) doors.push("campaigns");
  return doors;
}
