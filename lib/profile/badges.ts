// The badges a reader can hold, after Discord's profile badges.
//
// Two kinds:
//   DERIVED  worked out from tables that already exist, never stored:
//            Plus and Pro (live subscription dates), Verified (the blue
//            check), Early Reader (account age), Ambassador (an active row
//            in ambassadors).
//   GRANTED  given by the team from the admin panel and kept in
//            user_badges (20261001_profiles_badges.sql). The list here and
//            the table's check constraint must match; badges.test.ts holds
//            them together.
//
// Pure: the profile API and the tests apply the same rule.

export type BadgeId =
  | "team"
  | "moderator"
  | "verified"
  | "pro"
  | "plus"
  | "early_reader"
  | "beta_tester"
  | "bug_hunter"
  | "ambassador"
  | "translator"
  | "contributor";

/** Badges the team grants by hand, in the database's own spelling. */
export const GRANTED_BADGES = [
  "team",
  "moderator",
  "beta_tester",
  "bug_hunter",
  "translator",
  "contributor",
] as const;
export type GrantedBadge = (typeof GRANTED_BADGES)[number];

export function isGrantedBadge(v: unknown): v is GrantedBadge {
  return typeof v === "string" && (GRANTED_BADGES as readonly string[]).includes(v);
}

/**
 * Accounts made before this instant hold Early Reader for good. The profile
 * system shipped on 2026-10-01; everyone already here, and everyone who joins
 * in its first month, was early.
 */
export const EARLY_READER_BEFORE = "2026-11-01T00:00:00Z";

/** The row order on a profile: the team's marks first, then support, then history. */
export const BADGE_ORDER: readonly BadgeId[] = [
  "team",
  "moderator",
  "verified",
  "pro",
  "plus",
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
  if (input.verified) held.set("verified", null);
  if (input.tier === "pro") held.set("pro", null);
  else if (input.tier === "plus") held.set("plus", null);
  if (isEarlyReader(input.joinedAt)) held.set("early_reader", input.joinedAt);
  if (input.ambassador) held.set("ambassador", null);
  return BADGE_ORDER.filter((id) => held.has(id)).map((id) => ({ id, since: held.get(id) ?? null }));
}
