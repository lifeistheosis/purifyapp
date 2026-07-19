"use client";

// "Suggested for Today" rail — context-aware prayer suggestions.
//
// Liturgical context (season, fast day, feast) is computed on the server and
// passed in as serializable props, because the hub is ISR-cached. The time of
// day is the one piece that must be read on the client (the visitor's own
// clock), so it is computed after mount behind a gate to avoid a hydration
// mismatch. Only real, seeded rules are ever suggested — never a planned one.

import { PrayerSectionLabel, PrayerIndex, PrayerIndexRow } from "./PrayerBook";
import { useMounted } from "@/lib/useMounted";
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
  season,
  isFast,
  label = "Suggested for today",
  max = 3,
}: {
  season: Season;
  isFast: boolean;
  label?: React.ReactNode;
  max?: number;
}) {
  const mounted = useMounted();

  // Stable server render: a quiet placeholder slot is avoided entirely by
  // gating on mount. The masthead above already carries the day's context.
  if (!mounted) return null;

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
