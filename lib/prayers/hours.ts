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

import type { Prayer, PrayerFrom, Rule } from "@/lib/prayers/types";
import { HOUR_STARTS, currentHourSlug, type HourSlug } from "@/lib/prayers/hourNow";
import { rubricMakesTheCross } from "@/lib/prayers/lines";
import first from "@/data/prayers/hours/first-hour.json";
import third from "@/data/prayers/hours/third-hour.json";
import sixth from "@/data/prayers/hours/sixth-hour.json";
import ninth from "@/data/prayers/hours/ninth-hour.json";
import compline from "@/data/prayers/hours/compline.json";
import morning from "@/data/prayers/rules/morning.json";

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

/** An Hour as its file holds it: a part may point to another rule's prayer. */
type HourFile = Omit<Rule, "prayers"> & { prayers: (Prayer | PrayerFrom)[] };

/** The rules an Hour's part may point to (1.9, build 90 note 7). */
const POINTED_TO: Record<string, Rule> = { morning: morning as Rule };

/**
 * An Hour with every part that points elsewhere made that prayer, word for
 * word: its title, words and rubric, under the Hour's own id, with the Hour's
 * own word on how to pray it where it gives one. The Morning Rule's sign of
 * the Cross comes with it only where that prayer's own rubric says so, as in
 * Your rule (lib/prayers/myRule.ts). A part that points at nothing stops the
 * build here, never a reader at a blank.
 */
export function resolveHour(file: HourFile, rules: Record<string, Rule> = POINTED_TO): Rule {
  return {
    ...file,
    prayers: file.prayers.map((part): Prayer => {
      if (!("from" in part)) return part;
      const prayer = rules[part.from.ruleId]?.prayers.find((p) => p.id === part.from.prayerId);
      if (!prayer) throw new Error(`${file.id}: ${part.id} points to ${part.from.ruleId}/${part.from.prayerId}, which is not there`);
      const { cross, ...words } = prayer;
      const ownCross = rubricMakesTheCross(prayer.title) || rubricMakesTheCross(prayer.instruction);
      return {
        ...words,
        ...(ownCross && cross ? { cross } : {}),
        id: part.id,
        ...(part.instruction ? { instruction: part.instruction } : {}),
      };
    }),
  };
}

const TEXTS: Record<HourSlug, Rule> = {
  "first-hour": resolveHour(first as HourFile),
  "third-hour": resolveHour(third as HourFile),
  "sixth-hour": resolveHour(sixth as HourFile),
  "ninth-hour": resolveHour(ninth as HourFile),
  compline: resolveHour(compline as HourFile),
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
