/**
 * Read together (1.8, the owner's yes of 2026-10-24): a circle of readers (a
 * parish, a household, friends) follows a reading path. Each member sees who
 * in the circle has read each day's part, and each day has its own
 * conversation. One group system, not two: a circle is a row of
 * prayer_campaign_groups that follows a path (docs/1.8-build/sql/
 * read-together.sql), so 1.9's prayer campaigns reuse the same circles, their
 * members, invite codes and private threads.
 *
 * A reading path is reading, not prayer, so a circle may show who has read a
 * day (CONTRIBUTING's bar for reading); it never ranks or counts anyone.
 */

/**
 * On since 2026-10-26, when the owner ran docs/1.8-build/sql/read-together.sql.
 * Off, every circle route answers 404 and the path page shows no circles, so
 * nothing asks for columns production does not have.
 */
const SQL_RUN = true;

export function circlesEnabled(): boolean {
  return SQL_RUN;
}

export const CIRCLE_KINDS = ["parish", "household", "friends"] as const;
export type CircleKind = (typeof CIRCLE_KINDS)[number];

export const CIRCLE_NAME_MIN = 2;
export const CIRCLE_NAME_MAX = 60;
/** The longest path a circle can follow, as the table's check holds it. */
export const CIRCLE_MAX_DAY = 60;

/** A circle as one of its members sees it on a path's page. */
export type Circle = {
  id: string;
  name: string;
  kind: CircleKind;
  inviteCode: string;
  /** The members' names, the reader's own marked. */
  members: { name: string; you: boolean }[];
  /** For each day of the path (1-based), the names of the members who have read it. */
  read: Record<number, string[]>;
};

/** Who read which day, from the table's rows and the circle's members. Pure. */
export function readByDay(
  rows: readonly { user_id: string; day: number }[],
  members: readonly { user_id: string; member_name: string }[],
): Record<number, string[]> {
  const nameOf = new Map(members.map((m) => [m.user_id, m.member_name]));
  const out: Record<number, string[]> = {};
  for (const r of [...rows].sort((a, b) => a.day - b.day)) {
    const name = nameOf.get(r.user_id);
    // A reader who has left the circle is no longer named in it.
    if (!name) continue;
    (out[r.day] ??= []).push(name);
  }
  for (const day of Object.keys(out)) out[Number(day)].sort((a, b) => a.localeCompare(b));
  return out;
}
