/**
 * The claim deadline in the admin's date-and-time field, in UTC both ways.
 *
 * THE BUG THIS CLOSES (found on the r3 sheets, 2026-10-30). The drop editor
 * filled its datetime-local field with the stored deadline cut to its first
 * sixteen characters, which is the UTC wall time, and saved it back with
 * `new Date(value)`, which reads a datetime-local string as the BROWSER'S
 * local time. So every save moved the deadline by the browser's offset: on
 * Eastern time, 23:59 on the 10th came back as 04:59 on the 11th, and the
 * next save moved it again.
 *
 * Shown in UTC and saved in UTC, because the rest of the box already speaks
 * UTC: the default deadline is 23:59 UTC on the 10th, and every date on the
 * EIKON page and in the announcement is formatted in UTC. The field says so
 * in its label.
 *
 * Pure.
 */

/** "2026-11-10T23:59" for 2026-11-10T23:59:00.000Z; empty for nothing or a bad value. */
export function deadlineInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toISOString().slice(0, 16);
}

/** The field's value, read as UTC, as an ISO instant; null for empty or unreadable. */
export function deadlineFromInput(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
  if (!Number.isFinite(t)) return null;
  const back = new Date(t);
  // Date.UTC rolls 31 November into 1 December; a date that rolled is not the one typed.
  if (back.getUTCMonth() !== Number(mo) - 1 || back.getUTCDate() !== Number(d)) return null;
  return back.toISOString();
}
