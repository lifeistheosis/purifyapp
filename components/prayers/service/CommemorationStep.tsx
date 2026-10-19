"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { LINE_SIZE, lineFont } from "@/components/prayers/service/PrayerStep";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { DEPARTED_PRAYER, departedPrayer, wallLine } from "@/lib/prayers/commemoration";
import type { WallName } from "@/lib/prayers/wallNames";

type Named = { id: string; name: string };

/**
 * "Those I pray for" in a prayer (1.7.1, lib/prayers/commemoration.ts): the
 * reader's living and the names they brought from the prayer wall, then their
 * departed. It reads as a prayer of the page does (PrayerStep): its name, the
 * rubric, then its lines in the reader's own font, lit as the page scrolls.
 *
 * Over the living, a line of our own in the first person; each name on a line
 * of its own, and under a name from the wall, plainer and smaller, the words
 * it asked with. Over the departed, the Church's prayer, Hapgood's "O God of
 * spirits", with their names where the edition prints NN.
 *
 * "Mark prayed" marks it for today, as a prayer is marked, and lets the names
 * from the wall go; they stay on this page, marked, until it is left.
 */
export function CommemorationStep({
  stepId,
  living,
  wall,
  departed,
  done,
  hydrated,
  onToggle,
}: {
  /** "names" where it stands as the reader's own step in their rule. */
  stepId: string;
  living: readonly Named[];
  wall: readonly WallName[];
  departed: readonly Named[];
  done: boolean;
  hydrated: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslate();
  const { size, font, leadingValue } = useReaderPrefs();
  const lineClass = cn(lineFont(font), LINE_SIZE[size], "text-paper");
  const leading = { lineHeight: leadingValue ?? 1.5 };
  const hasLiving = living.length + wall.length > 0;
  const hasDeparted = departed.length > 0;

  return (
    <section id={stepId} aria-labelledby={`${stepId}-title`} className="scroll-mt-16 border-t border-paper/10 py-9 md:scroll-mt-24">
      <h2 id={`${stepId}-title`} tabIndex={-1} className="font-serif text-title-sm font-semibold leading-snug text-paper/90 focus:outline-none">
        {t("prayers.mine.names")}
      </h2>
      <p className="mt-4 font-serif text-detail italic leading-[1.55] text-paper/55">
        {hasLiving || hasDeparted ? t("prayers.mine.namesInstruction") : t("prayers.mine.namesNone")}
      </p>

      {hasLiving ? (
        <div className="mt-5" style={leading}>
          <span data-line className={cn("block", lineClass)}>
            {t("prayers.commemorate.living")}
          </span>
          <ul className="mt-[0.6em]">
            {living.map((n) => (
              <li key={n.id} className="mt-[0.35em]">
                <span data-line className={cn("block break-words", lineClass)}>
                  {n.name}
                </span>
              </li>
            ))}
            {wall.map((n) => (
              <li key={n.id} className="mt-[0.35em]">
                <span data-line className={cn("block break-words", lineClass)}>
                  {n.name}
                </span>
                <span className="mt-1 block break-words font-sans text-detail leading-[1.55] text-paper/60">
                  {wallLine(n.intention ? t("prayers.wall.alsoFor") : t("prayers.wall.also"), n.name, n.intention)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasDeparted ? (
        <div className={hasLiving ? "mt-[1.6em]" : "mt-5"} style={leading}>
          <div lang="en">
            {departedPrayer(departed.map((n) => n.name)).map((line, i) => (
              <span key={i} data-line className={cn("block break-words", i > 0 && "mt-[0.35em]", lineClass)}>
                {line}
              </span>
            ))}
          </div>
          <p className="mt-4 font-sans text-caption text-paper/50">
            {t("prayers.reader.sourceLabel")} {DEPARTED_PRAYER.source}
          </p>
        </div>
      ) : null}

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
      {done && wall.length > 0 ? (
        <p role="status" className="mt-1 font-sans text-caption text-paper/50">
          {t("prayers.wall.left")}
        </p>
      ) : null}
    </section>
  );
}
