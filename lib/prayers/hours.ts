// Hours registry + helper that returns the canonical "now" hour by
// local clock.
//
// The header used to say this was "used by the /prayers landing page to
// highlight which Hour the day is closest to". No page did. currentHourSlug
// had zero callers from the day it was written until 2026-08-09. Since 1.7
// it lights the Hour the clock is in on the Hours' timeline
// (lib/prayers/dayTimeline.ts, components/prayers/DayTimeline.tsx), which
// reads the clock after mount because the page ships into the static export.
// Since 1.8 it lives with the Hours' own hours in lib/prayers/hourNow.ts, which
// carries none of the five texts, so the Prayers tab can light the Hour too
// without them (note 72); it is answered from here as before.

import type { Rule } from "@/lib/prayers/types";
import { HOUR_STARTS, currentHourSlug, type HourSlug } from "@/lib/prayers/hourNow";
import first from "@/data/prayers/hours/first-hour.json";
import third from "@/data/prayers/hours/third-hour.json";
import sixth from "@/data/prayers/hours/sixth-hour.json";
import ninth from "@/data/prayers/hours/ninth-hour.json";
import compline from "@/data/prayers/hours/compline.json";

export { currentHourSlug };

export type HourMeta = {
  slug: string;
  title: string;
  subtitle?: string;
  /** Local-clock hour the Hour traditionally begins (24h, 0-23). */
  approxHour: number;
  /** How long it is to read, from its file. */
  estimatedMinutes: number;
};

const TEXTS: Record<HourSlug, Rule> = {
  "first-hour": first as Rule,
  "third-hour": third as Rule,
  "sixth-hour": sixth as Rule,
  "ninth-hour": ninth as Rule,
  compline: compline as Rule,
};

const REGISTRY: { slug: string; data: Rule; approxHour: number }[] = HOUR_STARTS.map(({ slug, approxHour }) => ({
  slug,
  data: TEXTS[slug],
  approxHour,
}));

export function listHours(): HourMeta[] {
  return REGISTRY.map(({ slug, data, approxHour }) => ({
    slug,
    title: data.title,
    subtitle: data.subtitle,
    approxHour,
    estimatedMinutes: data.estimatedMinutes,
  }));
}

export function getHour(slug: string): Rule | null {
  return REGISTRY.find((r) => r.slug === slug)?.data ?? null;
}
