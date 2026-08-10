// Hours registry + helper that returns the canonical "now" hour by
// local clock.
//
// The header used to say this was "used by the /prayers landing page to
// highlight which Hour the day is closest to". No page did. currentHourSlug
// had zero callers from the day it was written until 2026-08-09, so the index
// showed five identical rows and left the reader to compare a flat clock time
// against their own watch. The caller is components/prayers/HoursIndex.tsx,
// which reads the clock after mount because this page ships into the static
// export.

import type { Rule } from "@/components/prayers/PrayerRuleReader";
import first from "@/data/prayers/hours/first-hour.json";
import third from "@/data/prayers/hours/third-hour.json";
import sixth from "@/data/prayers/hours/sixth-hour.json";
import ninth from "@/data/prayers/hours/ninth-hour.json";
import compline from "@/data/prayers/hours/compline.json";

export type HourMeta = {
  slug: string;
  title: string;
  subtitle?: string;
  /** Local-clock hour the Hour traditionally begins (24h, 0-23). */
  approxHour: number;
};

const REGISTRY: { slug: string; data: Rule; approxHour: number }[] = [
  { slug: "first-hour", data: first as Rule, approxHour: 6 },
  { slug: "third-hour", data: third as Rule, approxHour: 9 },
  { slug: "sixth-hour", data: sixth as Rule, approxHour: 12 },
  { slug: "ninth-hour", data: ninth as Rule, approxHour: 15 },
  { slug: "compline", data: compline as Rule, approxHour: 21 },
];

export function listHours(): HourMeta[] {
  return REGISTRY.map(({ slug, data, approxHour }) => ({
    slug,
    title: data.title,
    subtitle: data.subtitle,
    approxHour,
  }));
}

export function getHour(slug: string): Rule | null {
  return REGISTRY.find((r) => r.slug === slug)?.data ?? null;
}

/**
 * Which Hour is "now" by the user's local clock? Returns the closest
 * canonical hour ≤ the current hour, or "first-hour" before sunrise.
 */
export function currentHourSlug(localHour: number): string {
  const sorted = [...REGISTRY].sort((a, b) => a.approxHour - b.approxHour);
  let chosen = sorted[0];
  for (const h of sorted) {
    if (localHour >= h.approxHour) chosen = h;
  }
  return chosen.slug;
}
