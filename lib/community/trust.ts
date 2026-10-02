// How far Community trusts a reader, and what that lets them do.
//
// A new account starts limited: fewer posts an hour, links held for a
// moderator, a smaller @mention budget. The limits lift on their own once the
// account has been around a day, and lift further for a reader who has been
// here a month and written a few things without any of it being removed.
// Removals pull an account back down for a while. The team and moderators
// are not limited at all.
//
// Pure: the routes read the facts (lib/community/trustServer.ts) and this
// decides, so the rule is tested rather than asserted.

export type TrustLevel = "new" | "restricted" | "member" | "trusted" | "staff";

export type TrustFacts = {
  /** How long ago the account was made, in ms. */
  accountAgeMs: number;
  /** Visible posts and replies. */
  contributions: number;
  /** Posts and replies a moderator removed, written in the last 30 and 90 days. */
  removals30d: number;
  removals90d: number;
  /** On the team, a moderator, or an admin. */
  staff: boolean;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** An account this young is new, whatever else is true of it. */
export const NEW_ACCOUNT_MS = DAY;
/** A month, ten contributions and nothing removed in ninety days: trusted. */
export const TRUSTED_AGE_MS = 30 * DAY;
export const TRUSTED_CONTRIBUTIONS = 10;
/** Two removals in thirty days put an account back on new-account limits. */
export const RESTRICTED_REMOVALS = 2;

export function trustLevel(f: TrustFacts): TrustLevel {
  if (f.staff) return "staff";
  if (f.removals30d >= RESTRICTED_REMOVALS) return "restricted";
  if (f.accountAgeMs < NEW_ACCOUNT_MS) return "new";
  if (f.accountAgeMs >= TRUSTED_AGE_MS && f.contributions >= TRUSTED_CONTRIBUTIONS && f.removals90d === 0) {
    return "trusted";
  }
  return "member";
}

export type TrustLimits = {
  postsPerHour: number;
  repliesPerHour: number;
  /** Links in one post or reply; more is refused. */
  maxLinks: number;
  /** Any link waits for a moderator. */
  linksHeld: boolean;
  /** Distinct @mentions in one post or reply; more is refused. */
  maxMentions: number;
};

export const TRUST_LIMITS: Readonly<Record<TrustLevel, TrustLimits>> = {
  new: { postsPerHour: 3, repliesPerHour: 10, maxLinks: 2, linksHeld: true, maxMentions: 3 },
  restricted: { postsPerHour: 3, repliesPerHour: 10, maxLinks: 2, linksHeld: true, maxMentions: 3 },
  member: { postsPerHour: 10, repliesPerHour: 40, maxLinks: 3, linksHeld: false, maxMentions: 5 },
  trusted: { postsPerHour: 20, repliesPerHour: 60, maxLinks: 5, linksHeld: false, maxMentions: 8 },
  staff: { postsPerHour: 60, repliesPerHour: 200, maxLinks: 20, linksHeld: false, maxMentions: 20 },
};

/**
 * How much one reader's report counts toward hiding a post on its own.
 *
 * By account age only, which is one read per reporter: a brand new account
 * counts half, so a handful of accounts made for the purpose cannot hide a
 * post by themselves, and a moderator's report hides it at once.
 */
export function reportWeight(accountAgeMs: number, staff: boolean): number {
  if (staff) return AUTO_HIDE_WEIGHT;
  return accountAgeMs < NEW_ACCOUNT_MS ? 0.5 : 1;
}

/** Reports adding up to this hide a post or reply until a moderator looks. */
export const AUTO_HIDE_WEIGHT = 3;
