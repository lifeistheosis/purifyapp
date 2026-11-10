"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { LINE_SIZE, lineFont } from "@/components/prayers/service/PrayerStep";
import type { CarriedCampaign } from "@/lib/campaigns/carried";
import { dayText, setIn } from "@/lib/campaigns/words";
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
 *
 * A prayer campaign the reader carries (1.9, lib/campaigns/carried.ts)
 * brings its name here and nothing else: among the living, with the campaign
 * named under it as the wall's words stand under a name; among the departed,
 * inside the Church's prayer where the edition prints NN., with the campaign
 * named under the printing. It stays until its last day, whatever is marked.
 */
export function CommemorationStep({
  stepId,
  living,
  wall,
  departed,
  campaigns = [],
}: {
  /** "names" where it stands as the reader's own step in their rule. */
  stepId: string;
  living: readonly Named[];
  wall: readonly WallName[];
  departed: readonly Named[];
  /** The campaigns this prayer carries today. None in a build where campaigns are closed. */
  campaigns?: readonly CarriedCampaign[];
}) {
  const { t, locale } = useTranslate();
  const { size, font, leadingValue } = useReaderPrefs();
  const lineClass = cn(lineFont(font), LINE_SIZE[size], "text-paper");
  const leading = { lineHeight: leadingValue ?? 1.5 };
  const campaignLiving = campaigns.filter((c) => c.forWhom === "living");
  const campaignDeparted = campaigns.filter((c) => c.forWhom === "departed");
  const hasLiving = living.length + wall.length + campaignLiving.length > 0;
  const hasDeparted = departed.length + campaignDeparted.length > 0;
  // "With the prayer campaign “Forty days for Nicholas”, until December 19."
  // The title is a stranger's words, set in exactly as written.
  const campaignLine = (c: CarriedCampaign) => setIn(t("campaigns.inPrayersLine"), { title: c.title, date: dayText(c.until, locale) });

  // A step of the page, set in the middle as every prayer of it is since 1.8
  // (PrayerStep, the owner's pick B, Immersive).
  return (
    <section id={stepId} data-step aria-labelledby={`${stepId}-title`} className="relative scroll-mt-16 border-t border-paper/10 py-9 text-center md:scroll-mt-24">
      <h2 id={`${stepId}-title`} tabIndex={-1} className="font-serif text-title-sm font-semibold leading-snug text-paper/90 focus:outline-none">
        {t("prayers.mine.names")}
      </h2>
      <p className="mt-4 font-serif text-detail italic leading-[1.55] text-paper/55">
        {hasLiving || hasDeparted ? t("prayers.mine.namesInstruction") : t("prayers.mine.namesNone")}
      </p>

      {hasLiving ? (
        <div className="mt-5" style={leading}>
          {/* Where this step begins (Easy Scroll rests at every name). */}
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
            {campaignLiving.map((c) => (
              <li key={c.id} data-campaign-name="" className="mt-[0.35em]">
                <span data-line className={cn("block break-words", lineClass)}>
                  {c.name}
                </span>
                <span className="mt-1 block break-words font-sans text-detail leading-[1.55] text-paper/60">{campaignLine(c)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasDeparted ? (
        <div className={hasLiving ? "mt-[1.6em]" : "mt-5"} style={leading}>
          <div lang="en" dir="ltr">
            {departedPrayer([...departed.map((n) => n.name), ...campaignDeparted.map((c) => c.name)]).map((line, i) => (
              <span key={i} data-line {...(i === 0 && !hasLiving ? { "data-snap-start": "" } : {})} className={cn("block break-words", i > 0 && "mt-[0.35em]", lineClass)}>
                {line}
              </span>
            ))}
          </div>
          <p className="mt-4 font-sans text-caption text-paper/50">
            {t("prayers.reader.sourceLabel")}{" "}
            <span lang="en" dir="ltr">
              {DEPARTED_PRAYER.source}
            </span>
          </p>
          {campaignDeparted.map((c) => (
            <p key={c.id} data-campaign-name="" className="mt-1 break-words font-sans text-caption text-paper/50">
              {campaignLine(c)}
            </p>
          ))}
        </div>
      ) : null}
      {/* Where the names rest under Easy Scroll: each name and line, and a
          last rest in the last (useEasyScroll.ts; build 90 note 6). */}
      <span aria-hidden data-verse-rests="" />
    </section>
  );
}
