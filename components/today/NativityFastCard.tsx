import { NATIVITY_PATH } from "@/lib/reading/nativity";
import { pathPage } from "@/lib/reading/pathView";
import { NativityStarCard, type NativityDayReading } from "./NativityStarCard";

/**
 * The Nativity Fast's card on Today, its server shell (1.8): each day of the
 * path's first reading, by title and author, built from the registries once
 * at build time as the path's own page builds them (lib/reading/pathView.ts).
 * Forty short lines; the card picks the fast's day out of them on the device,
 * and shows nothing on the days the fast is not running.
 */
export function NativityFastCard({ className }: { className?: string }) {
  const path = pathPage(NATIVITY_PATH);
  if (!path) return null;
  const days: NativityDayReading[] = path.days.map((day) => {
    const first = day.readings[0];
    return first ? { title: first.title, author: first.author } : null;
  });
  return <NativityStarCard days={days} className={className} />;
}
