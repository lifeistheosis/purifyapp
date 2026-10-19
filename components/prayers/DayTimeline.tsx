"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArtPlate } from "@/components/prayers/ArtPlate";
import { TodayHeading } from "@/components/prayers/TodayHeading";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { dayTimeline, hoursTimeline, litNow, type DayPart, type TimelineSlot } from "@/lib/prayers/dayTimeline";
import { PRAYER_EVENT } from "@/lib/prayers/storage";
import { isKept } from "@/lib/rhythm/marks";

/**
 * The day as a timeline (1.7, the owner's note 16): the Hours, or the whole
 * day's prayers, down one quiet line, the one the clock is in lit.
 *
 * The line is the timeline itself, a hairline with a small round mark at each
 * prayer, not a stripe on a box. The lit prayer's mark is filled, its name is
 * followed by the word for now, and it carries a Begin; the others are a step
 * back, with nothing crossed out and nothing red. A prayer kept today says so
 * quietly, never with a count.
 *
 * The clock is read after mount (lib/prayers/dayTimeline.ts says why): until
 * then nothing is lit and every row reads as it will, so nothing moves when
 * the answer arrives.
 */
function subscribe(cb: () => void): () => void {
  window.addEventListener(PRAYER_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PRAYER_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Which of these were kept today, as one string so the snapshot is stable. */
function useKept(ids: string[]): Set<string> {
  const key = ids.join(" ");
  const raw = useSyncExternalStore(
    subscribe,
    () => key.split(" ").filter((id) => isKept(id)).join(" "),
    () => "",
  );
  return new Set(raw ? raw.split(" ") : []);
}

function useNow(): { hour: string; part: DayPart } | null {
  const [now, setNow] = useState<{ hour: string; part: DayPart } | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate, the TodayHourRule precedent: the clock is client-only, and a
     server render of it bakes the build hour into the Android export. */
  useEffect(() => {
    setNow(litNow(new Date()));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  return now;
}

export function DayTimeline({ variant, className }: { variant: "hours" | "day"; className?: string }) {
  const { t } = useTranslate();
  const now = useNow();

  if (variant === "hours") {
    const slots = hoursTimeline();
    return (
      <Rows slots={slots} lit={(s) => now?.hour === s.id} nowWord={t("prayers.hoursIndex.nowMark")} className={className} />
    );
  }

  const groups = dayTimeline();
  return (
    <div className={cn("space-y-7", className)}>
      {groups.map(({ part, slots }) => {
        const lit = now?.part === part;
        const label = `day-part-${part}`;
        return (
          <section key={part} aria-labelledby={label}>
            <TodayHeading id={label} level={3} className={cn("flex items-baseline gap-2", lit && "text-paper")}>
              {t(`prayers.timeline.part.${part}`)}
              {lit ? <span className="font-normal text-paper/65">{t("prayers.timeline.now")}</span> : null}
            </TodayHeading>
            <Rows slots={slots} lit={(s) => lit && s.id === slots[0].id} quiet={!lit && now !== null} className="mt-1" />
          </section>
        );
      })}
    </div>
  );
}

function Rows({
  slots,
  lit,
  nowWord,
  quiet = false,
  className,
}: {
  slots: TimelineSlot[];
  lit: (slot: TimelineSlot) => boolean;
  /** Said after the lit prayer's name. */
  nowWord?: string;
  /** A part of the day the clock is not in: a step back. */
  quiet?: boolean;
  className?: string;
}) {
  const { t, locale } = useTranslate();
  const kept = useKept(slots.map((s) => s.id));
  const time = new Intl.DateTimeFormat(dateLocale(locale), { hour: "numeric" });

  return (
    <ol className={cn("relative", className)}>
      {slots.map((slot, i) => {
        const on = lit(slot);
        const meta = [
          slot.hour !== undefined ? t("prayers.timeline.around", { time: time.format(new Date(2000, 0, 1, slot.hour)) }) : null,
          slot.minutes ? t("today.minRead", { count: slot.minutes }) : null,
        ].filter(Boolean);
        return (
          <li key={slot.id} className="relative ps-7">
            {/* The line, from the mark above to the mark below. */}
            <span
              aria-hidden
              className={cn(
                "absolute start-[7px] w-px bg-paper/15",
                i === 0 ? "top-[27px]" : "top-0",
                i === slots.length - 1 ? "h-[27px]" : "bottom-0",
                slots.length === 1 && "hidden",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "absolute start-[3px] top-[23px] size-[9px] rounded-full",
                on ? "bg-paper ring-4 ring-paper/15" : "bg-night ring-1 ring-inset ring-paper/40",
              )}
            />
            <Link
              href={slot.href}
              aria-current={on ? "time" : undefined}
              className={cn("press-card flex items-start gap-4 py-3", quiet && !on && "opacity-70")}
            >
              <ArtPlate id={slot.id} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col pt-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className={cn("font-serif text-lede font-semibold leading-tight", on ? "text-paper" : "text-paper/85")}>
                    {t(slot.titleKey)}
                  </span>
                  {on && nowWord ? <span className="font-sans text-caption font-semibold text-paper/70">{nowWord}</span> : null}
                </span>
                {meta.length ? <span className="mt-1 font-sans text-caption text-paper/55">{meta.join(" · ")}</span> : null}
                {kept.has(slot.id) ? (
                  <span className="mt-1 inline-flex items-center gap-1.5 font-sans text-caption font-semibold text-paper/80">
                    <Check size={13} className="shrink-0" />
                    {t("shop.prayedToday")}
                  </span>
                ) : null}
              </span>
              {on ? (
                <span className="mt-1 inline-flex min-h-9 shrink-0 items-center gap-1 self-center rounded-pill bg-paper px-3.5 font-sans text-caption font-semibold text-night">
                  {t("today.prayNow.begin")}
                  <ChevronRight size={13} className="shrink-0 rtl:-scale-x-100" />
                </span>
              ) : (
                <ChevronRight size={16} className="shrink-0 self-center text-paper/35 rtl:-scale-x-100" />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
