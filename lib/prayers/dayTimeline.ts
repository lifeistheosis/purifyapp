// The day as a timeline (1.7), for the Hours and for today's prayers.
//
// The owner's note 16 of 2026-10-16 asked for the Hours as the day, with the
// current hour lit, in place of a list of five rows. Two timelines:
//
//   - the Hours: the five, in the order of the day, the one the clock is in
//     lit (currentHourSlug, lib/prayers/hours.ts);
//   - the day: the daily rule and the Hours together, by part of the day
//     (on waking, morning, midday, evening, night), the part the clock is in
//     lit. Each Hour stands in the part its own hour falls in.
//
// No hour of the day is written here. The Hours' hours are their data's
// (lib/prayers/hours.ts) and the parts of the day are the Pray now row's
// (timeOfDayAt, lib/prayers/suggest.ts), whose evening starts at
// EVENING_FROM_HOUR (lib/prayers/ruleForHour.ts) like every other screen's.
// lib/prayers/__tests__/ruleForHour.test.ts holds that.
//
// Pure, and read on the device after mount: the pages ship in the static
// export, where a clock read on the server would freeze the build's hour.

import { currentHourSlug, listHours } from "@/lib/prayers/hours";
import { getRuleMeta, type TimeOfDay } from "@/lib/prayers/rules";
import { timeOfDayAt } from "@/lib/prayers/suggest";

export type TimelineSlot = {
  /** The rule's id, or the Hour's slug: also the key of its done mark. */
  id: string;
  href: string;
  /** The prayer's name in the catalogs. */
  titleKey: string;
  minutes?: number;
  /** The hour of the clock an Hour is read at (0 to 23), for "around 9 AM". The daily rule has none. */
  hour?: number;
};

export type DayPart = Exclude<TimeOfDay, "any">;

export const DAY_PARTS: readonly DayPart[] = ["waking", "morning", "midday", "evening", "night"];

/** The daily rule's own prayer for each part of the day. */
const PART_RULE: Record<DayPart, string> = {
  waking: "upon-waking",
  morning: "morning",
  midday: "midday",
  evening: "evening",
  night: "before-sleep",
};

function ruleSlot(id: string): TimelineSlot {
  const meta = getRuleMeta(id);
  return {
    id,
    href: meta?.href ?? `/prayers/${id}`,
    titleKey: `prayers.rule.${id}.title`,
    minutes: meta?.estimatedMinutes,
  };
}

/** The five Hours, in the order of the day. */
export function hoursTimeline(): TimelineSlot[] {
  return listHours()
    .slice()
    .sort((a, b) => a.approxHour - b.approxHour)
    .map((h) => ({
      id: h.slug,
      href: `/prayers/hours/${h.slug}`,
      titleKey: `prayers.rule.${h.slug}.title`,
      minutes: h.estimatedMinutes,
      hour: h.approxHour,
    }));
}

/** The part of the day an hour of the clock falls in. */
export function partAt(localHour: number): DayPart {
  const tod = timeOfDayAt(new Date(2000, 0, 1, localHour));
  return tod === "any" ? "morning" : tod;
}

/**
 * The day's prayers by part of the day. In every part the daily rule's
 * prayer comes first and the Hours follow in their order, but at night,
 * where Compline comes before the prayers said lying down to sleep.
 */
export function dayTimeline(): { part: DayPart; slots: TimelineSlot[] }[] {
  const hours = hoursTimeline();
  return DAY_PARTS.map((part) => {
    const rule = ruleSlot(PART_RULE[part]);
    const inPart = hours.filter((h) => h.hour !== undefined && partAt(h.hour) === part);
    return { part, slots: part === "night" ? [...inPart, rule] : [rule, ...inPart] };
  });
}

/** What the clock lights: the Hour it is in, and the part of the day. */
export function litNow(now: Date): { hour: string; part: DayPart } {
  const h = now.getHours();
  return { hour: currentHourSlug(h), part: partAt(h) };
}
