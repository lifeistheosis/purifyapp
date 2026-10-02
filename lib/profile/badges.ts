// The badges a reader can hold, after Discord's profile badges.
//
// Three kinds:
//   DERIVED  worked out from tables that already exist, never stored:
//            Plus and Pro (live subscription dates), Verified (the blue
//            check), Early Reader (account age), Ambassador (an active row
//            in ambassadors).
//   GRANTED  given by the team from the admin panel and kept in
//            user_badges (20261001_profiles_badges.sql, Clergy added in
//            20261002_community_social.sql). The list here and the table's
//            check constraint must match; badges.test.ts holds them together.
//   EARNED   reached by the reader's own practice, read from what Purify
//            already records (lib/profile/earned.ts): the Psalter and the Four
//            Gospels read through, the forty days of Great Lent kept, a first
//            line shared from Scripture or the Fathers.
//
// Pure: the profile API and the tests apply the same rule.

export type BadgeId =
  | "team"
  | "moderator"
  | "clergy"
  | "verified"
  | "pro"
  | "plus"
  | "early_reader"
  | "psalter"
  | "gospels"
  | "lent"
  | "first_share"
  | "beta_tester"
  | "bug_hunter"
  | "ambassador"
  | "translator"
  | "contributor";

/** Badges the team grants by hand, in the database's own spelling and order. */
export const GRANTED_BADGES = [
  "team",
  "moderator",
  "clergy",
  "beta_tester",
  "bug_hunter",
  "translator",
  "contributor",
] as const;
export type GrantedBadge = (typeof GRANTED_BADGES)[number];

/** Badges reached by the reader's own practice. */
export const EARNED_BADGES = ["psalter", "gospels", "lent", "first_share"] as const;
export type EarnedBadgeId = (typeof EARNED_BADGES)[number];

export function isGrantedBadge(v: unknown): v is GrantedBadge {
  return typeof v === "string" && (GRANTED_BADGES as readonly string[]).includes(v);
}

export function isEarnedBadge(v: unknown): v is EarnedBadgeId {
  return typeof v === "string" && (EARNED_BADGES as readonly string[]).includes(v);
}

/**
 * Badges that stand for trust rather than taste, and so stay on show when a
 * reader makes their profile private: who is on the team, who moderates,
 * who is clergy, who is verified.
 */
export const STANDING_BADGES: readonly BadgeId[] = ["team", "moderator", "clergy", "verified"];

/**
 * Accounts made before this instant hold Early Reader for good. The profile
 * system shipped on 2026-10-01; everyone already here, and everyone who joins
 * in its first month, was early.
 */
export const EARLY_READER_BEFORE = "2026-11-01T00:00:00Z";

/** The row order on a profile: the team's marks first, then support, then practice, then history. */
export const BADGE_ORDER: readonly BadgeId[] = [
  "team",
  "moderator",
  "clergy",
  "verified",
  "pro",
  "plus",
  "psalter",
  "gospels",
  "lent",
  "first_share",
  "early_reader",
  "beta_tester",
  "bug_hunter",
  "ambassador",
  "translator",
  "contributor",
];

export type EarnedBadge = {
  id: BadgeId;
  /** When it was earned, where that is known (an ISO date), else null. */
  since: string | null;
};

export type BadgeInputs = {
  joinedAt: string | null;
  /** The subscription the reader shows: "pro" covers Plus, so only one appears. */
  tier: "plus" | "pro" | null;
  verified: boolean;
  ambassador: boolean;
  granted: { badge: string; granted_at: string | null }[];
  /** Reached by practice (lib/profile/earned.ts). */
  earned?: { id: EarnedBadgeId; since: string | null }[];
};

export function isEarlyReader(joinedAt: string | null): boolean {
  if (!joinedAt) return false;
  const at = new Date(joinedAt).getTime();
  return Number.isFinite(at) && at < new Date(EARLY_READER_BEFORE).getTime();
}

/** Every badge a reader holds, in profile order, each at most once. */
export function deriveBadges(input: BadgeInputs): EarnedBadge[] {
  const held = new Map<BadgeId, string | null>();
  for (const g of input.granted) {
    if (isGrantedBadge(g.badge)) held.set(g.badge, g.granted_at ?? null);
  }
  for (const e of input.earned ?? []) {
    if (isEarnedBadge(e.id)) held.set(e.id, e.since ?? null);
  }
  if (input.verified) held.set("verified", null);
  if (input.tier === "pro") held.set("pro", null);
  else if (input.tier === "plus") held.set("plus", null);
  if (isEarlyReader(input.joinedAt)) held.set("early_reader", input.joinedAt);
  if (input.ambassador) held.set("ambassador", null);
  return BADGE_ORDER.filter((id) => held.has(id)).map((id) => ({ id, since: held.get(id) ?? null }));
}
