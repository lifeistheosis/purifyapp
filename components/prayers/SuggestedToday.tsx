"use client";

// "Suggested for Today" rail — context-aware prayer suggestions.
//
// Liturgical context (season, fast day) used to be computed on the server
// and passed in. That froze it: the desktop Prayers tree ships into the
// Android static export, where a server component answers "what day is it"
// once, at build time, so a tablet was shown the build day's season and
// fast. Both are derived here now, from the reader's own day, alongside the
// time of day which was always read on the client.
//
// The props remain, so a caller that genuinely knows the context can still
// pass it. Only real, seeded rules are ever suggested, never a planned one.

import { PrayerSectionLabel, PrayerIndex, PrayerIndexRow } from "./PrayerBook";
import { useMounted } from "@/lib/useMounted";
import { useToday } from "@/lib/calendar/useToday";
import { isFastDay, seasonFor } from "@/lib/prayers/season";
import {
  RULES,
  type RuleMeta,
  type Season,
  type TimeOfDay,
} from "@/lib/prayers/rules";

function timeOfDayNow(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h >= 4 && h < 7) return "waking";
  if (h >= 7 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "midday";
  if (h >= 16 && h < 21) return "evening";
  return "night";
}

/** Pickable = has its own reader and is not a planned (unseeded) entry. */
function pickable(r: RuleMeta): boolean {
  return !r.planned;
}

export function SuggestedToday({
  season: seasonProp,
  isFast: isFastProp,
  label = "Suggested for today",
  max = 3,
}: {
  season?: Season;
  isFast?: boolean;
  label?: React.ReactNode;
  max?: number;
}) {
  const mounted = useMounted();
  const today = useToday();

  // Stable server render: a quiet placeholder slot is avoided entirely by
  // gating on mount. The masthead above already carries the day's context.
  if (!mounted || !today) return null;

  const season = seasonProp ?? seasonFor(today);
  const isFast = isFastProp ?? isFastDay(today);
  const tod = timeOfDayNow(new Date());
  const chosen: RuleMeta[] = [];
  const seen = new Set<string>();
  const add = (r: RuleMeta | undefined) => {
    if (!r || !pickable(r) || seen.has(r.id) || chosen.length >= max) return;
    seen.add(r.id);
    chosen.push(r);
  };

  // 1) The rule that fits the hour.
  add(RULES.find((r) => r.timeOfDay === tod && pickable(r)));
  if (tod === "waking") add(RULES.find((r) => r.id === "morning"));
  if (tod === "night") add(RULES.find((r) => r.id === "before-sleep"));

  // 2) Season / fast context.
  if (season === "lent") add(RULES.find((r) => r.id === "lent-ephrem"));
  if (season === "pascha") add(RULES.find((r) => r.id === "pascha"));
  if (isFast) add(RULES.find((r) => r.fastRelated && pickable(r)));

  // 3) Always-fitting fallbacks.
  add(RULES.find((r) => r.id === "jesus-prayer"));
  add(RULES.find((r) => r.id === "repentance"));

  if (chosen.length === 0) return null;

  return (
    <>
      <PrayerSectionLabel>{label}</PrayerSectionLabel>
      <PrayerIndex>
        {chosen.map((r) => (
          <PrayerIndexRow
            key={r.id}
            href={r.href}
            title={r.title}
            description={r.description}
            meta={r.estimatedMinutes ? `~${r.estimatedMinutes} min` : undefined}
          />
        ))}
      </PrayerIndex>
    </>
  );
}
