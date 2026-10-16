"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRuleMeta } from "@/lib/prayers/rules";
import { ruleIdForHour, type HourRuleId } from "@/lib/prayers/ruleForHour";
import { PRAYER_EVENT } from "@/lib/prayers/storage";
import { isKept } from "@/lib/rhythm/marks";
import { todayKey } from "@/lib/rhythm/dayKey";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * "Pray" on the mobile Today shell: the day's prayers as one row you swipe,
 * the one the hour calls for first.
 *
 * Until 1.7 this was two stacked cards: Pray now (the Morning or Evening
 * rule, by the hour) and the Prayer Rope Anthem. On 2026-10-07 the owner
 * marked the layout row that shows the day's prayers in order with the
 * current one first, and on 2026-10-15 he picked this Today ("B"). So the
 * first card is still Pray now, in the same look with its Begin pill, and the
 * rest of the day's rule follows it in the anthem card's quieter look: Midday,
 * Evening and Before sleep in the morning; Before sleep in the evening, then
 * any earlier prayer already said today. The Anthem closes the row.
 *
 * A prayer already said today carries a quiet "Prayed today" (his mark of
 * 2026-10-07: a done sign on what keeps the day, never a count or a score).
 *
 * The file keeps its old name because lib/prayers/__tests__/ruleForHour.test.ts
 * reads it by path: the hour is asked of ruleIdForHour, never compared here.
 */

type DayRule = "morning" | "midday" | "evening" | "before-sleep";

/** The day's rule in the order of the day. */
const DAY: readonly DayRule[] = ["morning", "midday", "evening", "before-sleep"];

/** The cards after the one the hour calls for, and the earlier ones kept. */
export function railOrder(now: HourRuleId, kept: (id: DayRule) => boolean): DayRule[] {
  const at = DAY.indexOf(now);
  const after = DAY.slice(at + 1);
  const before = DAY.slice(0, at).filter(kept);
  return [now, ...after, ...before];
}

