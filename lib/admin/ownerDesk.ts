import type { CampaignKind } from "@/lib/email/campaigns";

/**
 * The owner's desk: when his brief comes, and whether the emails Purify builds
 * from its own data send themselves.
 *
 * His word, 2026-11-12 about 21:51 UTC (docs/plans/owner-desk.md): "the email
 * that gets sent to the monthly note ... You can set that up, right?
 * Obviously, you can ask me directional questions. The board message, same
 * thing. The email is the same thing insofar as Sundays." And on the two
 * questions the plan put to him (docs/1.9-build/BRAINSTORM.md, 2026-11-13):
 *   - "and yes ok for the owners brief": the brief daily at 7:30 his time,
 *     with the weekly one on Monday, both settings he can change;
 *   - "yes auto but also we need to work on designs": the Sunday email, the
 *     monthly note and the feast shop email go out by themselves unless he
 *     holds them in that morning's brief. The board message still waits for
 *     his tap: it is words in his voice, shown in the app, and nothing written
 *     about the faith ships without a person (docs/editorial-standards.md).
 *
 * WHAT KEEPS A SEND SAFE. A piece goes out by itself only when every one of
 * these holds (autoSendDecision):
 *   1. the switch is on;
 *   2. that day's brief named it, with its Hold link, at least
 *      HOLD_WINDOW_MINUTES before the send (so a brief that went out late
 *      pushes the send back, never the other way round);
 *   3. he has not held it;
 *   4. it is still due today on the board: "Skip this one" or a "not before"
 *      day in the Calendar keeps it from going, as they keep it from the
 *      board;
 *   5. it is the send hour, and before SEND_UNTIL: a piece whose window passed
 *      waits to be sent by hand, and nothing goes in the evening.
 * The send itself is the panel's own (lib/email/campaignStart.ts): the same
 * draft, the email doctrine, the postal address, send-once per period, the
 * month's budget and the cadence rule. A day with nothing honest to send
 * sends nothing, as it always has.
 *
 * HIS TIME. Every hour here is New York's (OWNER_ZONE), the clock he lives
 * by. The hours are bounded (BRIEF_HOURS, SEND_HOURS) so that his day and the
 * UTC day the board and the drafts count in are the same date whenever
 * either runs: in New York that is true from midnight to 19:00 in winter.
 *
 * Pure: settings in, decisions out. Stored in site_settings by
 * lib/admin/ownerDeskStore.ts; tested in lib/admin/__tests__/ownerDesk.test.ts.
 */

/** His clock. Not a setting: the hours below are bounded for this zone. */
export const OWNER_ZONE = "America/New_York";

export type DeskSettings = {
  /** The Sunday email, the monthly note and the feast shop email go out by themselves unless held. */
  autoSend: boolean;
  /** "HH:MM", his time: when a piece the brief named goes out. */
  sendAt: string;
  /** "HH:MM", his time: when the brief comes. */
  briefAt: string;
  /** 0 Sunday to 6 Saturday: the day the brief is the weekly one. */
  weeklyDay: number;
};

/**
 * What applies until he changes it. `autoSend` is on by his word of
 * 2026-11-13 ("yes auto"). The sends wait an hour or more after the brief by
 * default, so a morning brief read over coffee still leaves time to hold.
 */
export const DESK_DEFAULTS: DeskSettings = {
  autoSend: true,
  sendAt: "12:00",
  briefAt: "07:30",
  weeklyDay: 1,
};

/** The least time between the brief that named a piece and the piece going out. */
export const HOLD_WINDOW_MINUTES = 120;

/** The brief's hour may be set between these, his time ("HH:MM", inclusive). */
export const BRIEF_HOURS: readonly [string, string] = ["05:00", "11:00"];

/** The sends' hour may be set between these, his time ("HH:MM", inclusive). */
export const SEND_HOURS: readonly [string, string] = ["09:00", "17:00"];

/**
 * After this, his time, neither the brief nor a send goes for that day: the
 * day is over for email, and his day and the UTC day stay one date.
 */
