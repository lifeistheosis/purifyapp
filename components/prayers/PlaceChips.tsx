"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { PLACE_LABEL, PRAY_PLACES, togglePlace, type PrayPlace } from "@/lib/prayers/commemoration";

/**
 * The prayers that carry "Those I pray for" (lib/prayers/commemoration.ts),
 * each a line to tick, named as the app names each prayer: the reader's
 * whole list, from the page of Your rule (in the sheet In which prayers
 * opens), and one name from the prayer wall when it is added (the wall's own
 * sheet). Several may be ticked, or none.
 *
 * 1.8 (the owner's pick A of r3-27): lines in a lit panel, each with its tick
 * (globals.css, "Your rule: the icon above, the steps below"). They were six
 * pills scattered in a row, the cloud the owner calls vibe coded
 * (2026-10-29: never pills for a choice). The name stays, for the two
 * sheets that hold it.
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
    <div role="group" aria-labelledby={labelledBy} data-place-ticks className="set-panel">
      {PRAY_PLACES.map((place) => {
        const on = value.includes(place);
        return (
          <button
            key={place}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(togglePlace(value, place))}
            className="set-link flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-start"
          >
            <span aria-hidden className="rule-tick" data-on={on ? "" : undefined}>
              {on ? <Check size={12} /> : null}
            </span>
            <span className="set-label">{t(PLACE_LABEL[place])}</span>
          </button>
        );
      })}
    </div>
  );
}
