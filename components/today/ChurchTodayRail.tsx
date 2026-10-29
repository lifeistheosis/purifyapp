"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { fastNotAllowedKey } from "@/lib/calendar/fastFoods";
import type { ReadingRef } from "@/lib/calendar/orthodox";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { hrefOf, rangesOf, startReadingsFlow, type FlowItem } from "@/lib/readings/flow";
import { listenParts, startListening } from "@/lib/readings/listen";
import { NATIVITY_PATH } from "@/lib/reading/nativity";
import { useNativityRow } from "@/lib/reading/useNativityRow";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { sectionMedia } from "@/lib/media/sections";
import { fastView } from "@/lib/onboarding/space";
import { useSpace } from "@/lib/onboarding/useSpace";
import { isNativeClient } from "@/lib/platform/native";
import { fastMarks, type FastMark, type Food } from "@/lib/today/fastMarks";
import { saintPicture, type SaintPicture } from "@/lib/today/saintFaces";
import { quoted, saintByline, saintWordsFor, wordsOpening } from "@/lib/today/saintWords";
import { sayingForDay } from "@/lib/today/saying";
import { cn } from "@/lib/cn";
import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Skeleton } from "@/components/ui/Skeleton";
import { SaintFace } from "./SaintFace";
import { SaintWindow, ShareMark } from "./SaintWindow";
import { TodaySayingCard } from "./TodaySayingCard";

/**
 * "The Church today": the day's saint, the fast and the readings as three
 * bands (1.8, the owner's pick B of round 12, "Bands", with St John
 * Chrysostom himself; Homebase/boards/purify-master/r18/choose/12b-church-
 * saint.png). The rest of the day's rows follow in one list, so nothing the
 * list of 1.7 opened is out of reach.
 *
 *   The saint     his face (his cover portrait, else his icon, else no
 *                 picture: lib/today/saintFaces.ts), his name, and his words
 *                 as they open where the app has a line of his
 *                 (lib/today/saintWords.ts). With words, a tap opens his
 *                 window (SaintWindow: share them as a picture, or read where
 *                 they are from); without, his page, as the row did. A saint
 *                 the calendar names but the registry has not profiled opens
 *                 the calendar day, with the commemoration's own note.
 *   The fast      its name and the marks for wine, oil, fish, and meat with
 *                 dairy and eggs, lit for what the day's rule allows and
 *                 struck through for what it does not (lib/today/fastMarks.ts).
 *                 A day with no fast says its rule in words; the simpler rule
 *                 reads every fast day the same plain way and leaves oil, wine
 *                 and fish to the reader's priest, so it carries no marks.
 *   The readings  the day's own readings over a page of the Codex Sinaiticus
 *                 (the Bible tab's picture), each opening its chapter, and
 *                 Read, which walks them one after another.
 *
 * Under them, as rows: the readings for the day's saints and, on a great
 * feast, the day's own pair under "For the day" (the owner's rulings of
 * 2026-10-10 and 2026-10-12); all the readings in one go and read aloud; the
 * Nativity Fast's path while its card is not on the screen; the count to
 * Pascha. The Desert Fathers' saying, on a day whose saint has no page,
 * stays under them as the one card left. The saint's words are on his band
 * and in his window now, so their card of 1.8 is gone.
 *
 * This is a client component ON PURPOSE, and it is the same component
 * /prayers/today renders, so the two cannot drift. It used to be computed in
 * the TodayMobileV3 server component, which meant the Android static export
 * baked the build day into the APK and every row was wrong until the next
 * release. See lib/calendar/useToday.ts for the full account. The
 * calendar-style preference is read from localStorage rather than from the
 * cookie, because the native shell has no server to read a cookie at request
 * time. The derivation itself, including why the Old Calendar shift applies
 * to the commemoration and the fast but not to the readings or the count to
 * Pascha, lives in lib/calendar/useChurchDay.ts.
 */
