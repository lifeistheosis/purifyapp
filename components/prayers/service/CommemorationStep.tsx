"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { LINE_SIZE, lineFont } from "@/components/prayers/service/PrayerStep";
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
 * Nothing is ticked under it since 1.9 (build 89 note 7, the arbiter's yes of
 * 2026-11-10): the Amen at the end of the page marks it with the rule, and
 * lets the names from the wall go; they stay on this page, marked, until it
 * is left, and the end of the page says so (PrayerRuleReader.tsx).
 */
export function CommemorationStep({
  stepId,
  living,
  wall,
  departed,
}: {
  /** "names" where it stands as the reader's own step in their rule. */
  stepId: string;
  living: readonly Named[];
  wall: readonly WallName[];
  departed: readonly Named[];
}) {
  const { t } = useTranslate();
  const { size, font, leadingValue } = useReaderPrefs();
  const lineClass = cn(lineFont(font), LINE_SIZE[size], "text-paper");
  const leading = { lineHeight: leadingValue ?? 1.5 };
  const hasLiving = living.length + wall.length > 0;
  const hasDeparted = departed.length > 0;

  // A step of the page, set in the middle as every prayer of it is since 1.8
  // (PrayerStep, the owner's pick B, Immersive).
  return (
    <section id={stepId} data-step aria-labelledby={`${stepId}-title`} className="scroll-mt-16 border-t border-paper/10 py-9 text-center md:scroll-mt-24">
      <h2 id={`${stepId}-title`} tabIndex={-1} className="font-serif text-title-sm font-semibold leading-snug text-paper/90 focus:outline-none">
        {t("prayers.mine.names")}
      </h2>
      <p className="mt-4 font-serif text-detail italic leading-[1.55] text-paper/55">
        {hasLiving || hasDeparted ? t("prayers.mine.namesInstruction") : t("prayers.mine.namesNone")}
      </p>

      {hasLiving ? (
        <div className="mt-5" style={leading}>
          {/* Where Easy Scroll settles this step (app/globals.css). */}
          <span data-line data-snap-start="" className={cn("block", lineClass)}>
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
              <span key={i} data-line {...(i === 0 && !hasLiving ? { "data-snap-start": "" } : {})} className={cn("block break-words", i > 0 && "mt-[0.35em]", lineClass)}>
                {line}
              </span>
            ))}
          </div>
          <p className="mt-4 font-sans text-caption text-paper/50">
            {t("prayers.reader.sourceLabel")} {DEPARTED_PRAYER.source}
          </p>
        </div>
      ) : null}
      {/* Where a long list of names settles at its end, before the next prayer. */}
      <span aria-hidden data-snap-end="" />
    </section>
  );
}
