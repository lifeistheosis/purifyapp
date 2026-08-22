/**
 * Billing cadence for a cost line, and the one rule that turns it into money.
 *
 * This lives in lib rather than beside the route that writes it because five
 * surfaces need the same answer and none of them may disagree: the admin write
 * route, the admin read route, the public /support page, the expense editor,
 * and the tests. A second copy of the divide-by-twelve is how a yearly licence
 * ends up published as a monthly one.
 *
 * 'once' rather than 'otp'. OTP already means the Supabase one-time-password
 * flow in this codebase, and reusing the initials for a billing period would
 * make a grep for either one useless.
 */

export type Cadence = "once" | "monthly" | "yearly";

export const CADENCES: readonly Cadence[] = ["monthly", "yearly", "once"];

/** The label an operator or a reader sees. Never the raw enum value. */
export const CADENCE_LABEL: Record<Cadence, string> = {
  once: "One time",
  monthly: "Monthly",
  yearly: "Yearly",
};

/** What the amount field is asking for, per cadence. */
export const CADENCE_UNIT: Record<Cadence, string> = {
  once: "USD, one time",
  monthly: "USD per month",
  yearly: "USD per year",
};

export function isCadence(v: unknown): v is Cadence {
  return v === "once" || v === "monthly" || v === "yearly";
}

/** Anything unrecognised reads as monthly, which is what every row was before
 *  this column existed. A row from a future cadence this build does not know
 *  about is better shown as monthly than crashed on. */
export function asCadence(v: unknown): Cadence {
  return isCadence(v) ? v : "monthly";
}

/**
 * How much of a cost lands in a single month.
 *
 * A ONE-TIME cost contributes zero. It is a real cost and it is not a monthly
 * one. Folding it in would permanently depress the donation coverage ratio,
 * which the Sustainability card colours red below 100%, so a single $500
 * recording session would read as the project failing every month forever.
 *
 * A YEARLY cost is amortized. Note that twelve times the result does not
 * generally add back to the invoice: rounding drifts by up to 5 cents a year,
 * which is invisible at the rendered precision because both formatters drop
 * cents. The monthly view is an amortization and is not reconstructable, which
 * is why the source figure is shown beside it rather than replaced by it.
 *
 * Mirrored exactly by the expense_lines_monthly_matches_cadence check
 * constraint in supabase/migrations/20260822_expense_cadence.sql. round() in
 * Postgres and Math.round here agree for non-negative values, and the column
 * is constrained non-negative.
 */
export function monthlyFrom(cadence: Cadence, amountCents: number): number {
  if (cadence === "once") return 0;
  if (cadence === "yearly") return Math.round(amountCents / 12);
  return amountCents;
}

/** True when the line contributes to a recurring monthly total. */
export function isRecurring(cadence: Cadence): boolean {
  return cadence !== "once";
}
