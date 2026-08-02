"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { getRuleMeta } from "@/lib/prayers/rules";
import { readPrayedDates } from "@/lib/prayers/storage";
import { useDailyRhythm } from "@/lib/rhythm/useDailyRhythm";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { RhythmRow } from "@/components/rhythm/RhythmRow";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The one thing to pray now, as the first object under the dateline.
 *
 * This replaces the 14px underlined phrase that used to sit inside a
 * sentence in TodayGreeting ("The hour calls for the Morning Rule."), which
 * made the page's primary action smaller than its section labels. The
 * greeting, the reader's name, the already-prayed line and the fourteen-day
 * rhythm all moved in here with it; TodayGreeting is gone.
 *
 * Two things are deliberately NOT here and must not be added:
 *
 *   - a count, a streak, a percentage, or "9 of 14". See the doctrine header
 *     in components/rhythm/RhythmRow.tsx. Keeping the day makes this surface
 *     quieter, never louder.
 *   - a "mark as prayed" control. Marks sync by set union and never delete,
 *     so a mark made here could not be taken back from another device.
 *     Marking belongs where the rule is actually prayed.
 */

const NBSP = "\u00A0";

const MORNING = {
  id: "morning",
  href: "/prayers/morning",
  titleKey: "prayers.morningRule",
  labelKey: "prayers.today.morningRuleLabel",
} as const;

const EVENING = {
  id: "evening",
  href: "/prayers/evening",
  titleKey: "prayers.eveningRule",
  labelKey: "prayers.today.eveningRuleLabel",
} as const;

/**
 * Boundaries carried over verbatim from the old TodayGreeting: morning and
 * afternoon both point at the Morning Rule, evening at the Evening Rule.
 * Deliberately NOT aligned with useDailyRhythm's hour<12 split, which is
 * answering a different question (which rule to file a mark under).
 */
function ruleForHour(h: number) {
  return h >= 17 ? EVENING : MORNING;
}

function greetingKeyForHour(h: number) {
  if (h < 12) return "today.greetingMorning";
  if (h < 17) return "today.greetingAfternoon";
  return "today.greetingEvening";
}

function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function TodayHourRule() {
  const { t } = useTranslate();
  const rhythm = useDailyRhythm();
  const [ready, setReady] = useState(false);
  const [hour, setHour] = useState(8);
  const [prayedToday, setPrayedToday] = useState(false);
  const [name, setName] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx precedent): the clock and localStorage are both
     client-only, and a server render of either bakes the build day's answer
     into the Android export. */
  useEffect(() => {
    const h = new Date().getHours();
    setHour(h);
    try {
      setPrayedToday(
        readPrayedDates(ruleForHour(h).id).includes(ymdLocal(new Date())),
      );
    } catch {
      /* a broken pointer never breaks Today */
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The name is a garnish; it arrives when it arrives, and its absence
  // changes no layout.
  useEffect(() => {
    let live = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const display = data.user?.user_metadata?.display_name;
        if (!live || typeof display !== "string" || !display.trim()) return;
        setName(display.trim().split(/\s+/)[0] ?? null);
      })
      .catch(() => {
        /* signed out or offline: greet without a name */
      });
    return () => {
      live = false;
    };
  }, []);

  const rule = ruleForHour(hour);
  const minutes = getRuleMeta(rule.id)?.estimatedMinutes ?? null;
  const greetingLine = `${t(greetingKeyForHour(hour))}${name ? `, ${name}` : ""}.`;

  // The MERGED prayer rhythm, not the rhythm of whichever rule we happen to
  // be showing. A reader who prayed the Morning Rule and opens this page at
  // six in the evening used to be shown the empty evening dots.
  const strand = rhythm?.strands.find((s) => s.id === "prayer") ?? null;
  const prayedAny = Boolean(strand?.rhythm.some((d) => d.kept));

  return (
    <section aria-labelledby="today-act">
      <div className="rounded-lg border border-gold/30 bg-gold/[0.04] px-6 py-5 lg:px-7 lg:py-6">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2.5px] text-gold/85">
          {t("prayers.today.hourCallsFor")}
        </p>

        {/* The rule's name IS this section's heading, so the visible
            hierarchy and the accessibility tree say the same thing. It
            renders in Lora 700 from the unlayered h1..h6 rule in
            globals.css, which is the face this title wants anyway.

            NBSP before the hour resolves: the box keeps its height, so
            nothing below it moves when the real title lands. */}
        <h2
          id="today-act"
          className="mt-1.5 text-title leading-[1.1] tracking-[-0.01em] text-paper"
        >
          {ready ? t(rule.titleKey) : NBSP}
        </h2>

        {ready ? (
          <p className="mt-2 font-serif text-lede leading-snug text-paper/75">
            {greetingLine}
          </p>
        ) : (
          <Skeleton weight="faint" className="mt-2 h-[27px] w-[62%]" />
        )}

        {ready && prayedToday && (
          <p className="mt-1.5 font-sans text-detail text-paper/60">
            {t("prayers.today.alreadyPrayed", { label: t(rule.labelKey) })}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* The pill is the link, not the whole band: a full-bleed bar
              across a 750px column is the tell of a stretched phone card. */}
          <Link
            href={rule.href}
            className="tap-press inline-flex w-full items-center justify-center gap-2 rounded-pill bg-gold px-7 py-3 font-sans text-ui font-semibold text-night shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)] transition-colors duration-200 hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4 sm:w-auto"
          >
            <span>{t("today.prayNow.begin")}</span>
            <span aria-hidden>{"→"}</span>
          </Link>

          {minutes != null && (
            <span className="font-sans text-caption tabular-nums text-paper/60">
              {t("today.minRead", { count: minutes })}
            </span>
          )}
        </div>

        {/* Still hidden until there is something to show: an empty row on a
            reader's first morning would be fourteen reproaches. */}
        {prayedAny && strand && rhythm ? (
          <RhythmRow
            className="mt-5 border-t border-gold/15 pt-4"
            days={strand.rhythm}
            todayKey={rhythm.dayKey}
            label={t("prayers.today.rhythmMerged")}
          />
        ) : null}
      </div>
    </section>
  );
}
