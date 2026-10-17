"use client";

// The calendar on a phone (1.7.1).
//
// The owner, 2026-10-17: "optimize the calendar for mobile, because it just
// feels like it's a desktop version that barely got imported to mobile". It
// was the computer's page drawn narrow: a feast card the height of the
// screen, the day's readings as three tall boxes, then the month a whole
// screen down, with Prev, Today and Next as 19px words, and a tapped day's
// saints and fast another screen under that.
//
// On a phone it reads the way a phone's own calendar does, top to bottom:
//
//   the reckoning (New, Old) and Today, as one row of 44px controls;
//   the month, with its name, two round chevrons, and a grid of 48px days,
//     each a number with its fast and its feast marked under it; a sideways
//     swipe turns the month (useMonthSwipe.ts);
//   the marks explained, in one line under the grid;
//   the chosen day: its date, its fast, its saints and its readings, as the
//     Today tab's rows (components/mobile/IndexRows.tsx, ChurchTodayRail);
//   the count to Pascha, the two reckonings and the fasting note, and the
//     closing prayer.
//
// The computer keeps its own page (CalendarClient.tsx). This is the same
// day, the same month and the same answers, computed once in CalendarClient
// and handed in: nothing here looks a day up.
//
// Choosing a day, a month or a reckoning replaces the address rather than
// adding to it, so the phone's Back leaves the calendar, as it leaves every
// other page, and does not walk back through the days that were tapped.

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";

import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Cross } from "@/components/ui/icons/Cross";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { fastNotAllowedKey } from "@/lib/calendar/fastFoods";
import {
  formatLongDateDual,
  isoDay,
  type Commemoration,
  type FastingStatus,
  type MonthCell,
  type PaschaInfo,
  type ReadingRef,
  type ReadingsSource,
} from "@/lib/calendar/orthodox";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";

import { LEGEND, weekdayNames } from "./CalendarGrid";
import { GREEK_COLOPHON } from "./Colophon";
import { FAST_META } from "./fastMeta";
import StyleToggleLink from "./StyleToggleLink";
import { HOUSE_EASE, motionOn, useMonthSwipe } from "./useMonthSwipe";

type CalStyle = "new" | "old";

export type PhoneCalendarProps = {
  style: CalStyle;
  /** The address's `m` and `d`, kept when the reckoning changes. */
  mParam: string | null;
  dParam: string | null;
  /** The reader's own day, at UTC noon (lib/calendar/useToday.ts). */
  today: Date;
  year: number;
  month: number;
  selectedDay: Date;
  grid: MonthCell[];
  commemorations: Commemoration[];
  fast: FastingStatus;
  readings: ReadingRef[];
  ordinary: ReadingRef[];
  commemorationReadings: ReadingRef[];
  source: ReadingsSource | null;
  pascha: PaschaInfo;
};

/** Every address this screen writes names its reckoning, so a shared link
 * or a remembered preference can never turn the screen over under the
 * reader (the "stuck on old calendar" report, StyleToggleLink.tsx). */
