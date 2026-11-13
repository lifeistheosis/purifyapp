/**
 * The welcome email's asking line for the first-week guide, in his words
 * (docs/plans/retention-emails.md, question 3: "A short guide for your first
 * week, three emails. Send it to me."). Pure and import-free, so the account
 * templates can read it; lib/email/retention/firstWeekAsk.ts says when it is
 * asked and what the tap does.
 */
export const FIRST_WEEK_ASK = {
  line: "A short guide for your first week, three emails.",
  label: "Send it to me",
} as const;
