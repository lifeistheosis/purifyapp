import type { CalStyle } from "@/lib/calendar/orthodox";

import { RETENTION_PRIORITY, type RetentionKind } from "./kinds";
import { fastOn, type FastDay, type FastId } from "./fasts";

/**
 * Which retention email is due to whom, decided from rows alone. Pure, so
 * every rule is a test (lib/email/retention/__tests__/plan.test.ts).
 *
 * WINDOWS, NOT EXACT DAYS, as in lib/email/lifecyclePlan.ts: each email is due
 * for a span of days, so a job that misses a day still sends it, and the
 * dedupe key stops a second copy.
 *
 * NOTHING HONEST TO SAY MEANS NO SEND. A step the account shows is done is
 * not sent. A reader with no line of their own gets no "where you left off".
 * Outside a fast the companion is silent. And no email here claims what the
 * account cannot show: a step that cannot be known is sent in words that
 * never say it was not done (letters.ts).
 *
 * THE KEYS. A reader's key ends with their id where its mailing is shared
 * (lib/email/mailings.ts), so the admin groups them: first_week:morning:<id>,
 * fasting_companion:nativity-2026:week-2:<id>. "Where you left off" ends
 * with the day it was sent instead, so the key never holds the day a reader
 * went quiet. The first sends to the owner carry "owner" after the kind, so
 * they can be told from readers' and kept out of the brief's figures.
 */

const DAY = 86_400_000;

const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

// ── The first-week guide ─────────────────────────────────────────────────

export type FirstWeekStep = "morning" | "calendar" | "verse";

/**
 * Days 1, 3 and 7 after the account was made, each until the next begins:
 * the morning prayers from the first full day, the calendar from the third,
 * a verse kept from the seventh, the last until day ten. One step at a time,
 * so the guide is at most three emails in ten days.
 */
export const FIRST_WEEK: readonly { step: FirstWeekStep; from: number; until: number }[] = [
  { step: "morning", from: 1, until: 3 },
  { step: "calendar", from: 3, until: 7 },
  { step: "verse", from: 7, until: 10 },
];

export type FirstWeekReader = {
  userId: string;
  /** profiles.joined_at: when the account was made. */
  joinedAt: string | null;
  /** True where the account shows the step is done. Absent is not "not done": it is not known. */
  done: Partial<Record<FirstWeekStep, boolean>>;
};

export type PlannedFirstWeek = { kind: "first_week"; userId: string; step: FirstWeekStep; dedupeKey: string; owner: boolean };

export function planFirstWeek(readers: readonly FirstWeekReader[], now: Date): PlannedFirstWeek[] {
  const out: PlannedFirstWeek[] = [];
  for (const r of readers) {
    const made = r.joinedAt ? Date.parse(r.joinedAt) : NaN;
    if (!Number.isFinite(made)) continue;
    const age = (now.getTime() - made) / DAY;
    const due = FIRST_WEEK.find((s) => age >= s.from && age < s.until);
    if (!due || r.done[due.step] === true) continue;
    out.push({ kind: "first_week", userId: r.userId, step: due.step, dedupeKey: `first_week:${due.step}:${r.userId}`, owner: false });
  }
  return out;
}

/**
 * The owner's first look at the guide: the next step he has not had, one a
 * run, whatever his account's age (his is years old) and whatever it shows
 * done. The words claim nothing either way, so they are as true for him.
 */
export function planFirstWeekForOwner(owners: readonly { userId: string; sent: ReadonlySet<FirstWeekStep> }[]): PlannedFirstWeek[] {
  const out: PlannedFirstWeek[] = [];
  for (const o of owners) {
    const next = FIRST_WEEK.find((s) => !o.sent.has(s.step));
    if (next) out.push({ kind: "first_week", userId: o.userId, step: next.step, dedupeKey: `first_week:owner:${next.step}:${o.userId}`, owner: true });
  }
  return out;
}

// ── Where you left off ───────────────────────────────────────────────────

export type PickUpStep = 14 | 30;

