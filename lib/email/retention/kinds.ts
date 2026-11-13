/**
 * The three retention emails, by name. Pure and import-free.
 *
 * The owner's word, 2026-11-13 ("perfect let's build and I say yes or no to
 * the design. you must justify your designs"), on the arbiter's three:
 *
 *   first_week         the first-week guide, on days 1, 3 and 7 after an
 *                      account is made: the morning prayers, the calendar,
 *                      a verse kept. Each only if that step is not already
 *                      done as far as the account shows.
 *   pick_up            "pick up where you left off": after 14, then 30, days
 *                      in which the account kept nothing, one personal line
 *                      from what it keeps. Never a generic "we miss you".
 *   fasting_companion  an opening note as a fast begins, then one each week
 *                      of it, in the calendar's own words. The Nativity Fast
 *                      first, then Great Lent and the rest.
 *
 * Each is its own list, with its own column in email_preferences
 * (supabase/migrations/20261113052927_retention_lists.sql), its own
 * unsubscribe link and its own one-click header. The kind, the list and the
 * column share one name, as every list before them does.
 *
 * NOT IN lib/email/lists.ts, ON PURPOSE. That file is read by the
 * unsubscribe page (components/email/UnsubscribeClient.tsx), which the apps
 * carry, and 1.9's store builds are being checked as they stand: a name added
 * there would change what the apps ship. So these lists are known to the
 * server alone for now. Until the page knows them by name, a reader who
 * presses Unsubscribe in one of these emails is offered "every optional
 * Purify email", and the mail client's own one-click button (the header)
 * stops just the one list. No reader can be on these lists before the page
 * knows them: switches.ts holds a list at "owner" until it does.
 */

export const RETENTION_KINDS = ["first_week", "pick_up", "fasting_companion"] as const;

export type RetentionKind = (typeof RETENTION_KINDS)[number];

export function isRetentionKind(x: unknown): x is RetentionKind {
  return typeof x === "string" && (RETENTION_KINDS as readonly string[]).includes(x);
}

/** What each list is called where a reader meets it: the footer says it, and the unsubscribe page will. */
export const RETENTION_LABEL: Record<RetentionKind, string> = {
  first_week: "Your first week",
  pick_up: "Where you left off",
  fasting_companion: "The fasting companion",
};

/**
 * ALL THREE START OFF. A reader is on one of these lists only when their
 * column says true: no row, or null, is off (preferences.ts reads nothing
 * else). That is what the privacy page says of every optional email but
 * release news: "No marketing email unless you ask for it."
 *
 * Starting one on for readers who have not chosen, as release news is, would
 * be the owner's word and a line on the privacy page in his words first; the
 * column keeps a reader's own false apart from the nulls, so it would never
 * reach someone who had turned it off, and it needs no other migration.
 */

/** The order a reader's one email of a run is chosen in, when more than one is due: what will not wait first. */
export const RETENTION_PRIORITY: readonly RetentionKind[] = ["fasting_companion", "first_week", "pick_up"];
