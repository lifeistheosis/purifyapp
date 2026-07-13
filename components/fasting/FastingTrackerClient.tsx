"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { fastingStatus, type FastKind } from "@/lib/calendar/orthodox";
import { useFastCheckins, dayKey, isFastingDay } from "@/lib/fasting/tracker";
import { type CheckinStatus, localDayToUtcNoon } from "@/lib/fasting/streak";

/** Today's rule for a local calendar day, read in the frame fastingStatus expects. */
const ruleFor = (d: Date) => fastingStatus(localDayToUtcNoon(d));

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

const STATUS_LABEL: Record<CheckinStatus, string> = {
  kept: "Kept",
  partial: "In part",
  broken: "Broke",
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
            {STATUS_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}

export function FastingTrackerClient() {
  const today = useMemo(() => new Date(), []);
  const kindOf = useCallback((d: Date) => ruleFor(d).kind, []);
  const { byDay, streak, summary, mark, clear } = useFastCheckins(kindOf, today);

  const todayKey = dayKey(today);
  const todayFast = ruleFor(today);
  const todayIsFast = isFastingDay(todayFast.kind);
  const todayMark = byDay.get(todayKey)?.status;

  // The last stretch of fasting days (most recent first), for the history list.
  const recent = useMemo(() => {
    const out: { key: string; date: Date; kind: FastKind; label: string }[] = [];
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (let i = 0; i < 60 && out.length < 16; i++) {
      const fs = ruleFor(cursor);
      if (isFastingDay(fs.kind)) {
        out.push({ key: dayKey(cursor), date: new Date(cursor), kind: fs.kind, label: fs.label });
      }
      cursor.setDate(cursor.getDate() - 1);
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
    d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[620px]">
        {/* Masthead */}
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
          The Fast
        </p>
        <h1 className="mt-2 font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.02em] text-paper">
          Keep the fast, day by day
        </h1>

        {/* Streak / summary */}
        <div className="mt-7 flex items-stretch gap-3">
          <div className="flex-1 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5">
            <p className="font-display-serif text-display-sm leading-none text-gold-pale">
              {streak}
            </p>
            <p className="mt-2 font-sans text-caption text-paper/60">
              {streak === 0
                ? "fasting days kept. Begin whenever you're ready."
                : streak === 1
                  ? "fasting day kept in a row."
                  : "fasting days kept in a row."}
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <p className="font-display-serif text-title leading-none text-paper">
              {summary.kept + summary.partial}
            </p>
            <p className="mt-2 font-sans text-caption text-paper/60">
              days kept in all{summary.partial ? `, ${summary.partial} in part` : ""}.
            </p>
          </div>
        </div>

        {/* Today */}
        <div className="mt-4 rounded-2xl border border-paper/12 bg-paper/[0.04] p-5">
          <p className="font-sans text-caption text-paper/55">Today</p>
          <h2 className="mt-1 flex items-center gap-2 font-serif text-lede leading-tight text-paper">
            <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[todayFast.kind]}`} />
            {todayFast.label}
          </h2>
          <p className="mt-2 font-sans text-ui leading-relaxed text-paper/70">
            {todayFast.rule}
          </p>
          {todayIsFast ? (
            <div className="mt-4">
              <CheckControl
                size="lg"
                value={todayMark}
                onSet={(s) => setDay(todayKey, todayFast.kind, s)}
              />
              <p className="mt-3 font-sans text-caption text-paper/45">
                Kept with your priest&rsquo;s blessing, and with room for the sick, the
                travelling, expecting mothers, and catechumens. This is a companion, not a rule.
              </p>
            </div>
          ) : (
            <p className="mt-3 font-sans text-caption text-paper/45">
              No fast today. Rest in it.
            </p>
          )}
        </div>

        {/* Recent history */}
        <p className="mt-8 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
          Recent fasting days
        </p>
        <ul className="mt-3 space-y-2">
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
                    {isToday ? "Today" : fmtDay(r.date)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-sans text-caption text-paper/50">
                    <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[r.kind]}`} />
                    {r.label}
                  </p>
                </div>
                <CheckControl value={m} onSet={(s) => setDay(r.key, r.kind, s)} />
              </li>
            );
          })}
        </ul>

        <p className="mt-8 font-sans text-caption leading-[1.6] text-paper/40">
          Your marks stay on this device. With Purify Plus they follow you to every
          device you sign in on. The whole fasting calendar is, and stays, free.{" "}
          <Link href="/calendar" className="text-gold-pale/70 underline-offset-2 hover:underline">
            See the full calendar
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