/** After 14 quiet days, then after 30, each for a week. */
export const PICK_UP: readonly { step: PickUpStep; from: number; until: number }[] = [
  { step: 14, from: 14, until: 21 },
  { step: 30, from: 30, until: 37 },
];

/** How far back a reader's activity is read: past this no email is due, so nothing older is needed. */
export const PICK_UP_LOOKBACK_DAYS = 37;

/**
 * One line of the reader's own, from what their account keeps: where they
 * were in the Bible or in a work of the Fathers, or their patron saint's
 * feast in the coming week. `at` is when the place was kept.
 */
export type PersonalLine =
  | { kind: "bible"; book: string; bookName: string; chapter: number; verse: number; at: number }
  | { kind: "work"; saintSlug: string; saintName: string; workSlug: string; workTitle: string; sectionN: number; paragraph: number; at: number }
  | { kind: "patron"; saintSlug: string; saintName: string; on: string };

export type PickUpReader = {
  userId: string;
  /** The last time the account kept anything, or was made, inside the lookback; null when nothing was. */
  lastActiveAt: number | null;
  lines: readonly PersonalLine[];
  /** The steps already sent to this reader since lastActiveAt. */
  sentSince: ReadonlySet<PickUpStep>;
};

export type PlannedPickUp = { kind: "pick_up"; userId: string; step: PickUpStep; line: PersonalLine; dedupeKey: string; owner: boolean };

/**
 * The reader's one line: the place they kept last, Bible or work; failing
 * that, their patron saint's feast within the coming seven days. Null when
 * there is none, and then nothing is sent.
 */
export function chooseLine(lines: readonly PersonalLine[], now: Date): PersonalLine | null {
  const places = lines.filter((l): l is Extract<PersonalLine, { kind: "bible" | "work" }> => l.kind !== "patron");
  if (places.length > 0) return [...places].sort((a, b) => b.at - a.at)[0];
  const today = Date.parse(isoDay(now.getTime()));
  const patron = lines.find((l): l is Extract<PersonalLine, { kind: "patron" }> => {
    if (l.kind !== "patron") return false;
    const ahead = (Date.parse(l.on) - today) / DAY;
    return ahead >= 1 && ahead <= 7;
  });
  return patron ?? null;
}

export function planPickUp(readers: readonly PickUpReader[], now: Date): PlannedPickUp[] {
  const out: PlannedPickUp[] = [];
  for (const r of readers) {
    if (r.lastActiveAt === null) continue;
    const quiet = (now.getTime() - r.lastActiveAt) / DAY;
    const due = PICK_UP.find((s) => quiet >= s.from && quiet < s.until);
    if (!due || r.sentSince.has(due.step)) continue;
    const line = chooseLine(r.lines, now);
    if (!line) continue;
    out.push({
      kind: "pick_up",
      userId: r.userId,
      step: due.step,
      line,
      dedupeKey: `pick_up:${due.step}:${r.userId}:${isoDay(now.getTime())}`,
      owner: false,
    });
  }
  return out;
}

/**
 * The owner's first look: once, with a line from his own account, however
 * recently he read. With no line of his own, nothing, as for a reader.
 */
export function planPickUpForOwner(
  owners: readonly { userId: string; lines: readonly PersonalLine[]; sent: boolean }[],
  now: Date,
): PlannedPickUp[] {
  const out: PlannedPickUp[] = [];
  for (const o of owners) {
    if (o.sent) continue;
    const line = chooseLine(o.lines, now);
    if (line) out.push({ kind: "pick_up", userId: o.userId, step: 14, line, dedupeKey: `pick_up:owner:14:${o.userId}`, owner: true });
  }
  return out;
}

// ── The fasting companion ────────────────────────────────────────────────

/** "open", or a week of the fast from 1 (its second week). */
export type FastingPiece = "open" | number;

export const pieceName = (piece: FastingPiece) => (piece === "open" ? "open" : `week-${piece}`);

