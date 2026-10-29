"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { todayRuleCard } from "@/lib/prayers/myRule";
import { ruleIdForHour, type HourRuleId } from "@/lib/prayers/ruleForHour";
import { PRAYER_EVENT } from "@/lib/prayers/storage";
import { useMyRule } from "@/lib/prayers/useMyRule";
import { sectionMedia } from "@/lib/media/sections";
import { isKept } from "@/lib/rhythm/marks";
import { todayKey } from "@/lib/rhythm/dayKey";
import { prayRail, type PrayCard } from "@/lib/today/prayRail";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * "Pray" on the mobile Today shell (1.8): the owner's pick B of round 13, "The
 * hour, large" (Homebase/boards/purify-master/r18/choose/13-pray.png). One
 * card for the prayer the hour calls for: "Now · 8 min", its name large, one
 * line of what it is, a white Begin, and the Pantocrator of Prayers as a soft
 * light at its side. Under it, the rest of the day's prayers as small tiles,
 * two to a row, the Prayer Rope Anthem last.
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

function useKeptToday(): (id: string) => boolean {
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

/** The Pantocrator of Prayers (lib/media/sections.ts), the light at the hour card's side. */
const LIGHT = sectionMedia("prayers");
/** The light fades out from its middle, so it has no edge on the card. */
const LIGHT_FADE = "radial-gradient(closest-side, #000 40%, transparent)";

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
  const { hour, tiles } = prayRail(now, ruleId ? todayRuleCard(mine, ruleId) : null, ruleId ? kept : () => false);
  const known = ruleId ? "" : "invisible";
  // An odd tile out takes the whole row, so the grid never ends on a gap.
  const wide = (i: number) => tiles.length % 2 === 1 && i === tiles.length - 1;

  return (
    <section aria-labelledby="today-pray" className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p id="today-pray" className="font-sans text-caption text-paper/55">
          {t("streak.pray")}
        </p>
        <Link
          href="/prayers"
          className="tap-press inline-flex items-center gap-0.5 font-sans text-caption text-paper/55 hover:text-paper"
        >
          {t("common.seeAll")}
          <ChevronRight size={13} />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-x-2 gap-y-2.5">
        <li className="col-span-2">
          {/* The hour's prayer, large: the screen's first action. */}
          <Link
            href={hour.href}
            data-pray-hour=""
            className="press-card relative block overflow-hidden rounded-[24px] border border-paper/12 bg-night-deep px-5 pb-[18px] pt-5"
          >
            {LIGHT ? (
              // eslint-disable-next-line @next/next/no-img-element -- the app's own section picture, a soft light (as PrayersHero draws it)
              <img
                src={LIGHT.src}
                alt=""
                aria-hidden
                decoding="async"
                className="pointer-events-none absolute -end-[30px] -top-5 h-[200px] w-[190px] object-cover opacity-[0.32]"
                style={{ maskImage: LIGHT_FADE, WebkitMaskImage: LIGHT_FADE }}
              />
            ) : null}
            <div className={cn("relative", known)}>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-caption font-semibold text-paper/60">
                <span>
                  {hour.minutes ? `${t("prayers.timeline.now")} · ${t("today.minRead", { count: hour.minutes })}` : t("prayers.timeline.now")}
                </span>
                {hour.done ? <Prayed /> : null}
              </p>
              <h3 className="mt-1 font-heading text-title font-bold leading-[1.1] text-paper">{t(hour.titleKey)}</h3>
              <p className="mt-1.5 max-w-[12.5rem] font-sans text-detail leading-snug text-paper/60">{t(hour.lineKey)}</p>
              <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-paper px-[18px] font-sans text-ui font-semibold text-night">
                {t("today.prayNow.begin")}
                <ArrowRight />
              </span>
            </div>
          </Link>
        </li>

        {tiles.map((tile, i) => (
          <li key={tile.key} className={cn("flex", wide(i) && "col-span-2")}>
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
    <Link
      href={tile.href}
      className={cn(
        "press-card flex w-full flex-col justify-center rounded-[14px] border border-paper/10 px-3 py-2.5 hover:bg-paper/[0.04]",
        hidden && "invisible",
      )}
    >
      <span className="font-heading text-ui font-semibold leading-tight text-paper">{t(tile.titleKey)}</span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-caption text-paper/50">
        {tile.subKey ? <span>{t(tile.subKey)}</span> : tile.minutes != null ? <span>{t("today.minRead", { count: tile.minutes })}</span> : null}
        {tile.done ? <Prayed /> : null}
      </span>
    </Link>
  );
}

/** The quiet done mark once the prayer is said today. */
function Prayed() {
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

function ArrowRight() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ChevronRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
