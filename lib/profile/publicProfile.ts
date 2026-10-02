// The shapes a profile travels in. Pure data, shared by the routes, the
// profile card and the editor.

import type { EarnedBadge } from "./badges";
import type { ClergyMark, MyClergy, PublicClergy } from "./clergy";
import type { Cosmetics } from "./cosmetics";
import type { ShownLink, SocialLink } from "./socialLinks";
import type { CommunityPostKind } from "@/lib/community/types";

export type ProfilePost = {
  id: string;
  kind: CommunityPostKind;
  title: string | null;
  /** The first lines of the body, or of the shared quote. */
  excerpt: string;
  quoteSource: string | null;
  createdAt: string;
  likes: number;
  replies: number;
};

/**
 * What anyone may see of a reader. Never the auth uuid, never the email,
 * never a subscription date: the tier only, and only while it is live and
 * the reader shows it.
 */
export type PublicProfile = {
  handle: string;
  name: string;
  avatar: string | null;
  verified: boolean;
  /** The subscription badge the reader shows, null when none or hidden. */
  tier: "plus" | "pro" | null;
  joinedAt: string | null;
  bio: string | null;
  status: string | null;
  patronSaint: { slug: string; name: string } | null;
  favoriteVerse: { ref: string; label: string; href: string } | null;
  /** What shows: Plus cosmetics are already blanked here when unsubscribed. */
  cosmetics: Cosmetics;
  badges: EarnedBadge[];
  posts: ProfilePost[];
  /** The reader's parish, in their own words. */
  parish: string | null;
  /** A private profile shows its name, picture and standing badges only. */
  private: boolean;
  /** The posts tab is hidden by the reader (posts stay in the feed). */
  postsHidden: boolean;
  /** Set only on the reader's name day, while it is that date somewhere. */
  nameDay: { saint: string; year: number; greetings: number } | null;
  /** "Pray for me": since when, and how many have prayed. */
  prayerRequest: { since: string; count: number } | null;
  /** The chapter the reader has open, when they share it and it is recent. */
  nowReading: { ref: string; label: string; href: string; at: string } | null;
  /** Verified clergy: their rank and where they serve. 20261005; optional for older payloads. */
  clergy?: PublicClergy | null;
  /** Their links elsewhere, built on the server from what they saved. */
  links?: ShownLink[];
  /**
   * Days in a row they have kept, as it stands today in their own zone
   * (lib/streak, 20261006). Null when none, hidden by them, or private.
   * Optional for older payloads.
   */
  streak?: number | null;
};

/** What the reader has chosen to share or hide, for the editor. */
export type ProfileSettings = {
  parish: string | null;
  private: boolean;
  hidePosts: boolean;
  hideJoined: boolean;
  showNowReading: boolean;
  prayerRequest: boolean;
  /** The calendar the reader's name day is counted on, kept in step with their device. */
  calendar: "new" | "old";
  /** Community notifications on the reader's devices (20261005). */
  pushCommunity: boolean;
  /** The red flame on their profile (20261006). On unless they turn it off. */
  showStreak: boolean;
};

/** The signed-in reader's own profile, as the editor needs it. */
export type MyProfile = PublicProfile & {
  /** Every saved cosmetic, Plus ones included, shown or not. */
  saved: Cosmetics;
  /** An active Plus or Pro subscription, whether or not the mark is shown. */
  subscribed: boolean;
  handleChangedAt: string | null;
  settings: ProfileSettings;
  /** The reader's next name day (or today's), from their patron saint. */
  nextNameDay: { date: string; saint: string; today: boolean } | null;
  /** Every badge held, hidden ones included, for the editor's choice. */
  allBadges: EarnedBadge[];
  /** The badges the reader keeps off their profile (Plus). */
  hiddenBadges: string[];
  /** Their links as saved, for the editor's rows. */
  socialLinks: SocialLink[];
  /** Their own clergy verification, if they asked. */
  clergyRequest: MyClergy;
};

/** How the viewer stands with a profile; read with the viewer's own sign-in. */
export type ProfileRelation = {
  mine: boolean;
  following: boolean;
  followsYou: boolean;
  /** Readers both the viewer and the profile follow. */
  mutuals: { handle: string; name: string; avatar: string | null; decoration: string | null }[];
  /** "Many years!" already sent this name day. */
  greeted: boolean;
  /** "I prayed" already said for the current request. */
  prayed: boolean;
  /** Gift Plus is switched on (website only) and this is someone else. */
  canGift: boolean;
  /** The viewer muted this reader (20261005). Optional for older payloads. */
  muted?: boolean;
};

/** What the feed already knows of an author, to draw a profile before it loads. */
export type ProfileSeed = {
  handle: string;
  name: string;
  avatar: string | null;
  verified?: boolean;
  tier?: "plus" | "pro" | null;
  decoration?: string | null;
  clergy?: ClergyMark | null;
  nameColor?: string | null;
};

/** "john/3" to its label and link, or null when malformed. */
export function chapterRef(ref: string | null | undefined, bookName: (slug: string) => string | null) {
  if (!ref) return null;
  const m = /^([a-z0-9-]{1,40})\/(\d{1,3})$/.exec(ref);
  if (!m) return null;
  const name = bookName(m[1]);
  if (!name) return null;
  return { ref, label: `${name} ${Number(m[2])}`, href: `/bible/${m[1]}/${Number(m[2])}` };
}

/** "john/3/16" to its reader-facing label and link, or null when malformed. */
export function verseRef(ref: string | null | undefined, bookName: (slug: string) => string | null) {
  if (!ref) return null;
  const m = /^([a-z0-9-]{1,40})\/(\d{1,3})\/(\d{1,3})$/.exec(ref);
  if (!m) return null;
  const name = bookName(m[1]);
  if (!name) return null;
  return {
    ref,
    label: `${name} ${Number(m[2])}:${Number(m[3])}`,
    href: `/bible/${m[1]}/${Number(m[2])}#v${Number(m[3])}`,
  };
}

/** The first `max` characters of a body, cut at a word and ellipsed. */
export function excerptOf(text: string | null | undefined, max = 180): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
