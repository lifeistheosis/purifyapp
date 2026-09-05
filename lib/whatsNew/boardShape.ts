import { z } from "zod";

/**
 * One board message as the admin editor, the actions route and the pull
 * script pass it around. No `server-only`: the client tab imports it.
 */
export const BoardInput = z.object({
  /** ISO week label, "2026-W36". */
  week: z.string().trim().regex(/^\d{4}-W\d{2}$/, "week must look like 2026-W36"),
  /** ISO date, YYYY-MM-DD. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  eyebrow: z.string().trim().max(120).default("This week at Purify"),
  headline: z.string().trim().min(1).max(300),
  body: z.array(z.string().max(8000)).min(1).max(30),
});

export type BoardInput = z.infer<typeof BoardInput>;

const EM_DASH = /—/;

/** The first field carrying an em dash, or null. */
export function boardEmDashField(b: BoardInput): string | null {
  if (EM_DASH.test(b.eyebrow)) return "eyebrow";
  if (EM_DASH.test(b.headline)) return "headline";
  const i = b.body.findIndex((p) => EM_DASH.test(p));
  if (i >= 0) return `paragraph ${i + 1}`;
  return null;
}

/** "2026-09-04" to "2026-W36", ISO 8601 week numbering. */
export function isoWeekOf(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Thursday of the same ISO week decides the year.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
