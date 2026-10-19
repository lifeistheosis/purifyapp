"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { PLACE_LABEL, PRAY_PLACES, togglePlace, type PrayPlace } from "@/lib/prayers/commemoration";

/**
 * The prayers that carry "Those I pray for" (lib/prayers/commemoration.ts),
 * each a toggle, named as the app names each prayer: the reader's whole list
 * on the page of Your rule, and one name from the prayer wall when it is
 * added. Several may be on, or none.
 */
export function PlaceChips({
  value,
  onChange,
  labelledBy,
}: {
  value: readonly PrayPlace[];
  onChange: (next: PrayPlace[]) => void;
  /** The id of the line that names the choice. */
  labelledBy: string;
}) {
  const { t } = useTranslate();
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {PRAY_PLACES.map((place) => {
        const on = value.includes(place);
        return (
          <button
            key={place}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(togglePlace(value, place))}
            className={cn(
              "tap-press hit-44 inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-4 font-sans text-detail font-semibold motion-safe:transition-colors",
              on ? "border-paper bg-paper text-night" : "border-paper/15 text-paper/70 hover:border-paper/35 hover:text-paper",
            )}
          >
            {on ? <Check size={14} className="shrink-0" /> : null}
            {t(PLACE_LABEL[place])}
          </button>
        );
      })}
    </div>
  );
}
