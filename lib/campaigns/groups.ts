// Parish groups inside a campaign: the pure core.
//
// A group is a small, unlisted room inside a large campaign. A reader joins
// the global campaign the same way they always did, and may additionally
// belong to one group, which is their parish, household, or a few friends.
// The group shows who is praying alongside them and what the group has
// offered together.
//
// What a group is NOT: a leaderboard. There is no ranking, no per-member
// day count on the roster, and no ordering by output. The ethos names
// pressure mechanics directly, and ranking parishioners by how often they
// prayed is the clearest possible version of one. `GroupMember` carries no
// score field at all, so the UI cannot render one by accident, and adding
// one later would be a visible schema change rather than a quiet map().

/** A group as any member sees it. */
export type CampaignGroup = {
  id: string;
  campaign_id: string;
  name: string;
  /** Only returned to members. Absent in any list a non-member can reach. */
  invite_code?: string;
  member_count: number;
  prayer_count: number;
  created_at: string;
};

/**
 * A member of a group.
 *
 * Deliberately no `prayer_days`, no `streak`, no rank. See the note above.
 */
export type GroupMember = {
  user_id: string;
  member_name: string;
  joined_at: string;
};

export const GROUP_NAME_MIN = 2;
export const GROUP_NAME_MAX = 60;

/** Characters an invite code is drawn from. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const INVITE_CODE_LENGTH = 6;

/**
 * Whether a string is a well-formed invite code.
 *
 * Matches the database check constraint exactly, so a code that passes here
 * cannot be rejected by the insert and vice versa.
 */
export function isInviteCode(value: string): boolean {
  return /^[A-Z0-9]{6}$/.test(value);
}

/**
 * Normalise what a reader typed into what the column stores.
 *
 * People type invite codes off a printed pew sheet or a text message, so
 * they arrive lowercase, with spaces, or with the dash someone added to make
 * it readable. Accepting those is free; making the reader retype is not.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

/**
 * A new invite code.
 *
 * `randomInt` is injected so the caller supplies the entropy source and this
 * module stays pure and testable. The alphabet omits I, L, O, 0 and 1: a
 * code is read aloud after Liturgy and written down by hand, and those are
 * the pairs people get wrong.
 */
export function makeInviteCode(
  randomInt: (maxExclusive: number) => number,
): string {
  let out = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const idx = randomInt(ALPHABET.length);
    out += ALPHABET[Math.min(ALPHABET.length - 1, Math.max(0, idx))];
  }
  return out;
}

/** Whether a proposed group name is acceptable. Mirrors the check constraint. */
export function isValidGroupName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length >= GROUP_NAME_MIN && trimmed.length <= GROUP_NAME_MAX
  );
}

/**
 * The roster, in join order.
 *
 * Oldest first, so the list reads as a history of who arrived rather than a
 * table anyone is tempted to sort. Ties break on name so the order is
 * stable across refetches.
 */
export function sortMembers(members: readonly GroupMember[]): GroupMember[] {
  return [...members].sort((a, b) => {
    const at = Date.parse(a.joined_at);
    const bt = Date.parse(b.joined_at);
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return at - bt;
    return a.member_name.localeCompare(b.member_name);
  });
}
