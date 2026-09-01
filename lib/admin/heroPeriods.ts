// Which time windows the hero row offers, and how many days each one means.
//
// These two facts lived next to each other in HeroRow.tsx and were free to
// disagree. `w` resolves as `WINDOW[period] ?? 30`, so a chip offered without a
// matching window silently falls back to a month: the control would read
// "Today" and the card would be showing thirty days. Nothing throws, nothing
// looks wrong, and the number is simply not what the label says.
//
// Here so vitest can hold them in step, because vitest.config.ts covers lib/**
// only and this is exactly the kind of pairing that rots the next time someone
// adds a chip.

import type { PeriodId } from "@/components/admin/hero";

/** Days per window. The hero's series are daily buckets, so one day is today. */
export const HERO_WINDOW: Partial<Record<PeriodId, number>> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

/**
 * The chips the hero row shows, in PERIODS order.
 *
 * Not the full set. 90D and All are absent because the row's sparklines are
 * drawn from these same daily buckets and the traffic read is a 90 day fetch:
 * offering "All" would show a 90 day answer under a label promising more,
 * which is the same class of lie the window map above guards against.
 */
export const HERO_PERIODS: PeriodId[] = ["24h", "7d", "30d"];

/**
 * Labels the hero overrides.
 *
 * "Today" rather than "24H" because these buckets are calendar days in UTC, so
 * the shortest window is today's bucket and not a rolling twenty four hours. A
 * surface reading a genuinely rolling series should keep "24H", which is why
 * this is a per-caller override rather than a rename in PERIODS.
 */
export const HERO_LABELS: Partial<Record<PeriodId, string>> = { "24h": "Today" };