function useKeptToday(): (id: DayRule) => boolean {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(PRAYER_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(PRAYER_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  void version; // re-read the marks after a prayer is kept, here or elsewhere
  const day = todayKey();
  return (id) => isKept(id, day);
}

export function PrayRail({ className }: { className?: string }) {
  const { t } = useTranslate();
  // The clock is client-only: a server render bakes the build's hour into
  // the Android export. The row keeps its place and shows its words once
  // the hour is known, so an evening reader never sees "Morning" flash by.
  const [ruleId, setRuleId] = useState<HourRuleId | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate, the same as TodayHourRule's. */
  useEffect(() => {
    setRuleId(ruleIdForHour(new Date().getHours()));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const kept = useKeptToday();
  const now: HourRuleId = ruleId ?? "morning";
  const order = railOrder(now, kept);

  const titleOf = (id: DayRule) =>
    id === "morning"
      ? t("today.prayNow.morningFallback")
      : id === "evening"
        ? t("today.prayNow.eveningFallback")
        : t(`prayers.rule.${id}.title`);
  const minutesOf = (id: DayRule) => getRuleMeta(id)?.estimatedMinutes;
  const hrefOf = (id: DayRule) => getRuleMeta(id)?.href ?? `/prayers/${id}`;
  const night = (id: DayRule) => id === "evening" || id === "before-sleep";

  return (
    <section aria-labelledby="today-pray" className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p id="today-pray" className="font-sans text-caption text-paper/55">
          {t("streak.pray")}
        </p>
        <Link
          href="/prayers"
          className="inline-flex items-center gap-0.5 font-sans text-caption text-paper/55 transition-colors hover:text-paper"
        >
          {t("common.seeAll")}
          <ChevronRight size={13} />
        </Link>
      </div>

      <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {order.map((id, i) =>
          i === 0 ? (
            <li key={id} className="flex w-[292px] shrink-0 snap-start">
              {/* The hour's prayer: the soft gradient call-to-pray with its
                  Begin pill, the screen's first action. */}
              <Link
                href={hrefOf(id)}
                className="lm-feature press-card group relative flex w-full flex-col justify-between overflow-hidden rounded-[28px] p-5 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)]"
                style={{
                  // The upper-right glow is folded into this gradient rather
                  // than a blurred element: no filter in the scroll path (the
                  // Android WebView drops frames on those).
                  background:
                    "radial-gradient(115% 90% at 88% 12%, rgba(255,255,255,0.18) 0%, transparent 55%), linear-gradient(150deg, #34343a 0%, #232327 60%, #1a1a1d 100%)",
                }}
              >
                <div className="relative flex items-start gap-4">
                  <span
                    aria-hidden
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper/10 text-gold-pale ring-1 ring-inset ring-paper/15"
                  >
                    {night(id) ? <MoonIcon /> : <SunIcon />}
                  </span>
                  <div className={`min-w-0 flex-1 pt-0.5 ${ruleId ? "" : "invisible"}`}>
                    <p className="font-sans text-caption font-semibold text-gold-pale/80">
                      {t("today.prayNow.eyebrow")}
                    </p>
                    <h3 className="mt-1 font-serif text-title-sm leading-[1.15] text-paper">{titleOf(id)}</h3>
                    <Meta minutes={minutesOf(id)} done={kept(id)} />
                  </div>
                </div>
                <span className="relative mt-5 flex w-full items-center justify-center gap-1.5 rounded-pill bg-gold px-5 py-3 font-sans text-ui font-semibold text-night shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)] transition-colors group-hover:bg-gold-soft">
                  {t("today.prayNow.begin")}
                  <ChevronRight size={14} />
                </span>
              </Link>
            </li>
          ) : (
            <li key={id} className="flex w-[292px] shrink-0 snap-start">
              <Link
                href={hrefOf(id)}
                className={`press-card group flex w-full flex-col justify-between rounded-[28px] border border-paper/10 bg-paper/[0.04] p-5 transition-colors hover:bg-paper/[0.07] ${ruleId ? "" : "invisible"}`}
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper/10 text-paper/80 ring-1 ring-inset ring-paper/15"
                  >
                    {night(id) ? <MoonIcon /> : <SunIcon />}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="font-serif text-title-sm leading-[1.15] text-paper">{titleOf(id)}</h3>
                    <Meta minutes={minutesOf(id)} done={kept(id)} />
                  </div>
                </div>
                <span aria-hidden className="mt-5 flex justify-end text-paper/40">
                  <ChevronRight size={16} />
                </span>
              </Link>
            </li>
          ),
        )}

        {/* The Prayer Rope Anthem, the one piece of first-party audio we
            carry, closes the row. */}
        <li className="flex w-[292px] shrink-0 snap-start">
          <Link
            href="/prayers/anthem"
            className="group flex w-full items-center gap-3 rounded-[28px] border border-paper/10 bg-paper/[0.04] px-5 py-4 transition-colors hover:bg-paper/[0.07]"
          >
            <span
              aria-hidden
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-night shadow-[0_6px_16px_-6px_rgba(0,0,0,0.6)]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]" aria-hidden>
                <path d="M7 5.5v13l11-6.5L7 5.5z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-caption text-paper/50">
                {t("today.prayNow.anthemKicker")}
              </p>
              <h3 className="mt-0.5 font-serif text-ui leading-[1.2] text-paper transition-colors group-hover:text-gold">
                {t("today.prayNow.anthemTitle")}
              </h3>
              <p className="mt-1 font-sans text-caption leading-[1.45] text-paper/55">
                {t("today.prayNow.anthemBody")}
              </p>
            </div>
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** Minutes, and the quiet done mark once the prayer is said today. */
function Meta({ minutes, done }: { minutes?: number; done: boolean }) {
  const { t } = useTranslate();
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-caption text-paper/70">
      {minutes != null ? (
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon />
          <span>{t("today.minRead", { count: minutes })}</span>
        </span>
      ) : null}
      {done ? (
        <span className="inline-flex items-center gap-1.5 font-semibold text-paper/85">
          <span aria-hidden className="inline-grid h-4 w-4 place-items-center rounded-full bg-paper/15 ring-1 ring-inset ring-paper/30">
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.4 4.4L19 7.2" />
            </svg>
          </span>
          {t("shop.prayedToday")}
        </span>
      ) : null}
    </p>
  );
}

function SunIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChevronRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
