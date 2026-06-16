// Shared reminder-scheduling logic for the delivery cron. Pure functions so
// they can be unit-tested and reused across the Web Push (push_subscriptions)
// and native (device_push_tokens) tables.

export type ReminderKind = "morning" | "evening";

export type ScheduleRow = {
  morning_time: string | null;
  evening_time: string | null;
  timezone: string | null;
};

/**
 * Whether the row is due right now, and for which rule. The cron runs hourly,
 * so we match on the local HOUR (a user's ":15" fires within that hour).
 * Returns null when neither time matches the user's current local hour.
 */
export function dueKind(row: ScheduleRow, now: Date): ReminderKind | null {
  const tz = row.timezone || "UTC";
  // nowInTz encodes the target zone's wall clock into the Date's UTC fields,
  // so read it with getUTCHours() — correct regardless of the server's own
  // timezone (production runs UTC, but this stays right anywhere).
  const hh = String(nowInTz(now, tz).getUTCHours()).padStart(2, "0");
  if (row.morning_time && row.morning_time.slice(0, 2) === hh) return "morning";
  if (row.evening_time && row.evening_time.slice(0, 2) === hh) return "evening";
  return null;
}

/** The notification content for a given rule (shared by every transport). */
export function reminderPayload(kind: ReminderKind): {
  title: string;
  body: string;
  url: string;
} {
  return kind === "morning"
    ? {
        title: "Morning prayer",
        body: "Open the morning rule when you rise.",
        url: "/prayers/morning",
      }
    : {
        title: "Evening prayer",
        body: "Open the evening rule when you lie down.",
        url: "/prayers/evening",
      };
}

/** A clock reading the wall time in an IANA timezone. */
export function nowInTz(date: Date, tz: string): Date {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value]),
    );
    return new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        // "24" at midnight in some locales → normalize to 0.
        Number(parts.hour) % 24,
        Number(parts.minute),
      ),
    );
  } catch {
    return date;
  }
}
