// A reader's two prayer reminder times, and how one of them changes.
//
// Shared by the browser (./client.ts), the phone apps (./native.ts), the
// account screen (components/profile/PushOptIn.tsx) and the route that saves
// a browser (app/api/push/subscribe/route.ts), so nothing here needs a
// browser or a server.
//
// Where the times live. A browser's are in its push_subscriptions row and
// nowhere else once saved; until then the browser keeps them with its
// subscription (purify:push.pending, ./client.ts). A phone keeps its own
// copy (purify:push.native-times, ./native.ts) and sends it with its token
// at every launch, so on a phone that copy is the one that counts.

export const MORNING_DEFAULT = "07:00";
export const EVENING_DEFAULT = "21:00";

/** "HH:MM" on the reader's own clock, as a time field gives it. */
export type ReminderTimes = { morning: string; evening: string };

/** What a save carries: the time or times the reader set, and no other. */
export type ReminderChange = Partial<ReminderTimes>;

/**
 * Where a change went. "saved": the server has it. "kept": this device holds
 * it and sends it on by itself (after a sign-in, on the next visit, at the
 * next launch). "failed": there was nothing to save it for.
 */
export type SaveResult = "saved" | "kept" | "failed";

const DEFAULTS: ReminderTimes = { morning: MORNING_DEFAULT, evening: EVENING_DEFAULT };
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The step a reminder keeps to, in minutes: the server sends the reminders
 * of one ten-minute step each time it runs (lib/push/schedule.ts,
 * STEP_MINUTES, which must stay the same number). The time field offers the
 * same step, and a time chosen inside one is shown and saved as the step's
 * start, so the field says when the reminder comes.
 */
export const TIME_STEP_MINUTES = 10;

/** A time down to its ten-minute step ("07:45" is "07:40"), or null for one that is not a time. */
export function stepTime(value: unknown): string | null {
  if (!isReminderTime(value)) return null;
  const minute = Math.floor(Number(value.slice(3, 5)) / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  return `${value.slice(0, 2)}:${String(minute).padStart(2, "0")}`;
}

export function isReminderTime(value: unknown): value is string {
  return typeof value === "string" && HH_MM.test(value);
}

/** Only the real times in a stored or received value, so a broken one is never passed on. */
export function reminderChange(value: unknown): ReminderChange {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    ...(isReminderTime(v.morning) ? { morning: v.morning } : {}),
    ...(isReminderTime(v.evening) ? { evening: v.evening } : {}),
  };
}

/**
 * The times a screen shows: for each of the two, the first real time in
 * `layers` (newest first), else its default. Taken one by one, so a device
 * still waiting to send only its evening shows the saved morning beside it.
 */
export function shownTimes(...layers: (ReminderChange | null | undefined)[]): ReminderTimes {
  const pick = (k: keyof ReminderTimes) => layers.map((l) => l?.[k]).find(isReminderTime) ?? DEFAULTS[k];
  return { morning: pick("morning"), evening: pick("evening") };
}

/**
 * What leaving one time field saves: that time down to its ten-minute step,
 * and not the other, and only when its step differs from the saved time's
 * (a time saved before the step, 06:15, is shown as 06:10 and is left alone
 * when the field is). Null: nothing to save.
 *
 * The screen used to save both fields whenever either was left, the other
 * as it was shown. It showed 07:00 and 21:00 after every reload, so moving
 * the evening put the morning back to 07:00.
 */
export function timeChange(
  saved: ReminderTimes,
  which: keyof ReminderTimes,
  value: string,
): ReminderChange | null {
  const stepped = stepTime(value);
  if (!stepped || stepped === stepTime(saved[which])) return null;
  return which === "morning" ? { morning: stepped } : { evening: stepped };
}
