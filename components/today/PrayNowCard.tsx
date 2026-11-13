"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { todayRuleCard } from "@/lib/prayers/myRule";
import { ruleIdForHour, type HourRuleId } from "@/lib/prayers/ruleForHour";
import { PRAYER_EVENT } from "@/lib/prayers/storage";
import { useMyRule } from "@/lib/prayers/useMyRule";
import { isKept } from "@/lib/rhythm/marks";
import { todayKey } from "@/lib/rhythm/dayKey";
import { prayRail, type PrayCard } from "@/lib/today/prayRail";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * "Pray" on the mobile Today shell. The prayer the hour calls for leads the
 * screen from the day's lead now, with its one white Begin
 * (components/today/GreetingHeader.tsx; 1.9, the fifteen screens). Here, the
 * rest of the day's prayers as rows in one tray, a name, one line and the
 * chevron, the Prayer Rope Anthem last. It was the hour's card with the
 * Pantocrator's light and tiles two to a row (1.8, the owner's pick B of
 * round 13).
 *
 * Which prayers, and in what order, is lib/today/prayRail.ts: the same ones
 * the row of cards showed in 1.7 (the owner's layout of 2026-10-07 and his
 * Today "B" of 2026-10-15), nothing added. The reader's own rule leads when it
 * has the part the hour calls for (1.7, note 17), and then the day's rule is
 * the first tile. A prayer already said today carries a quiet "Prayed today"
 * (his mark of 2026-10-07: a done sign on what keeps the day, never a count
 * or a score).
 *
 * The file keeps its old name because lib/prayers/__tests__/ruleForHour.test.ts
 * reads it by path: the hour is asked of ruleIdForHour, never compared here.
 */

/** Whether a prayer is kept today on this device; re-read when one is kept, here or elsewhere. */
export function useKeptToday(): (id: string) => boolean {
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
  // the Android export. The card keeps its place and shows its words once
  // the hour is known, so an evening reader never sees "Morning" flash by.
  const [ruleId, setRuleId] = useState<HourRuleId | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate, the same as TodayHourRule's. */
  useEffect(() => {
    setRuleId(ruleIdForHour(new Date().getHours()));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const kept = useKeptToday();
  const mine = useMyRule();
  const now: HourRuleId = ruleId ?? "morning";
  // The marks are the device's too: none until the hour is known, so the
  // first drawing is the server's.
  const { tiles } = prayRail(now, ruleId ? todayRuleCard(mine, ruleId) : null, ruleId ? kept : () => false);

  return (
    <section aria-labelledby="today-pray" className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p id="today-pray" className="font-sans text-caption text-paper/55">
          {t("streak.pray")}
        </p>
        <Link
          href="/prayers"
          // A line of words, 44 to the touch (.hit-44): the heading beside it taps nothing.
          className="hit-44 tap-press inline-flex items-center gap-0.5 font-sans text-caption text-paper/55 hover:text-paper"
        >
          {t("common.seeAll")}
          <ChevronRight size={13} />
        </Link>
      </div>

      <ul className="theology-tray overflow-hidden rounded-[20px]">
        {tiles.map((tile, i) => (
          <li key={tile.key} className={cn(i > 0 && "border-t border-paper/10")}>
            <Tile tile={tile} hidden={tile.key !== "anthem" && !ruleId} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One of the rest of the day's prayers: its name, its minutes or what it is, and the done mark. */
function Tile({ tile, hidden }: { tile: PrayCard; hidden: boolean }) {
  const { t } = useTranslate();
  return (
    <Link href={tile.href} className={cn("tap-press flex min-h-[64px] w-full items-center gap-3 px-4 py-3 active:bg-paper/[0.04]", hidden && "invisible")}>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-lede font-semibold leading-[25px] text-paper">{t(tile.titleKey)}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-ui leading-5 text-paper/70">
          {tile.subKey ? <span>{t(tile.subKey)}</span> : tile.minutes != null ? <span>{t("today.minRead", { count: tile.minutes })}</span> : null}
          {tile.done ? <Prayed /> : null}
        </span>
      </span>
      <span className="shrink-0 text-paper/55">
        <ChevronRight size={18} />
      </span>
    </Link>
  );
}

/** The quiet done mark once the prayer is said today (Today's lead and its rows). */
export function Prayed() {
  const { t } = useTranslate();
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-paper/85">
      <span aria-hidden className="inline-grid h-4 w-4 place-items-center rounded-full bg-paper/15 ring-1 ring-inset ring-paper/30">
        <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.4 4.4L19 7.2" />
        </svg>
      </span>
      {t("shop.prayedToday")}
    </span>
  );
}

function ChevronRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
