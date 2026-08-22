"use client";

import { useCallback, useMemo } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import Link from "next/link";
import {
  fastingStatus,
  shiftForStyle,
  type CalStyle,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { useFastCheckins, dayKey, isFastingDay } from "@/lib/fasting/tracker";
import { type CheckinStatus, localDayToUtcNoon } from "@/lib/fasting/streak";

/**
 * Today's rule for a local calendar day, read in the frame fastingStatus
 * expects, and SHIFTED for the reader's reckoning.
 *
 * The shift is not optional. Without it an Old (Julian) Calendar reader was
 * shown the New Calendar rule here while Today and /prayers/today, which both
 * go through useChurchDay, showed them the shifted one. Two screens, two
 * different fasts, the same second. That is precisely the drift
 * lib/calendar/useChurchDay.ts was created to end, and this file was the one
 * surface still outside it.
 */
const ruleFor = (d: Date, style: CalStyle) =>
  fastingStatus(shiftForStyle(localDayToUtcNoon(d), style));

/**
 * The fasting tracker: today's rule, a gentle check-in, the current streak,
 * and a short history of the days recently kept. Deliberately "kept, not
 * tracked": companion tone, forgives today until the day is out, counts a
 * partial keeping, and never scolds. Marks are local-first (lib/fasting);
 * Plus carries them across devices.
 */

const DOT: Record<FastKind, string> = {
  strict: "bg-crimson",
  "wine-oil": "bg-gold",
  fish: "bg-sage",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};

const STATUS_KEY: Record<CheckinStatus, string> = {
  kept: "fasting.status.kept",
  partial: "fasting.status.partial",
  broken: "fasting.status.broken",
};

function CheckControl({
  value,
  onSet,
  size = "sm",
}: {
  value?: CheckinStatus;
  onSet: (s: CheckinStatus) => void;
  size?: "lg" | "sm";
}) {
  const { t } = useTranslate();
  const order: CheckinStatus[] = ["kept", "partial", "broken"];
  const active: Record<CheckinStatus, string> = {
    kept: "border-emerald-400/60 bg-emerald-400/15 text-emerald-200",
    partial: "border-gold/60 bg-gold/15 text-gold-pale",
    broken: "border-crimson/50 bg-crimson/10 text-crimson/80",
  };
  const pad = size === "lg" ? "px-4 py-2.5 text-ui" : "px-2.5 py-1 text-caption";
  return (
    <div className="flex gap-2">
      {order.map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onSet(s)}
            aria-pressed={on}
            className={`rounded-pill border font-sans font-semibold transition-colors ${pad} ${
              on
                ? active[s]
                : "border-paper/15 bg-paper/[0.03] text-paper/55 hover:bg-paper/[0.07]"
            }`}
          >
            {t(STATUS_KEY[s])}
          </button>
        );
      })}
    </div>
  );
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
    d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[620px]">
        {/* Masthead */}
        <div className="reveal-rise" style={{ animationDelay: "40ms" }}>
          <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
            {t("today.fastEyebrow")}
          </p>
          <h1 className="mt-2 font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.02em] text-paper">
            {t("fasting.h1")}
          </h1>
        </div>

        {/* Streak / summary */}
        <div
          className="reveal-rise mt-7 flex items-stretch gap-3"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex-1 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5">
            <p className="font-display-serif text-display-sm leading-none text-gold-pale">
              {streak}
            </p>
            <p className="mt-2 font-sans text-caption text-paper/60">
              {streak === 0
                ? t("fasting.streakNone")
                : tn("fasting.streakKept", streak)}
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <p className="font-display-serif text-title leading-none text-paper">
              {summary.kept + summary.partial}
            </p>
            <p className="mt-2 font-sans text-caption text-paper/60">
              {summary.partial
                ? t("fasting.keptInAllPartial", { partial: summary.partial })
                : t("fasting.keptInAll")}
            </p>
          </div>
        </div>

        {/* Today */}
        <div
          className="reveal-rise mt-4 rounded-2xl border border-paper/12 bg-paper/[0.04] p-5"
          style={{ animationDelay: "180ms" }}
        >
          <p className="font-sans text-caption text-paper/55">{t("calendar.todayLink")}</p>
          <h2 className="mt-1 flex items-center gap-2 font-serif text-lede leading-tight text-paper">
            <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[todayFast.kind]}`} />
            {t(`calendar.fast.${todayFast.ruleId}.label`)}
          </h2>
          <p className="mt-2 font-sans text-ui leading-relaxed text-paper/70">
            {t(`calendar.fast.${todayFast.ruleId}.rule`)}
          </p>
          {todayIsFast ? (
            <div className="mt-4">
              <CheckControl
                size="lg"
                value={todayMark}
                onSet={(s) => setDay(todayKey, todayFast.kind, s)}
              />
              <p className="mt-3 font-sans text-caption text-paper/45">
                {t("fasting.pastoralNote")}
              </p>
            </div>
          ) : (
            <p className="mt-3 font-sans text-caption text-paper/45">
              {t("fasting.noFastToday")}
            </p>
          )}
        </div>

        {/* Recent history */}
        <p
          className="reveal-rise mt-8 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45"
          style={{ animationDelay: "240ms" }}
        >
          {t("fasting.recentDays")}
        </p>
        <ul className="reveal-rise mt-3 space-y-2" style={{ animationDelay: "280ms" }}>
          {recent.map((r) => {
            const m = byDay.get(r.key)?.status;
            const isToday = r.key === todayKey;
            return (
              <li
                key={r.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-paper/8 bg-paper/[0.02] px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-sans text-ui text-paper/85">
                    {isToday ? t("calendar.todayLink") : fmtDay(r.date)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-sans text-caption text-paper/50">
                    <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[r.kind]}`} />
                    {t(`calendar.fast.${r.ruleId}.label`)}
                  </p>
                </div>
                <CheckControl value={m} onSet={(s) => setDay(r.key, r.kind, s)} />
              </li>
            );
          })}
        </ul>

        <p
          className="reveal-rise mt-8 font-sans text-caption leading-[1.6] text-paper/40"
          style={{ animationDelay: "340ms" }}
        >
          {t("fasting.deviceNote")}{" "}
          <Link href="/calendar" className="text-gold-pale/70 underline-offset-2 hover:underline">
            {t("fasting.seeFullCalendar")}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