export const SEND_UNTIL = "18:00";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** "07:30" to 450 minutes after midnight; null for anything that is not a time. */
export function parseClock(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** 450 to "07:30". */
export function clockOf(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "07:30" to "7:30 AM", "12:00" to "12 noon". */
export function clockLabel(hhmm: string): string {
  const minutes = parseClock(hhmm);
  if (minutes === null) return hhmm;
  if (minutes === 720) return "12 noon";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`} ${h < 12 ? "AM" : "PM"}`;
}

function within(hhmm: string, [lo, hi]: readonly [string, string]): boolean {
  const v = parseClock(hhmm);
  return v !== null && v >= (parseClock(lo) as number) && v <= (parseClock(hi) as number);
}

/** A stored value read as settings: anything missing or wrong takes the default. */
export function readDeskSettings(value: unknown): DeskSettings {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const s: DeskSettings = {
    autoSend: typeof v.autoSend === "boolean" ? v.autoSend : DESK_DEFAULTS.autoSend,
    sendAt: typeof v.sendAt === "string" && within(v.sendAt, SEND_HOURS) ? v.sendAt : DESK_DEFAULTS.sendAt,
    briefAt: typeof v.briefAt === "string" && within(v.briefAt, BRIEF_HOURS) ? v.briefAt : DESK_DEFAULTS.briefAt,
    weeklyDay:
      typeof v.weeklyDay === "number" && Number.isInteger(v.weeklyDay) && v.weeklyDay >= 0 && v.weeklyDay <= 6
        ? v.weeklyDay
        : DESK_DEFAULTS.weeklyDay,
  };
  // A pair that breaks the hold window (each half valid alone) keeps the brief and pushes the send.
  if (deskSettingsProblem(s)) {
    s.sendAt = clockOf(Math.max((parseClock(s.briefAt) as number) + HOLD_WINDOW_MINUTES, parseClock(SEND_HOURS[0]) as number));
  }
  return s;
}

/** Why settings cannot be saved, in his words, or null when they can. */
export function deskSettingsProblem(s: DeskSettings): string | null {
  if (!within(s.briefAt, BRIEF_HOURS)) {
    return `The brief comes between ${clockLabel(BRIEF_HOURS[0])} and ${clockLabel(BRIEF_HOURS[1])}, New York time.`;
  }
  if (!within(s.sendAt, SEND_HOURS)) {
    return `The sends go between ${clockLabel(SEND_HOURS[0])} and ${clockLabel(SEND_HOURS[1])}, New York time.`;
  }
  if ((parseClock(s.sendAt) as number) - (parseClock(s.briefAt) as number) < HOLD_WINDOW_MINUTES) {
    return `The sends go at least ${HOLD_WINDOW_MINUTES / 60} hours after the brief, so there is time to hold one.`;
  }
  if (!Number.isInteger(s.weeklyDay) || s.weeklyDay < 0 || s.weeklyDay > 6) return "Choose a day of the week.";
  return null;
}

/** Where his clock stands: the date, the minutes since his midnight, and the day of the week (0 Sunday). */
export type LocalClock = { day: string; minutes: number; weekday: number };

export function localClock(now: Date, zone: string = OWNER_ZONE): LocalClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
    weekday: weekday < 0 ? 0 : weekday,
  };
}

/** Whether, at `now`, the day's brief should go (from its hour until SEND_UNTIL). */
export function briefWindowOpen(now: Date, s: DeskSettings): boolean {
  const { minutes } = localClock(now);
  return minutes >= (parseClock(s.briefAt) as number) && minutes < (parseClock(SEND_UNTIL) as number);
}

/** Whether today's brief is the weekly one. */
export function isWeeklyBrief(now: Date, s: DeskSettings): boolean {
  return localClock(now).weekday === s.weeklyDay;
}

/**
 * The emails that can send themselves, by the board's rule family
 * (lib/admin/planner.ts), with the campaign each one is. The board message is
 * not here and never will be: it waits for his tap.
 */
export const AUTO_PIECES: Readonly<Record<string, { kind: Extract<CampaignKind, "weekly" | "monthly" | "shop_feast">; name: string }>> = {
  "email-weekly": { kind: "weekly", name: "The Sunday email" },
  "email-monthly": { kind: "monthly", name: "The monthly note" },
  "shop-feast": { kind: "shop_feast", name: "The feast shop email" },
};

/** The family of a board rule key: "email-weekly" for "email-weekly:2026-W46". */
const familyOf = (ruleKey: string) => ruleKey.split(":")[0];

export function isAutoPiece(ruleKey: string | null): boolean {
  return ruleKey !== null && familyOf(ruleKey) in AUTO_PIECES;
}

/** A hold he put on one piece, by its board rule key. */
export type Holds = Record<string, { at: string; by: string | null }>;

