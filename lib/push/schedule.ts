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
 * One reader's opt-in to a daily nudge for one campaign they joined.
 *
 * Kept in the same module as the prayer rules so both are matched by the
 * same clock, in the same hourly pass, against the same timezone. A second
 * scheduler is exactly what CONTRIBUTING's bar warns against: "five weekly
 * reminders landing on five different days is a daily habit loop assembled
 * out of parts that each looked harmless."
 */
export type CampaignReminderRow = {
  campaign_id: string;
  remind_enabled: boolean;
  remind_time: string | null;
  timezone: string | null;
};

/**
 * The campaigns due for this reader in the current local hour.
 *
 * Capped, and that cap is the point. A reader who joins twelve campaigns and
 * turns a reminder on for each would otherwise receive twelve notifications
 * in one hour, which is the multiplication the ethos forbids. One goes out;
 * the rest wait for the app to be opened, which is the pull surface the rule
 * asks for.
 */
export const MAX_CAMPAIGN_REMINDERS_PER_RUN = 1;

export function dueCampaigns(
  rows: readonly CampaignReminderRow[],
  now: Date,
): CampaignReminderRow[] {
  const due: CampaignReminderRow[] = [];
  for (const row of rows) {
    if (!row.remind_enabled || !row.remind_time) continue;
    const tz = row.timezone || "UTC";
    const hh = String(nowInTz(now, tz).getUTCHours()).padStart(2, "0");
    if (row.remind_time.slice(0, 2) !== hh) continue;
    due.push(row);
    if (due.length >= MAX_CAMPAIGN_REMINDERS_PER_RUN) break;
  }
  return due;
}

/**
 * What a campaign reminder says.
 *
 * No campaign title, no subject name, and no count. A push payload crosses
 * APNs and FCM in plaintext and is stored in a Postgres column, and
 * CONTRIBUTING is explicit that personal content stays behind the lock
 * screen: "the notification says that something is there; the content lives
 * behind the lock screen." A campaign is frequently "for my mother's
 * surgery", which is precisely the sentence that must not appear on a lock
 * screen in a shared room.
 *
 * No digits and no exclamation marks either, per the same bar.
 */
export function campaignReminderPayload(campaignId: string): {
  title: string;
  body: string;
  url: string;
} {
  return {
    title: "Your prayer campaign",
    // WAS: "Someone is waiting on your prayers today."
    //
    // Two things wrong with that sentence and only one of them was obvious.
    // It named a beneficiary, which makes not opening the app a failure
    // toward a person rather than a day on which you did not tap something.
    // And "today" is a deadline: it is the same construction as "expires
    // tonight", built out of gentler words.
    //
    // The talanton is struck and the community comes. It does not tell the
    // monk that the brotherhood is waiting on him. This says what it is and
    // stops, which is the whole permitted form.
    body: "Open it when you are ready.",
    url: `/campaigns/detail?id=${encodeURIComponent(campaignId)}`,
  };
}

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
