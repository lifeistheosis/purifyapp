"use client";

import { useCallback, useId, useMemo, useState } from "react";
import Link from "next/link";

import { FAST_META } from "@/components/calendar/fastMeta";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Track } from "@/components/settings/LitPanel";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { cn } from "@/lib/cn";
import {
  fastingStatus,
  type CalStyle,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { useFastCheckins, dayKey, isFastingDay } from "@/lib/fasting/tracker";
import { type CheckinStatus, localDayToUtcNoon } from "@/lib/fasting/streak";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { fastNotAllowedKey } from "@/lib/calendar/fastFoods";

/**
 * Today's rule for a local calendar day, read in the frame fastingStatus
 * expects, in the reader's reckoning.
 *
 * The style is not optional. Without it an Old (Julian) Calendar reader was
 * shown the New Calendar rule here while Today and /prayers/today, which both
 * go through useChurchDay, showed them theirs. Two screens, two different
 * fasts, the same second. That is precisely the drift
 * lib/calendar/useChurchDay.ts was created to end. The rule takes the civil
 * day and moves only its fixed dates (2026-10-29: handing it a day already
 * moved back 13 days put the weekly fast on Tuesday and Thursday).
 */
const ruleFor = (d: Date, style: CalStyle) =>
  fastingStatus(localDayToUtcNoon(d), style);

/**
 * The fasting tracker: today's rule, a gentle check-in, the days kept, and a
 * short history of the recent fasting days. Deliberately "kept, not tracked":
 * companion tone, forgives today until the day is out, counts a partial
 * keeping, and never scolds. Marks are local-first (lib/fasting); Plus
 * carries them across devices.
 *
 * Redrawn for build 95 (note 3, the owner on 2026-11-13: "the fast is
 * clearly outdated"), in the look he approved that day, from the house's own
 * parts and nothing new:
 *
 *   the opening     as a chapter opens (components/saints/WorkHead.tsx): the
 *                   mark, the small line, the title, the short rule.
 *   today           the one thing that leads, on the night (the Nativity
 *                   card's own ground, dark on every palette), named with
 *                   the calendar's own mark for the day
 *                   (components/calendar/fastMeta.tsx).
 *   the mark        one switch of three, the house's carved track
 *                   (components/settings/LitPanel.tsx, Track). It was three
 *                   outlined pills, and three more on every recent day:
 *                   forty-eight on the screen.
 *   the count       two quiet lines, a number and its sentence each. They
 *                   were two bordered tiles of uneven height, a 0 in each,
 *                   and the first thing a new reader saw.
 *   recent days     rows in one tray (.theology-tray), each a day, its fast
 *                   and its mark; a tap opens the same switch under it.
 *
 * Every word is the calendar's or the page's own as it was. No mark wears a
 * colour: Kept, In part and Broke are lit alike, so none reads as a verdict.
 */

const STATUS_KEY: Record<CheckinStatus, string> = {
  kept: "fasting.status.kept",
  partial: "fasting.status.partial",
  broken: "fasting.status.broken",
};
const ORDER: readonly CheckinStatus[] = ["kept", "partial", "broken"];

/** The calendar's own mark for a kind of day, in its own tone: never the tone alone, always beside the day's name. */
function FastGlyph({ kind, size }: { kind: FastKind; size: number }) {
  const { Icon, rgb } = FAST_META[kind];
  if (!Icon) return null;
  return <Icon aria-hidden size={size} className="shrink-0" style={{ color: `rgb(${rgb})` }} />;
}

/**
 * Kept, In part, Broke: one switch, one of them lit, or none. The lit one
 * tapped again takes the mark off, as it always has.
 */
function MarkSwitch({ value, onSet, label }: { value?: CheckinStatus; onSet: (s: CheckinStatus) => void; label: string }) {
  const { t } = useTranslate();
  return <Track value={value ?? null} options={ORDER.map((s) => ({ value: s, label: t(STATUS_KEY[s]) }))} onChange={onSet} label={label} />;
}

export function FastingTrackerClient() {
  const { locale, t, tn } = useTranslate();
  const [style] = useCalendarStyleDefault();
  // useToday() is the tick, not the value: it re-fires at local midnight and
  // on visibilitychange/focus. The previous `useMemo(() => new Date(), [])`
  // froze at mount, so the native app left open overnight kept showing
  // yesterday's rule and checked yesterday's box. The wall-clock Date is
  // rebuilt on each tick because everything below (dayKey, the `recent`
  // cursor) works in local getters; converting the whole file to the UTC-noon
  // frame would be a wider change than this bug warrants.
  // useToday() returns the reader's local day in the UTC-noon frame, so it is
  // read back with UTC getters (see lib/rhythm/dayKey.ts for why local getters
  // on that frame are wrong past UTC+12) and rebuilt as the local-midnight
  // wall-clock Date the rest of this file works in.
  const tick = useToday();
  const today = useMemo(
    () =>
      tick
        ? new Date(tick.getUTCFullYear(), tick.getUTCMonth(), tick.getUTCDate())
        : new Date(),
    [tick],
  );
  const kindOf = useCallback((d: Date) => ruleFor(d, style).kind, [style]);
  const { byDay, streak, summary, mark, clear } = useFastCheckins(kindOf, today);
  // Every day kept, whole or in part: the number on the second card, and what its line is counted by.
  const keptInAll = summary.kept + summary.partial;

  const todayKey = dayKey(today);
  const todayFast = ruleFor(today, style);
  const todayIsFast = isFastingDay(todayFast.kind);
  const todayMark = byDay.get(todayKey)?.status;

  // The last stretch of fasting days (most recent first), for the history list.
  const recent = useMemo(() => {
    const out: { key: string; date: Date; kind: FastKind; ruleId: string }[] = [];
    // Stepped on UTC dates at noon for the same reason computeStreak is: a
    // local setDate walk can skip or repeat a day across a DST boundary, and
    // this list and the streak must agree on which days existed. `local` is
    // the wall-clock Date the rest of this file works in.
    const cursor = localDayToUtcNoon(today);
    for (let i = 0; i < 60 && out.length < 16; i++) {
      const local = new Date(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate());
      const fs = ruleFor(local, style);
      if (isFastingDay(fs.kind)) {
        out.push({ key: dayKey(local), date: local, kind: fs.kind, ruleId: fs.ruleId });
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return out;
    // recompute only when the day rolls over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const setDay = (key: string, kind: FastKind, s: CheckinStatus) => {
    if (byDay.get(key)?.status === s) clear(key);
    else mark(key, s, kind);
  };

  const fmtDay = (d: Date) =>
    d.toLocaleDateString(dateLocale(locale), { weekday: "short", month: "short", day: "numeric" });

  // The recent days whose switch is open. Each opens and shuts on its own:
  // were one to shut as the next opened, the row under the finger would
  // move up by the height of the switch above it.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (key: string) =>
    setOpened((was) => {
      const next = new Set(was);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const ids = useId();
  const todayLabel = t(`calendar.fast.${todayFast.ruleId}.label`);
  const notAllowed = fastNotAllowedKey(todayFast.kind);

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[620px]">
        {/* The opening, as a chapter opens: the mark, the small line, the title, the short rule. */}
        <header className="text-center">
          <PurifyMark aria-hidden size={22} className="page-open-sub mx-auto block text-paper" />
          <p className="page-open-sub mt-3 font-sans text-detail font-semibold text-paper/60">{t("today.fastEyebrow")}</p>
          <h1 className="page-open-title mx-auto mt-1.5 max-w-[14ch] text-balance font-heading text-[34px] font-normal leading-[1.08] tracking-[-0.3px] text-paper md:max-w-none md:text-[44px]">
            {t("fasting.h1")}
          </h1>
          <span aria-hidden className="page-open-rule mx-auto mt-5 block h-px w-7 bg-paper/25" />
        </header>

        {/* Today: the one thing that leads, on the night. */}
        <section
          aria-labelledby={`${ids}-today`}
          data-fast-today=""
          className="dark-island reveal-rise relative mt-7 overflow-hidden rounded-[22px] border border-paper/12 bg-night-deep px-5 pb-5 pt-5"
          style={{ animationDelay: "120ms" }}
        >
          <p className="font-sans text-caption font-semibold text-paper/60">{t("calendar.todayLink")}</p>
          <h2 id={`${ids}-today`} className="mt-1.5 flex items-center gap-2.5 font-heading text-[26px] font-normal leading-[1.15] text-paper">
            <FastGlyph kind={todayFast.kind} size={22} />
            <span className="min-w-0">{todayLabel}</span>
          </h2>
          <p className="mt-2.5 font-sans text-ui leading-relaxed text-paper/75">{t(`calendar.fast.${todayFast.ruleId}.rule`)}</p>
          {/* What the day keeps from, beside what it allows (1.7). */}
          {notAllowed ? <p className="mt-0.5 font-sans text-ui leading-relaxed text-paper/75">{t(notAllowed)}</p> : null}
          {todayIsFast ? (
            <>
              <div data-fast-mark="today" className="mt-2">
                <MarkSwitch value={todayMark} onSet={(s) => setDay(todayKey, todayFast.kind, s)} label={`${t("calendar.todayLink")}: ${todayLabel}`} />
              </div>
              {/* The pastoral line, in the house's italic: it stands on its own type, with no box and no rule beside it. */}
              <p data-fast-pastoral="" className="mt-4 font-serif text-detail italic leading-[1.6] text-paper/70">
                {t("fasting.pastoralNote")}
              </p>
            </>
          ) : (
            <p className="mt-4 font-serif text-detail italic leading-[1.6] text-paper/70">{t("fasting.noFastToday")}</p>
          )}
        </section>

        {/* The count: two quiet lines, a number and its sentence each, with a
            hairline between. Both lines of each stand in the one place and
            only one is seen, so the line keeps the taller one's height: it
            changes when a day is marked, and a line that changed height with
            it moved every row under it (fresh eyes M5). */}
        <div data-fast-count="" className={cn("reveal-rise mt-5 divide-y px-1", keptInAll === 0 ? "divide-transparent" : "divide-paper/10")} style={{ animationDelay: "180ms" }}>
          <p className="flex items-baseline gap-3 py-3">
            <span className={cn("w-9 shrink-0 text-center font-heading text-title leading-none tabular-nums", streak === 0 ? "text-paper/60" : "text-paper")}>{streak}</span>
            <span className="grid min-w-0 flex-1 font-sans text-detail leading-snug text-paper/70">
              <span aria-hidden={streak !== 0} className={`col-start-1 row-start-1 ${streak === 0 ? "" : "invisible"}`}>
                {t("fasting.streakNone")}
              </span>
              <span aria-hidden={streak === 0} className={`col-start-1 row-start-1 ${streak === 0 ? "invisible" : ""}`}>
                {tn("fasting.streakKept", Math.max(streak, 1))}
              </span>
            </span>
          </p>
          {/* The line is counted with its number (tn): it read "1 days kept in
              all." with one day marked, in every language (the gate's tap
              walk, 2026-11-11). "in part" joins it when a day is marked so. */}
          {/* With nothing kept yet the second line keeps its room and says
              nothing: a new reader meets one sentence, not a column of
              zeros, and nothing moves when the first day is marked. */}
          <p aria-hidden={keptInAll === 0} className={cn("flex items-baseline gap-3 py-3", keptInAll === 0 && "invisible")}>
            <span className="w-9 shrink-0 text-center font-heading text-title leading-none tabular-nums text-paper">{keptInAll}</span>
            <span className="grid min-w-0 flex-1 font-sans text-detail leading-snug text-paper/70">
              <span aria-hidden={Boolean(summary.partial)} className={`col-start-1 row-start-1 ${summary.partial ? "invisible" : ""}`}>
                {tn("fasting.keptInAll", keptInAll)}
              </span>
              <span aria-hidden={!summary.partial} className={`col-start-1 row-start-1 ${summary.partial ? "" : "invisible"}`}>
                {tn("fasting.keptInAllPartial", keptInAll, { partial: Math.max(summary.partial, 1) })}
              </span>
            </span>
          </p>
        </div>

        {/* Recent days: rows in one tray. A day, its fast and its mark; a tap opens the switch under it. */}
        <h2 className="reveal-rise mt-8 font-serif text-[20px] font-semibold leading-[1.25] text-paper" style={{ animationDelay: "240ms" }}>
          {t("fasting.recentDays")}
        </h2>
        <ul data-fast-days="" className="theology-tray reveal-rise mt-3 overflow-hidden rounded-[20px] px-1.5 py-1" style={{ animationDelay: "280ms" }}>
          {recent.map((r) => {
            const m = byDay.get(r.key)?.status;
            const isToday = r.key === todayKey;
            const open = opened.has(r.key);
            const day = isToday ? t("calendar.todayLink") : fmtDay(r.date);
            const label = t(`calendar.fast.${r.ruleId}.label`);
            return (
              <li key={r.key} className="theology-rule relative">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`${ids}-${r.key}`}
                  onClick={() => toggle(r.key)}
                  data-fast-day={r.key}
                  className="theology-row flex min-h-[56px] w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-start"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-ui font-semibold text-paper">{day}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 font-sans text-caption text-paper/60">
                      <FastGlyph kind={r.kind} size={13} />
                      <span className="min-w-0">{label}</span>
                    </span>
                  </span>
                  {m ? (
                    <span data-fast-day-mark="" className="shrink-0 font-sans text-detail font-semibold text-paper/85">
                      {t(STATUS_KEY[m])}
                    </span>
                  ) : null}
                  <ChevronDown aria-hidden size={14} className={cn("shrink-0 text-paper/50 motion-safe:transition-transform motion-safe:duration-300", open && "rotate-180")} />
                </button>
                {/* The switch opens under its day on the house curve, and is
                    out of reach of a finger, a keyboard and a screen reader
                    while it is shut. */}
                <div
                  id={`${ids}-${r.key}`}
                  inert={!open}
                  className={cn("grid ease-[var(--ease-house)] motion-safe:transition-[grid-template-rows] motion-safe:duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                >
                  <div className={cn("min-h-0 overflow-hidden", !open && "invisible")}>
                    <div className="px-2.5 pb-3">
                      <MarkSwitch value={m} onSet={(s) => setDay(r.key, r.kind, s)} label={`${day}: ${label}`} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* 45, a share the faint-text rules draw at each palette's own safe
            strength (app/globals.css): at 40 this line was 2.31:1 on Light
            and 2.86:1 on Candlelight (fresh eyes M5). The way to the
            calendar is a line of its own, 44px to the touch, not a word
            inside the sentence. */}
        <p
          className="reveal-rise mt-8 font-sans text-caption leading-[1.6] text-paper/45"
          style={{ animationDelay: "340ms" }}
        >
          {t("fasting.deviceNote")}
        </p>
        <Link href="/calendar" data-fast-calendar="" className="tap-press mt-1 inline-flex min-h-11 items-center font-sans text-detail font-semibold text-paper/80 underline underline-offset-4 hover:text-paper">
          {t("fasting.seeFullCalendar")}
        </Link>
      </div>
    </section>
  );
}