export function readHolds(value: unknown): Holds {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>).holds : null;
  if (!v || typeof v !== "object") return {};
  const out: Holds = {};
  for (const [key, h] of Object.entries(v as Record<string, unknown>)) {
    if (!isAutoPiece(key) || !h || typeof h !== "object") continue;
    const at = (h as Record<string, unknown>).at;
    const by = (h as Record<string, unknown>).by;
    if (typeof at !== "string") continue;
    out[key] = { at, by: typeof by === "string" ? by : null };
  }
  return out;
}

/** Holds older than this are dropped when the holds are next written: their day has long passed. */
export const HOLD_KEEP_DAYS = 120;

export function withHold(holds: Holds, ruleKey: string, by: string | null, now: Date): Holds {
  return { ...pruneHolds(holds, now), [ruleKey]: { at: now.toISOString(), by } };
}

export function withoutHold(holds: Holds, ruleKey: string, now: Date): Holds {
  const next = pruneHolds(holds, now);
  delete next[ruleKey];
  return next;
}

function pruneHolds(holds: Holds, now: Date): Holds {
  const cut = now.getTime() - HOLD_KEEP_DAYS * 86_400_000;
  return Object.fromEntries(Object.entries(holds).filter(([, h]) => Date.parse(h.at) >= cut));
}

/** One piece a brief named as going out by itself. */
export type AnnouncedPiece = { ruleKey: string; kind: CampaignKind; periodKey: string };

/** What the day's brief named, and when it went: written only after the brief was sent. */
export type Announcement = { day: string; at: string; pieces: AnnouncedPiece[] };

export function readAnnouncement(value: unknown): Announcement | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.day !== "string" || typeof v.at !== "string" || Number.isNaN(Date.parse(v.at)) || !Array.isArray(v.pieces)) {
    return null;
  }
  const pieces: AnnouncedPiece[] = [];
  for (const p of v.pieces) {
    if (!p || typeof p !== "object") continue;
    const { ruleKey, kind, periodKey } = p as Record<string, unknown>;
    if (typeof ruleKey !== "string" || !isAutoPiece(ruleKey) || typeof periodKey !== "string") continue;
    const expected = AUTO_PIECES[familyOf(ruleKey)].kind;
    if (kind !== expected) continue;
    pieces.push({ ruleKey, kind: expected, periodKey });
  }
  return { day: v.day, at: v.at, pieces };
}

/**
 * When a piece named at `briefAt` goes out today, his time: the sends' hour,
 * or HOLD_WINDOW_MINUTES after the brief if that is later. Null when that is
 * past SEND_UNTIL, and then it waits to be sent by hand.
 */
export function sendTimeAfter(briefAt: Date, s: DeskSettings): number | null {
  const named = localClock(briefAt).minutes;
  const at = Math.max(parseClock(s.sendAt) as number, named + HOLD_WINDOW_MINUTES);
  return at < (parseClock(SEND_UNTIL) as number) ? at : null;
}

export type AutoDecision =
  | { go: true }
  | { go: false; why: "off" | "not named" | "held" | "not due" | "too early" | "window passed" };

/**
 * Whether one piece goes out by itself now. `dueToday` is whether the board
 * still has it open and due on his today (a skip, a "not before" day or the
 * work already done takes it off). Every reason it does not go is named, for
 * the panel and the heartbeat's report.
 */
export function autoSendDecision(opts: {
  now: Date;
  settings: DeskSettings;
  announcement: Announcement | null;
  holds: Holds;
  ruleKey: string;
  dueToday: boolean;
}): AutoDecision {
  const { now, settings, announcement, holds, ruleKey } = opts;
  if (!settings.autoSend) return { go: false, why: "off" };
  const clock = localClock(now);
  const named = announcement && announcement.day === clock.day && announcement.pieces.some((p) => p.ruleKey === ruleKey);
  if (!named || !announcement) return { go: false, why: "not named" };
  if (holds[ruleKey]) return { go: false, why: "held" };
  if (!opts.dueToday) return { go: false, why: "not due" };
  const at = sendTimeAfter(new Date(announcement.at), settings);
  if (at === null || clock.minutes >= (parseClock(SEND_UNTIL) as number)) return { go: false, why: "window passed" };
  if (clock.minutes < at) return { go: false, why: "too early" };
  // The hold window is real time, not only his clock: a brief named at 11:59 is not sendable at 12:00.
  if (now.getTime() - Date.parse(announcement.at) < HOLD_WINDOW_MINUTES * 60_000) return { go: false, why: "too early" };
  return { go: true };
}