export type FastingReader = {
  userId: string;
  style: CalStyle;
  /** What this reader already had, by "<fast key>:<piece>" (nativity-2026:open), with when. */
  sent: ReadonlyMap<string, number>;
};

export type PlannedFasting = {
  kind: "fasting_companion";
  userId: string;
  style: CalStyle;
  fast: FastDay;
  piece: FastingPiece;
  dedupeKey: string;
  owner: boolean;
};

/**
 * The opening note on the first run of the fast this reader is on its list
 * (its first day, or the day they turned it on), then one each week from the
 * fast's second, on the first run of that week. A reader whose opening came
 * in a week is not sent that week's note too: the opening carried it.
 */
export function planFasting(
  readers: readonly FastingReader[],
  now: Date,
  fastsOn: readonly FastId[],
  opts: { owner?: boolean } = {},
): PlannedFasting[] {
  const out: PlannedFasting[] = [];
  const marker = opts.owner ? "owner:" : "";
  for (const r of readers) {
    const fast = fastOn(now, r.style);
    if (!fast || !fastsOn.includes(fast.id)) continue;
    const opened = r.sent.get(`${fast.key}:open`);
    let piece: FastingPiece | null = null;
    if (opened === undefined) piece = "open";
    else if (fast.week >= 1 && !r.sent.has(`${fast.key}:${pieceName(fast.week)}`)) {
      const weekBegan = (fast.first + fast.week * 7) * DAY;
      if (opened < weekBegan) piece = fast.week;
    }
    if (piece === null) continue;
    out.push({
      kind: "fasting_companion",
      userId: r.userId,
      style: r.style,
      fast,
      piece,
      dedupeKey: `fasting_companion:${marker}${fast.key}:${pieceName(piece)}:${r.userId}`,
      owner: Boolean(opts.owner),
    });
  }
  return out;
}

// ── Together ─────────────────────────────────────────────────────────────

export type PlannedRetention = PlannedFirstWeek | PlannedPickUp | PlannedFasting;

/** One email per reader per run at most: the first in RETENTION_PRIORITY that is due. */
export function oneEach(planned: readonly PlannedRetention[]): PlannedRetention[] {
  const rank = (k: RetentionKind) => RETENTION_PRIORITY.indexOf(k);
  const best = new Map<string, PlannedRetention>();
  for (const p of planned) {
    const held = best.get(p.userId);
    if (!held || rank(p.kind) < rank(held.kind)) best.set(p.userId, p);
  }
  return planned.filter((p) => best.get(p.userId) === p);
}

// ── Reading the send log back ────────────────────────────────────────────

export type ParsedKey =
  | { kind: "first_week"; owner: boolean; step: FirstWeekStep; userId: string }
  | { kind: "pick_up"; owner: boolean; step: PickUpStep; userId: string }
  | { kind: "fasting_companion"; owner: boolean; fastKey: string; piece: string; userId: string };

/** A retention dedupe key read back into its parts, or null for any other key. Pure. */
export function parseRetentionKey(key: string): ParsedKey | null {
  const parts = key.split(":");
  const [kind] = parts;
  const owner = parts[1] === "owner";
  const rest = owner ? parts.slice(2) : parts.slice(1);
  if (kind === "first_week" && rest.length === 2 && (rest[0] === "morning" || rest[0] === "calendar" || rest[0] === "verse")) {
    return { kind, owner, step: rest[0], userId: rest[1] };
  }
  if (kind === "pick_up" && (rest[0] === "14" || rest[0] === "30")) {
    const step: PickUpStep = rest[0] === "14" ? 14 : 30;
    if (owner && rest.length === 2) return { kind, owner, step, userId: rest[1] };
    if (!owner && rest.length === 3) return { kind, owner, step, userId: rest[1] };
    return null;
  }
  if (kind === "fasting_companion" && rest.length === 3 && /^[a-z_]+-\d{4}$/.test(rest[0]) && /^(open|week-\d+)$/.test(rest[1])) {
    return { kind, owner, fastKey: rest[0], piece: rest[1], userId: rest[2] };
  }
  return null;
}
