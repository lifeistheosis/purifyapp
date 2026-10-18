"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { LINE_SIZE, lineFont } from "@/components/prayers/service/PrayerStep";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { WALL_COMMEMORATION, commemorate, wallLine, type WallName } from "@/lib/prayers/wallNames";

/**
 * The names a reader brought from the prayer wall, where the rule
 * commemorates the living (1.7.1, lib/prayers/wallNames.ts). It reads as a
 * prayer of the page does (PrayerStep): its name, then its lines in the
 * reader's own font, lit as the page scrolls. Each name has the Church's own
 * words for it, Hapgood's "Call to remembrance, O Lord, N.", and under them
 * a line of our own, plain and smaller, with what they asked prayers for.
 *
 * "Mark prayed" lets them go from the reader's prayers. They stay on this
 * page as prayed until it is left, so the mark can be taken back, as a
 * prayer's can.
 */
export function WallNamesStep({
  names,
  done,
  hydrated,
  onToggle,
}: {
  names: readonly WallName[];
  /** Every name here is marked prayed. */
  done: boolean;
  hydrated: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslate();
  const { size, font, leadingValue } = useReaderPrefs();
  const lineClass = cn(lineFont(font), LINE_SIZE[size], "text-paper");

  return (
    <section id="prayer-wall" aria-labelledby="prayer-wall-title" className="scroll-mt-16 border-t border-paper/10 py-9 md:scroll-mt-24">
      <h2 id="prayer-wall-title" tabIndex={-1} className="font-serif text-title-sm font-semibold leading-snug text-paper/90 focus:outline-none">
        {t("prayers.wall.title")}
      </h2>

      <ul className="mt-5" style={{ lineHeight: leadingValue ?? 1.5 }}>
        {names.map((n, i) => (
          <li key={n.id} className={i > 0 ? "mt-[1.1em]" : undefined}>
            <span data-line lang="en" className={cn("block break-words", lineClass)}>
              {commemorate(n.name)}
            </span>
            <span className="mt-1.5 block break-words font-sans text-detail leading-[1.55] text-paper/60">
              {wallLine(n.intention ? t("prayers.wall.alsoFor") : t("prayers.wall.also"), n.name, n.intention)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 font-sans text-caption text-paper/50">
        {t("prayers.reader.sourceLabel")} {WALL_COMMEMORATION.source}
      </p>

      <button
        type="button"
        onClick={onToggle}
        disabled={!hydrated}
        aria-pressed={done}
        className={cn(
          "tap-press mt-6 inline-flex min-h-11 items-center gap-2.5 rounded-pill pe-3 font-sans text-detail motion-safe:transition-colors disabled:opacity-40",
          done ? "text-paper" : "text-paper/65 hover:text-paper",
        )}
      >
        <span
          aria-hidden
          className={cn("grid size-6 shrink-0 place-items-center rounded-full", done ? "bg-paper text-night" : "ring-1 ring-inset ring-paper/35")}
        >
          {done ? <Check size={14} /> : null}
        </span>
        {done ? t("shop.prayedToday") : t("prayers.reader.markPrayed")}
      </button>
      {done ? (
        <p role="status" className="mt-1 font-sans text-caption text-paper/50">
          {t("prayers.wall.left")}
        </p>
      ) : null}
    </section>
  );
}
