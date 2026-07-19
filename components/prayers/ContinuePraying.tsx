"use client";

// "Continue Praying" rail — the most recently opened prayer rules, so a
// reader can resume where they left off. Reads the recents store from
// localStorage with a mounted gate to avoid an SSR/hydration flash, and
// renders nothing at all when there is no history yet.

import { PrayerSectionLabel, PrayerIndex, PrayerIndexRow } from "./PrayerBook";
import { useRecentPrayers } from "@/lib/prayers/storage";
import { useMounted } from "@/lib/useMounted";

export function ContinuePraying({
  label = "Continue praying",
  max = 3,
}: {
  label?: React.ReactNode;
  max?: number;
}) {
  const mounted = useMounted();
  const recents = useRecentPrayers();

  if (!mounted || recents.length === 0) return null;

  return (
    <>
      <PrayerSectionLabel>{label}</PrayerSectionLabel>
      <PrayerIndex>
        {recents.slice(0, max).map((r) => (
          <PrayerIndexRow key={r.id} href={r.href} title={r.title} />
        ))}
      </PrayerIndex>
    </>
  );
}