function calendarHref(style: CalStyle, m?: string | null, d?: string | null): string {
  const q = new URLSearchParams();
  if (m) q.set("m", m);
  if (d) q.set("d", d);
  q.set("style", style);
  return `/calendar?${q.toString()}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A round 44px control: the month's chevrons. */
const ROUND =
  "tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-paper/12 text-paper/80 hover:border-paper/30 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

/** A row of the day's lists: the Today tab's row (ChurchTodayRail), 56px at least. */
const ROW = "flex min-h-14 items-center gap-3 px-4 py-3";

/** The small grey words over a list, as the Bible tab and Today set them. */
function ListLabel({ children }: { children: React.ReactNode }) {
  return (
    <p role="heading" aria-level={3} className="mb-2 px-1 font-sans text-caption text-paper/70">
      {children}
    </p>
  );
}

function RowChevron() {
  return <ChevronRight aria-hidden size={16} strokeWidth={2.2} className="shrink-0 text-paper/40 rtl:-scale-x-100" />;
}

/**
 * One day of the month: its number, and under it the day's fast and its
 * feast, as marks a thumb's width apart. The chosen day is filled, today
 * is ringed; a day that is both is filled. The colour of a fast always
 * comes with its own drawing, and the words for every mark are in the
 * link's name and in the line under the grid.
 */
const DayCell = memo(function DayCell({
  cell,
  href,
  selected,
  label,
}: {
  cell: MonthCell;
  href: string;
  selected: boolean;
  label: string;
}) {
  if (!cell.inMonth) return <div aria-hidden className="h-12" />;
  const meta = FAST_META[cell.fast];
  const FastIcon = meta.Icon;
  return (
    <Link
      href={href}
      replace
      scroll={false}
      // The month is on the device already; there is nothing to fetch ahead
      // for forty-two links of which one is tapped (CalendarCell.tsx).
      prefetch={false}
      draggable={false}
      aria-label={label}
      aria-current={cell.isToday ? "date" : selected ? "true" : undefined}
      className="group flex h-12 min-w-0 flex-col items-center rounded-xl pt-[3px] [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper"
    >
      <span
        className={cn(
          "grid h-[30px] w-[30px] place-items-center rounded-full font-sans text-ui leading-none tabular-nums motion-safe:transition-colors",
          selected
            ? "bg-paper font-semibold text-night"
            : cell.isToday
              ? "font-semibold text-paper ring-[1.5px] ring-inset ring-paper/70"
              : cell.hasFeast
                ? "rubric font-semibold group-hover:bg-paper/[0.07]"
                : "text-paper/85 group-hover:bg-paper/[0.07]",
        )}
      >
        {cell.day}
      </span>
      <span aria-hidden className="mt-[3px] flex h-3.5 items-center justify-center gap-[3px]">
        {FastIcon ? <FastIcon size={14} strokeWidth={1.9} style={{ color: `rgb(${meta.rgb})` }} /> : null}
        {cell.hasFeast ? <Cross size={14} strokeWidth={2.1} className="text-festal" /> : null}
      </span>
    </Link>
  );
});

/** The day's fast, set under its date: the register's own drawing on a
 * round of its colour, the rule, and what the day keeps from (1.7). */
function FastFact({ fast }: { fast: FastingStatus }) {
  const { t } = useTranslate();
  const meta = FAST_META[fast.kind];
  const Icon = meta.Icon;
  const not = fastNotAllowedKey(fast.kind);
  return (
    <div className="mt-4 flex items-start gap-3">
      {Icon ? (
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ color: `rgb(${meta.rgb})`, backgroundColor: `rgb(${meta.rgb} / 0.13)` }}
        >
          <Icon size={20} strokeWidth={1.7} />
        </span>
      ) : null}
      <div className={cn("min-w-0", Icon && "pt-0.5")}>
        <p className="font-sans text-ui font-semibold leading-snug text-paper">
          {t(`calendar.fast.${fast.ruleId}.label`)}
        </p>
        <p className="mt-0.5 font-sans text-detail leading-snug text-paper/70">
          {t(`calendar.fast.${fast.ruleId}.rule`)}
        </p>
        {not ? <p className="mt-0.5 font-sans text-detail leading-snug text-paper/70">{t(not)}</p> : null}
      </div>
    </div>
  );
}

/** A commemoration as a row: the saint's icon where the saint has a page,
 * the name, its line, and the way to the page. */
function CommemorationItem({ c, first }: { c: Commemoration; first: boolean }) {
  const { t } = useTranslate();
  const saint = c.saint ?? null;
  const body = (
    <>
      {saint?.iconUrl ? (
        <span className="relative h-14 w-[42px] shrink-0 overflow-hidden rounded-md bg-paper/[0.06] ring-1 ring-inset ring-paper/10">
          <Image src={saint.iconUrl} alt="" fill sizes="42px" className="object-cover object-top" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {c.kind === "feast" ? (
          <span className="mb-0.5 flex items-center gap-1.5 font-sans text-caption text-paper/70">
            <Cross aria-hidden size={13} strokeWidth={2.1} className="shrink-0 text-festal" />
            {t("calendar.legend.majorFeast")}
          </span>
        ) : null}
        <span className="block font-heading text-ui font-semibold leading-snug text-paper">{c.name}</span>
        {c.note ? <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/70">{c.note}</span> : null}
      </span>
      {saint ? <RowChevron /> : null}
    </>
  );
  return (
    <li className={first ? undefined : "border-t border-paper/[0.06]"}>
      {saint ? (
        <Link href={`/saints/${saint.slug}`} className={cn(ROW, "transition-colors active:bg-paper/[0.04]")}>
          {body}
        </Link>
      ) : (
        <div className={ROW}>{body}</div>
      )}
    </li>
  );
}

const KIND_KEY: Record<ReadingRef["kind"], string> = {
  epistle: "bible.kindEpistleLong",
  ot: "bible.kindOtLong",
  gospel: "bible.kindGospelLong",
};

export function PhoneCalendar(p: PhoneCalendarProps) {
  const { t, tn, locale } = useTranslate();
  const router = useRouter();
  const books = localBookNames(t);
  const dl = dateLocale(locale);
  const fmt = useMemo(
    () => ({
      monthYear: new Intl.DateTimeFormat(dl, { month: "long", year: "numeric", timeZone: "UTC" }),
      day: new Intl.DateTimeFormat(dl, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
      monthDay: new Intl.DateTimeFormat(dl, { month: "long", day: "numeric", timeZone: "UTC" }),
    }),
    [dl],
  );

  const { style, year, month, grid, selectedDay, today, pascha } = p;
  const monthKey = `${year}-${pad(month + 1)}`;
  const selectedIso = isoDay(selectedDay);
  const isToday = selectedIso === isoDay(today);

  const before = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const after = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const prevHref = calendarHref(style, `${before.y}-${pad(before.m + 1)}`);
  const nextHref = calendarHref(style, `${after.y}-${pad(after.m + 1)}`);
  const monthName = (y: number, m: number) => fmt.monthYear.format(new Date(Date.UTC(y, m, 1, 12)));

  // A swipe turns the month by the same addresses the chevrons hold.
  const turn = useCallback(
    (step: 1 | -1) => router.replace(step === 1 ? nextHref : prevHref, { scroll: false }),
    [router, nextHref, prevHref],
  );
  const gridRef = useRef<HTMLDivElement>(null);
  useMonthSwipe(gridRef, turn);

  // A new month comes in from the side it was asked for, wherever a swipe
  // left the last one; with motion off it is simply there.
  const shownMonth = useRef(monthKey);
  useLayoutEffect(() => {
    const was = shownMonth.current;
    if (was === monthKey) return;
    shownMonth.current = monthKey;
    const el = gridRef.current;
    if (!el) return;
    for (const a of el.getAnimations()) a.cancel();
    el.style.transform = "";
    el.style.opacity = "";
    if (!motionOn()) return;
    const step = monthKey > was ? 1 : -1;
    const rtl = document.documentElement.dir === "rtl";
    el.animate(
      [
        { transform: `translateX(${(rtl ? -step : step) * 28}px)`, opacity: 0 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: 260, easing: HOUSE_EASE },
    );
  }, [monthKey]);

  // A newly chosen day's words come in softly, so the change is seen.
  const dayRef = useRef<HTMLElement>(null);
  const shownDay = useRef(selectedIso);
  useLayoutEffect(() => {
    if (shownDay.current === selectedIso) return;
    shownDay.current = selectedIso;
    if (!motionOn()) return;
    dayRef.current?.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 200, easing: HOUSE_EASE });
  }, [selectedIso]);

  // monthGrid always returns six weeks; a month that needs five leaves a
  // last week wholly outside it, which is not drawn (as CalendarGrid does).
  let cells = grid;
  while (cells.length > 7 && cells.slice(-7).every((c) => !c.inMonth)) cells = cells.slice(0, -7);

  const cellLabel = (cell: MonthCell) => {
    const words = [fmt.day.format(new Date(`${cell.iso}T12:00:00Z`))];
    if (cell.hasFeast) words.push(t("calendar.feastAria"));
    if (cell.fast !== "normal") words.push(t(`calendar.fastShort.${cell.fast}`));
    return words.join(", ");
  };

  const readingRows = [
    ...p.readings.map((r) => ({ r, under: null as string | null })),
    ...p.ordinary.map((r) => ({ r, under: "bible.readForDay" })),
    ...p.commemorationReadings.map((r) => ({ r, under: "calendar.readingsForCommemoration" })),
  ];

  const paschaPrimary =
    pascha.daysAway === 0
      ? t("today.paschaPrimaryToday")
      : pascha.daysAway > 0
        ? tn("today.paschaDays", pascha.daysAway)
        : t("today.paschaPrimaryPassed");
  const paschaSecondary =
    pascha.daysAway > 0
      ? t("calendar.untilPaschaDate", { date: fmt.monthDay.format(pascha.date), year: pascha.date.getUTCFullYear() })
      : pascha.daysAway === 0
        ? t("today.paschaToday")
        : t("today.paschaPassed");

  return (
    <div className="bg-night pb-10" data-calendar-ready data-calendar="phone">
      {/* The reckoning, and the way back to today. */}
      <div data-cal-section="controls" className="flex items-center justify-between gap-3 px-5 pt-4">
        <div
          role="group"
          aria-label={t("ui.calendarReckoning")}
          className="grid grid-cols-2 gap-1 rounded-pill border border-paper/10 bg-paper/[0.03] p-1"
        >
          {(["new", "old"] as const).map((s) => (
            <StyleToggleLink
              key={s}
              href={calendarHref(s, p.mParam, p.dParam)}
              style={s}
              current={style === s}
              replace
              scroll={false}
              className={cn(
                "tap-press inline-flex min-h-11 min-w-16 items-center justify-center rounded-pill px-4 font-sans text-detail font-semibold motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                style === s ? "bg-paper text-night" : "text-paper/70 hover:text-paper",
              )}
            >
              {t(s === "new" ? "calendar.styleNew" : "calendar.styleOld")}
            </StyleToggleLink>
          ))}
        </div>
        <Link
          href={calendarHref(style)}
          replace
          scroll={false}
          className="tap-press inline-flex min-h-11 items-center rounded-pill border border-paper/15 px-4 font-sans text-detail font-semibold text-paper/80 hover:border-paper/35 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          {t("calendar.todayLink")}
        </Link>
      </div>

      {/* The month. */}
      <section data-cal-section="month" aria-labelledby="cal-month" className="mt-5">
        <div className="flex items-center justify-between gap-3 px-5">
          <h2 id="cal-month" aria-live="polite" className="min-w-0 text-title-sm leading-tight text-paper">
            {fmt.monthYear.formatToParts(new Date(Date.UTC(year, month, 1, 12))).map((part, i) =>
              part.type === "year" ? (
                <span key={i} className="font-normal text-paper/65">
                  {part.value}
                </span>
              ) : (
                part.value
              ),
            )}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={prevHref} replace scroll={false} aria-label={monthName(before.y, before.m)} className={ROUND}>
              <ChevronLeft size={20} className="rtl:-scale-x-100" />
            </Link>
            <Link href={nextHref} replace scroll={false} aria-label={monthName(after.y, after.m)} className={ROUND}>
              <ChevronRight size={20} className="rtl:-scale-x-100" />
            </Link>
          </div>
        </div>

        <div className="mt-3 px-3">
          <div aria-hidden className="grid grid-cols-7 pb-1.5">
            {weekdayNames(locale).map((d) => (
              <span key={d} className="min-w-0 truncate text-center font-sans text-caption font-medium text-paper/70">
                {d}
              </span>
            ))}
          </div>
          <div ref={gridRef} data-cal-grid className="grid grid-cols-7 gap-y-1" style={{ touchAction: "pan-y pinch-zoom" }}>
            {cells.map((cell) => (
              <DayCell
                key={cell.iso}
                cell={cell}
                href={calendarHref(style, monthKey, cell.iso)}
                selected={cell.inMonth && cell.iso === selectedIso}
                label={cell.inMonth ? cellLabel(cell) : ""}
              />
            ))}
          </div>
        </div>

        {/* What the marks mean, in the colours and drawings the days wear. */}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-5">
          <li className="inline-flex items-center gap-1.5 font-sans text-caption text-paper/70">
            <Cross aria-hidden size={14} strokeWidth={2.1} className="shrink-0 text-festal" />
            {t("calendar.legend.majorFeast")}
          </li>
          {LEGEND.map(({ kind, Icon, labelKey }) => (
            <li key={kind} className="inline-flex items-center gap-1.5 font-sans text-caption text-paper/70">
              <Icon aria-hidden size={14} strokeWidth={1.9} className="shrink-0" style={{ color: `rgb(${FAST_META[kind].rgb})` }} />
              {t(labelKey)}
            </li>
          ))}
        </ul>
      </section>

      {/* The chosen day, top to bottom: its date, its fast, its saints, its readings. */}
      <section
        ref={dayRef}
        data-cal-section="day"
        data-cal-day
        aria-labelledby="cal-day"
        className="mx-5 mt-6 border-t border-paper/10 pt-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="cal-day" className="min-w-0 text-lede leading-snug text-paper">
            {formatLongDateDual(selectedDay, style, locale)}
          </h2>
          {/* Words, not a second Today button: the one above is the control. */}
          {isToday ? (
            <span className="mt-1 shrink-0 font-sans text-caption font-medium text-paper/70">{t("calendar.today")}</span>
          ) : null}
        </div>

        <FastFact fast={p.fast} />

        <div className="mt-7">
          <ListLabel>{t("calendar.commemorations")}</ListLabel>
          {p.commemorations.length > 0 ? (
            <ul className={INDEX_LIST_LOOK}>
              {p.commemorations.map((c, i) => (
                <CommemorationItem key={i} c={c} first={i === 0} />
              ))}
            </ul>
          ) : (
            <p className="px-1 font-sans text-detail text-paper/70">{t("calendar.noCommemoration")}</p>
          )}
        </div>

        <div className="mt-7">
          <ListLabel>{t("calendar.readings")}</ListLabel>
          {readingRows.length > 0 ? (
            <ul className={INDEX_LIST_LOOK}>
              {readingRows.map(({ r, under }, i) => (
                <li key={i} className={i ? "border-t border-paper/[0.06]" : undefined}>
                  <Link
                    href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
                    className={cn(ROW, "transition-colors active:bg-paper/[0.04]")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-caption text-paper/70">
                        {t(KIND_KEY[r.kind])}
                        {under ? ` · ${t(under)}` : ""}
                      </span>
                      <span className="mt-0.5 block font-heading text-ui font-semibold leading-snug text-paper">
                        <Reference>{referenceIn(r.label, r.book, books)}</Reference>
                      </span>
                    </span>
                    <RowChevron />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 font-sans text-detail text-paper/70">{t("today.readingsEmpty")}</p>
          )}
          {/* Where these come from, on the days that is not the lectionary
              (readingsSourceOn, 2026-09-25). */}
          {p.source === "fixed" && readingRows.length > 0 ? (
            <p className="mt-2 px-1 font-sans text-caption leading-[1.55] text-paper/70">
              {t("calendar.readingsSourceFixed")}
            </p>
          ) : null}
        </div>
      </section>

      {/* The count to Pascha, from today whichever day is chosen: the
          Today tab's own row for it. */}
      <section data-cal-section="pascha" aria-label={t("today.paschaEyebrow")} className="mx-5 mt-7">
        <div className={cn(INDEX_LIST_LOOK, "px-4 py-3")}>
          <p className="font-sans text-caption text-paper/70">{t("today.paschaEyebrow")}</p>
          <p className="mt-0.5 font-heading text-ui font-semibold leading-tight text-paper">{paschaPrimary}</p>
          <p className="mt-1 font-sans text-caption leading-snug text-paper/70">{paschaSecondary}</p>
        </div>
      </section>

      {/* The two reckonings and the fast, said plainly, then the closing prayer. */}
      <section data-cal-section="notes" className="mx-5 mt-10 border-t border-paper/10 pt-6">
        {style === "old" ? (
          <p className="mb-3 font-sans text-detail leading-[1.6] text-paper/70">{t("calendar.julianNote")}</p>
        ) : null}
        <p className="font-sans text-detail leading-[1.6] text-paper/70">{t("calendar.reckoningsNote")}</p>
        <p className="mt-3 font-sans text-caption leading-[1.6] text-paper/70">{t("calendar.fastingDisclaimer")}</p>

        <div className="mt-10 text-center">
          <p className="font-serif text-body italic leading-[1.5] text-paper/85">{t("calendar.colophon.glory")}</p>
          <p className="mx-auto mt-2 max-w-[34ch] font-serif text-detail italic leading-[1.55] text-paper/70">
            {t("calendar.colophon.prayers")}
          </p>
          <p
            lang="grc"
            className="mx-auto mt-2 max-w-[36ch] text-detail italic leading-[1.55] text-paper/70"
            style={{ fontFamily: "var(--font-greek), serif" }}
          >
            {GREEK_COLOPHON}
          </p>
        </div>
      </section>
    </div>
  );
}