export function ChurchTodayRail() {
  const day = useChurchDay();
  const { fasting } = useSpace();
  const { t, tn } = useTranslate();
  const [calendarStyle] = useCalendarStyleDefault();
  // The Nativity Fast path (1.8): the day a reader on it is on, or the
  // invitation in the week before the fast and through it. While the
  // Nativity card stands on Today the row gives way to it.
  const nativity = useNativityRow(day?.today ?? null, calendarStyle);
  const [windowOpen, setWindowOpen] = useState(false);

  // One frame before hydration: the bands' own shape, so the front door does
  // not jump when the real day lands.
  if (!day) {
    return (
      <div aria-hidden className="flex flex-col gap-2">
        <div className="min-h-[124px] rounded-[18px] bg-night-deep px-4 py-3.5">
          <Skeleton className="h-3 w-20" weight="faint" />
          <Skeleton className="mt-2.5 h-5 w-1/2" />
          <Skeleton className="mt-2.5 h-3 w-2/5" weight="faint" />
        </div>
        <div className="min-h-[112px] rounded-[18px] border border-paper/8 bg-night-deep px-4 py-3.5">
          <Skeleton className="h-3 w-16" weight="faint" />
          <Skeleton className="mt-2.5 h-5 w-2/5" />
          <Skeleton className="mt-3 h-7 w-4/5" rounded="rounded-pill" weight="faint" />
        </div>
        <div className="min-h-[104px] rounded-[18px] bg-night-deep px-4 py-3.5">
          <Skeleton className="h-3 w-24" weight="faint" />
          <Skeleton className="mt-2.5 h-4 w-3/5" />
          <Skeleton className="mt-2 h-4 w-2/5" />
        </div>
      </div>
    );
  }

  const { today, headline, headlineSaint, fast, readings, ordinaryReadings, commemorationReadings, pascha } = day;
  const books = localBookNames(t);
  const kindOf = (r: Pick<ReadingRef, "kind">) =>
    r.kind === "epistle" ? t("bible.kindEpistle") : r.kind === "ot" ? t("bible.kindOt") : t("bible.kindGospel");
  // Every reading's reference, in one place: the book in the reader's
  // language, the chapter and verses as written, each range kept whole.
  const reference = (r: ReadingRef) => <Reference>{referenceIn(r.label, r.book, books)}</Reference>;
  const itemOf = (r: ReadingRef): FlowItem => ({ book: r.book, chapter: r.chapter, ranges: rangesOf(r.label, r.from, r.to), label: r.label, kind: r.kind });

  // ---- The saint
  // A profiled saint with words of his own opens his window; without them,
  // his page. A saint the registry has not profiled opens the calendar day.
  const words = headlineSaint ? saintWordsFor(headlineSaint.slug) : null;
  const picture = headlineSaint ? saintPicture(headlineSaint, isNativeClient()) : null;
  const saint: BandSaint = headlineSaint
    ? {
        name: headlineSaint.name,
        line: words ? { words: wordsOpening(words.text) } : { plain: saintByline(headlineSaint.epithet, undefined) },
        picture,
        ...(words ? { open: () => setWindowOpen(true) } : { href: `/saints/${headlineSaint.slug}` }),
      }
    : headline
      ? { name: headline.name, line: headline.note ? { plain: headline.note } : null, picture: null, href: "/calendar" }
      : { name: t("today.noSaint"), line: null, picture: null, quiet: true };

  // ---- The fast, unless the reader chose to hide fasting.
  const view = fasting === "hidden" ? null : fastView(fast.kind, fasting);
  const plain = view?.mode === "plain";
  const marks = view && !plain ? fastMarks(fast.kind) : null;
  const notKey = plain ? null : fastNotAllowedKey(fast.kind);

  // ---- The readings: the day's own on the band, the rest as rows.
  const groups: [ReadingRef[], string | null][] = [
    [readings, null],
    [ordinaryReadings, t("bible.readForDay")],
    [commemorationReadings, t("bible.readForCommemoration")],
  ];
  const own = readings.map(itemOf);
  // All of them, one after another (1.7): the first opens, a bar at its foot
  // leads on to the next, and "Done" keeps the day.
  const walk: FlowItem[] = groups.flatMap(([list]) => list).map(itemOf);

  const rows: (RowProps & { id: string })[] = [];
  for (const [list, whose] of groups.slice(1)) {
    list.forEach((r, i) => {
      rows.push({
        id: `${whose}-${i}`,
        href: `/bible/${r.book}/${r.chapter}#v${r.from}`,
        label: `${kindOf(r)} · ${whose}`,
        value: reference(r),
      });
    });
  }
  // The band's Read walks the day's own; here, when there are more, all of them.
  if (walk.length > Math.max(1, own.length)) {
    rows.push({
      id: "read-all",
      href: hrefOf(walk[0]),
      onClick: () => startReadingsFlow(walk),
      label: t("readingsFlow.startLabel"),
      value: t("readingsFlow.startValue"),
    });
  }
  // And to hear them (1.8): the same passages read aloud through the app's
  // player, only the verses read today, wherever their chapters have a
  // recording (lib/readings/listen.ts).
  const parts = listenParts(walk, (item) => ({
    title: referenceIn(item.label, item.book, books),
    artist: kindOf(item),
  }));
  if (parts.length) {
    rows.push({
      id: "listen",
      onClick: () => startListening(parts),
      label: t("readingsFlow.startLabel"),
      value: t("readingsListen.value"),
    });
  }
  if (nativity) {
    rows.push(
      nativity.kind === "day"
        ? {
            id: "nativity",
            href: `/reading/paths/${NATIVITY_PATH}#day-${nativity.n}`,
            label: t("today.nativity.label"),
            value: t("today.nativity.day", { n: nativity.n, total: nativity.of }),
          }
        : { id: "nativity", href: `/reading/paths/${NATIVITY_PATH}`, label: t("today.nativity.label"), value: t("today.nativity.invite") },
    );
  }
  // The count to Pascha.
  rows.push({
    id: "pascha",
    href: "/calendar",
    label: t("today.paschaEyebrow"),
    value:
      pascha.daysAway === 0
        ? t("today.paschaPrimaryToday")
        : pascha.daysAway > 0
          ? tn("today.paschaDays", pascha.daysAway)
          : t("today.paschaPrimaryPassed"),
    sub:
      pascha.daysAway > 0
        ? t("today.untilPascha", { year: pascha.date.getUTCFullYear() })
        : pascha.daysAway === 0
          ? t("today.paschaToday")
          : t("today.paschaPassed"),
  });

  // Only when the saint of the day has no profile to open. On a day that does
  // resolve, the reader already has somewhere to go and the list stays short.
  const saying = headlineSaint ? null : sayingForDay(today);
  const bible = sectionMedia("bible");

  return (
    <div data-church-today="">
      <div className="flex flex-col gap-2">
        <SaintBand saint={saint} />

        {view ? (
          <Link href="/fasting" data-today-band="fast" className="press-card block rounded-[18px] border border-paper/8 bg-night-deep px-4 py-3.5">
            <span className="block font-sans text-caption font-semibold text-paper/55">{t("today.fastEyebrow")}</span>
            <span className="mt-0.5 block font-heading text-lede font-bold leading-tight text-paper">
              {plain ? t("today.fastPlain.label") : t(`calendar.fast.${fast.ruleId}.label`)}
            </span>
            {marks ? (
              <Marks marks={marks} />
            ) : (
              <>
                <span className="mt-1 block font-sans text-caption leading-snug text-paper/55">
                  {plain ? t("today.fastPlain.rule") : t(`calendar.fast.${fast.ruleId}.rule`)}
                </span>
                {notKey ? <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/55">{t(notKey)}</span> : null}
              </>
            )}
          </Link>
        ) : null}

        <section data-today-band="readings" aria-labelledby="today-readings" className="relative overflow-hidden rounded-[18px] bg-night-deep">
          {/* The shade along the start is the band's own ground: the page is
              faded into it by a mask (.today-readings-picture in globals.css),
              not darkened by a layer laid over it. The band clips each layer
              to its round corners on its own, so a layer over the page let a
              hairline of it show round the two start corners, where the shade
              is darkest (the line the owner's build 80 note 1 found on
              Discover's bands). */}
          {bible ? (
            // eslint-disable-next-line @next/next/no-img-element -- the Bible tab's own picture (lib/media/sections.ts), as the band's ground
            <img src={bible.src} alt="" aria-hidden decoding="async" className="today-readings-picture pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55" />
          ) : null}
          <div className="relative flex min-h-[104px] items-end justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p id="today-readings" className="font-sans text-caption font-semibold text-paper/60">
                {t("today.readingsEyebrow")}
              </p>
              {readings.length ? (
                <ul className="mt-1">
                  {readings.map((r, i) => (
                    <li key={i}>
                      {/* The kind is said, not drawn: the band shows the references alone. */}
                      <span className="sr-only">{kindOf(r)}</span>
                      <Link
                        href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
                        className="tap-press font-heading text-[16px] font-semibold leading-snug text-paper"
                      >
                        {reference(r)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 font-sans text-ui italic text-paper/55">{t("today.readingsEmpty")}</p>
              )}
            </div>
            {own.length ? (
              <Link
                href={hrefOf(own[0])}
                onClick={own.length > 1 ? () => startReadingsFlow(own) : undefined}
                className="tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill bg-paper px-[18px] font-sans text-ui font-semibold text-night"
              >
                {t("reading.featured.read")}
              </Link>
            ) : null}
          </div>
        </section>
      </div>

      <ul className={cn(INDEX_LIST_LOOK, "mt-2")}>
        {rows.map(({ id, ...row }, i) => (
          <Row key={id} {...row} first={i === 0} />
        ))}
      </ul>

      {saying ? (
        <div className="mt-3">
          <TodaySayingCard saying={saying} />
        </div>
      ) : null}

      {words && headlineSaint ? (
        <SaintWindow open={windowOpen} onClose={() => setWindowOpen(false)} saint={headlineSaint} words={words} picture={picture} />
      ) : null}
    </div>
  );
}

type BandSaint = {
  name: string;
  /** Under the name: his words as they open, or a plain line (his title, the commemoration's note). */
  line: { words: string } | { plain: string } | null;
  picture: SaintPicture | null;
  /** His window, when he has words of his own. */
  open?: () => void;
  href?: string;
  /** No saint on the calendar today. */
  quiet?: boolean;
};

/** The saint's band: his face at its side, his name, and the start of his words. */
function SaintBand({ saint }: { saint: BandSaint }) {
  const { t } = useTranslate();
  const body = (
    <>
      {saint.picture ? (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 end-0 w-[54%] overflow-hidden">
            <SaintFace key={saint.picture.src} picture={saint.picture} />
          </span>
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night-deep from-[46%] to-transparent to-[76%] rtl:bg-gradient-to-l" />
        </>
      ) : null}
      <span className={cn("relative block px-4 py-3.5", saint.picture && "max-w-[64%]")}>
        <span className="block font-sans text-caption font-semibold text-paper/55">{t("today.saintEyebrow")}</span>
        <span
          className={
            saint.quiet
              ? "mt-1 block font-sans text-ui italic text-paper/55"
              : "mt-0.5 block font-heading text-lede font-bold leading-tight text-paper"
          }
        >
          {saint.name}
        </span>
        {saint.line && "words" in saint.line ? (
          <span lang="en" className="mt-1 block font-heading text-caption italic leading-snug text-paper/70">
            {quoted(saint.line.words)}
          </span>
        ) : saint.line ? (
          <span className="mt-1 block font-sans text-caption leading-snug text-paper/55">{saint.line.plain}</span>
        ) : null}
      </span>
      {saint.open ? (
        <span aria-hidden className="absolute bottom-2.5 end-2.5 grid size-[30px] place-items-center rounded-full bg-night/55 text-paper">
          <ShareMark size={15} />
        </span>
      ) : null}
    </>
  );
  const look = "relative block min-h-[124px] w-full overflow-hidden rounded-[18px] bg-night-deep text-start";
  if (saint.open) {
    return (
      <button type="button" onClick={saint.open} aria-haspopup="dialog" data-today-band="saint" className={cn("press-card", look)}>
        {body}
      </button>
    );
  }
  if (saint.href) {
    return (
      <Link href={saint.href} data-today-band="saint" className={cn("press-card", look)}>
        {body}
      </Link>
    );
  }
  return (
    <div data-today-band="saint" className={look}>
      {body}
    </div>
  );
}

/** What the day's rule allows, lit, and what it does not, struck through. */
function Marks({ marks }: { marks: FastMark[] }) {
  const { t } = useTranslate();
  const word = (food: Food) =>
    food === "wine"
      ? t("today.fastMarks.wine")
      : food === "oil"
        ? t("today.fastMarks.oil")
        : food === "fish"
          ? t("today.fastMarks.fish")
          : t("today.fastMarks.meat");
  return (
    <span className="mt-2.5 flex flex-wrap gap-2">
      {marks.map(({ food, allowed }) => (
        <span
          key={food}
          data-fast-mark={food}
          data-allowed={allowed ? "" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border px-[11px] py-1.5 font-sans text-caption font-semibold",
            allowed ? "today-lit border-paper/30 text-paper" : "border-paper/10 text-paper/50",
          )}
        >
          <FoodIcon food={food} />
          <span aria-hidden className={allowed ? undefined : "line-through"}>
            {word(food)}
          </span>
          <span className="sr-only">
            {allowed ? t("today.fastMarks.allowed", { food: word(food) }) : t("today.fastMarks.notAllowed", { food: word(food) })}
          </span>
        </span>
      ))}
    </span>
  );
}

/** The mark's glyph: a cup, a drop of oil, a fish, and a cross for what no fast day allows. */
function FoodIcon({ food }: { food: Food }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {food === "wine" ? (
        <>
          <path d="M8 3h8l-.6 5.5a3.4 3.4 0 0 1-6.8 0z" />
          <path d="M12 12v8M8.5 21h7" />
        </>
      ) : food === "oil" ? (
        <path d="M12 3c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0C7 9.6 9 7 12 3z" />
      ) : food === "fish" ? (
        <>
          <path d="M3 12c3-4.5 9-6 13-2.5L21 6v12l-5-3.5C12 18 6 16.5 3 12z" />
          <circle cx="8" cy="11" r=".9" fill="currentColor" />
        </>
      ) : (
        <path d="M6 6l12 12M18 6 6 18" />
      )}
    </svg>
  );
}

type RowProps = {
  href?: string;
  /** Run as the row is followed (Today's readings starts its walk). */
  onClick?: () => void;
  /** The small grey line naming what the row is. */
  label: string;
  /** The row's own words: a name, a fast, a reference, a count. */
  value: ReactNode;
  sub?: string;
  first?: boolean;
};

function Row({ href, onClick, label, value, sub, first }: RowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-caption text-paper/50">{label}</span>
        <span className="mt-0.5 block font-heading text-ui font-semibold leading-tight text-paper">{value}</span>
        {sub ? <span className="mt-1 block font-sans text-caption leading-snug text-paper/55">{sub}</span> : null}
      </span>
      {href ? (
        <svg
          aria-hidden
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-paper/35 rtl:-scale-x-100"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      ) : onClick ? (
        <Headphones aria-hidden size={16} className="shrink-0 text-paper/35" />
      ) : null}
    </>
  );
  return (
    <li className={first ? undefined : "border-t border-paper/[0.06]"}>
      {href ? (
        <Link href={href} onClick={onClick} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-paper/[0.04] motion-reduce:transition-none">
          {body}
        </Link>
      ) : (
        // A row that does something here rather than going somewhere: the
        // readings read aloud.
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors active:bg-paper/[0.04] motion-reduce:transition-none"
        >
          {body}
        </button>
      )}
    </li>
  );
}
