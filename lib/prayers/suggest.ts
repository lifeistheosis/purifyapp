// What to pray now: the rules that fit the reader's hour, the Church's
// season and a fast day, then always-fitting fallbacks so the Pray now row
// is never short. Pure; the caller supplies the hour and the day's context
// from the reader's own device (see components/prayers/PrayNow.tsx).
//
// Only real, seeded rules are ever suggested, never a planned one.

import { EVENING_FROM_HOUR } from "@/lib/prayers/ruleForHour";
import { RULES, type RuleMeta, type Season, type TimeOfDay } from "@/lib/prayers/rules";

/**
 * Where evening hands over to night, in this row only. Nine is the hour
 * Compline is read (lib/prayers/hours.ts), and from then the row leads with
 * Compline and the prayers before sleep, not the Evening Rule.
 *
 * It is the END of evening. Where evening STARTS is EVENING_FROM_HOUR, one
 * answer for every screen, so no second start belongs here.
 */
export const NIGHT_FROM_HOUR = 21;

export function timeOfDayAt(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h >= 4 && h < 7) return "waking";
  if (h >= 7 && h < 11) return "morning";
  if (h >= 11 && h < EVENING_FROM_HOUR) return "midday";
  if (h >= EVENING_FROM_HOUR && h < NIGHT_FROM_HOUR) return "evening";
  return "night";
}

/** Always-fitting, in order, after the hour and the season have spoken. */
const FALLBACKS = ["jesus-prayer", "repentance", "creed", "protection", "compline"];

export function suggestRules({
  tod,
  season,
  isFast,
  max = 4,
  exclude = new Set<string>(),
}: {
  tod: TimeOfDay;
  season: Season;
  isFast: boolean;
  max?: number;
  exclude?: ReadonlySet<string>;
}): RuleMeta[] {
  const chosen: RuleMeta[] = [];
  const seen = new Set<string>(exclude);
  const add = (r: RuleMeta | undefined) => {
    if (!r || r.planned || seen.has(r.id) || chosen.length >= max) return;
    seen.add(r.id);
    chosen.push(r);
  };
  const byId = (id: string) => RULES.find((r) => r.id === id);

  // 1) The rule that fits the hour.
  add(RULES.find((r) => r.timeOfDay === tod && !r.planned));
  if (tod === "waking") add(byId("morning"));
  if (tod === "night") add(byId("before-sleep"));

  // 2) Season and fast.
  if (season === "lent") add(byId("lent-ephrem"));
  if (season === "pascha") add(byId("pascha"));
  if (isFast) add(RULES.find((r) => r.fastRelated && !r.planned));

  // 3) Always fitting.
  for (const id of FALLBACKS) add(byId(id));
  return chosen;
}
