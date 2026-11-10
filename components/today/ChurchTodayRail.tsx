"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { fastNotAllowedKey } from "@/lib/calendar/fastFoods";
import type { ReadingRef } from "@/lib/calendar/orthodox";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { dayWalk, hrefOf, startReadingsFlow } from "@/lib/readings/flow";
import { listenParts, startListening } from "@/lib/readings/listen";
import { NATIVITY_PATH } from "@/lib/reading/nativity";
import { useNativityRow } from "@/lib/reading/useNativityRow";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { todaysHistoryEvent } from "@/lib/history/onThisDay";
import { sectionMedia } from "@/lib/media/sections";
import { fastView } from "@/lib/onboarding/space";
import { useSpace } from "@/lib/onboarding/useSpace";
import { isNativeClient } from "@/lib/platform/native";
import type { SaintBrief } from "@/lib/saints/brief";
import { feastDaysIn } from "@/lib/saints/feastDay";
import { fastMarks, type FastMark, type Food } from "@/lib/today/fastMarks";
import { quoteFace, saintPicture, type SaintPicture } from "@/lib/today/saintFaces";
import { bandCite, quoted, saintByline, saintPictureInput, saintQuote, saintWordsFor, type SaintWords } from "@/lib/today/saintWords";
import { sayingForDay } from "@/lib/today/saying";
import { cn } from "@/lib/cn";
import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Play } from "@/components/ui/icons/Play";
import { Skeleton } from "@/components/ui/Skeleton";
import { HistoryDayBand } from "./HistoryDayBand";
import { SaintFace } from "./SaintFace";
import { SpeakerBand } from "./SpeakerBand";
import { TodaySayingCard } from "./TodaySayingCard";
import { textDir } from "@/lib/i18n/textDir";

// Loaded on the tap, as the verse's is: Today carries no canvas for a reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/**
 * "The Church today": the day's saint, the fast and the readings as three
 * bands (1.8, the owner's pick B of round 12, "Bands", with St John
 * Chrysostom himself), and since round 3 each band does more (r3-21, his
 * pick A, "The face beside the words": "Let's do A, the face beside the
 * word.", 2026-10-31; BUILD-80-NOTES 63 and 64, Homebase/boards/purify-master/
 * variants/r3-21-today-church.png). Seven things to read on a saint's day
 * came down to three: the readings card's own readings, its one line for the
 * saints, and its two buttons.
 *
 *   The saint     on a day whose saint has words of his own
 *                 (lib/today/saintWords.ts), his words whole beside his cover
 *                 portrait, on the side he looks from (components/today/
 *                 SpeakerBand.tsx), with the source line that opens them
 *                 where they stand and the share mark that makes the
 *                 picture; a tap anywhere else opens his page. The window
 *                 that held them whole before is not opened from here any
 *                 more: its two actions are on the band. A saint with no
 *                 words keeps the band of round 12, his face and his name,
 *                 opening his page; one the registry has not profiled opens
 *                 the calendar day, with the commemoration's own note.
 *   The fast      its name and the marks for wine, oil, fish, and meat with
 *                 dairy and eggs, lit for what the day's rule allows and
 *                 struck through for what it does not (lib/today/fastMarks.ts).
 *                 A day with no fast says its rule in words; the simpler rule
 *                 reads every fast day the same plain way and leaves oil, wine
 *                 and fish to the reader's priest, so it carries no marks.
 *                 The Nativity Fast's path stands at its foot while it is
 *                 offered, the fast it belongs to.
 *   The readings  one card over a page of the Codex Sinaiticus (the Bible
 *                 tab's picture): the day's own readings, each opening its
 *                 chapter; on a great feast the day's own pair under "For the
 *                 day" (the owner's rulings of 2026-10-10 and 2026-10-12);
 *                 the readings for the day's saints folded into one line,
 *                 "For today's saints · 3 more", that opens in place; and two
 *                 buttons, Read all, which walks every one of them as Read
 *                 them in one go did, and Listen, which reads them aloud.
 *
 * Pascha's count went up to the date line at the top of Today
 * (GreetingHeader.tsx). The Desert Fathers' saying, on a day whose saint has
 * no page, stands under the bands as a band of the same kind, each Father
 * beside his words: St Antony's cover, St Moses's fresco for Abba Moses, the
 * Fathers of Sinai for Abba Isaac and any Father with no picture of his own
 * (sheet r3-22), and the lit cross where no checked picture stands.
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
  // Nativity card stands on Today the line gives way to it.
  const nativity = useNativityRow(day?.today ?? null, calendarStyle);
  const [saintsOpen, setSaintsOpen] = useState(false);

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

  const { today, headline, headlineSaint, fast, readings, ordinaryReadings, commemorationReadings } = day;
  const books = localBookNames(t);
  const kindOf = (r: Pick<ReadingRef, "kind">) =>
    r.kind === "epistle" ? t("bible.kindEpistle") : r.kind === "ot" ? t("bible.kindOt") : t("bible.kindGospel");
  // Every reading's reference, in one place: the book in the reader's
  // language, the chapter and verses as written, each range kept whole.
  const reference = (r: ReadingRef) => <Reference>{referenceIn(r.label, r.book, books)}</Reference>;
  const chapterOf = (r: ReadingRef) => `/bible/${r.book}/${r.chapter}#v${r.from}`;

  // ---- The saint
  // With words of his own, they stand whole beside him. Without, the band of
  // round 12: a profiled saint opens his page, one the registry has not
  // profiled opens the calendar day.
  const words = headlineSaint ? saintWordsFor(headlineSaint.slug) : null;
  const saint: BandSaint = headlineSaint
    ? {
        name: headlineSaint.name,
        line: { plain: saintByline(headlineSaint.epithet, undefined) },
        picture: saintPicture(headlineSaint, isNativeClient()),
        href: `/saints/${headlineSaint.slug}`,
      }
    : headline
      ? { name: headline.name, line: headline.note ? { plain: headline.note } : null, picture: null, href: "/calendar" }
      : { name: t("today.noSaint"), line: null, picture: null, quiet: true };

  // ---- The fast, unless the reader chose to hide fasting.
  const view = fasting === "hidden" ? null : fastView(fast.kind, fasting);
  const plain = view?.mode === "plain";
  const marks = view && !plain ? fastMarks(fast.kind) : null;
  const notKey = plain ? null : fastNotAllowedKey(fast.kind);
  const fastBody = view ? (
    <>
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
    </>
  ) : null;
  // The Nativity Fast's path, at the foot of the fast it belongs to (r3-21 A).
  const path = nativity
    ? nativity.kind === "day"
      ? { href: `/reading/paths/${NATIVITY_PATH}#day-${nativity.n}`, value: t("today.nativity.day", { n: nativity.n, total: nativity.of }) }
      : { href: `/reading/paths/${NATIVITY_PATH}`, value: t("today.nativity.invite") }
    : null;

  // ---- The readings: one card.
  // All of them, one after another (1.7): the first opens, a bar at its foot
  // leads on to the next, and "Done" keeps the day.
  const walk = dayWalk(day);
  // And to hear them (1.8): the same passages read aloud through the app's
  // player, only the verses read today, wherever their chapters have a
  // recording (lib/readings/listen.ts).
  const parts = listenParts(walk, (item) => ({
    title: referenceIn(item.label, item.book, books),
    artist: kindOf(item),
  }));
  const refs = (list: ReadingRef[]) => (
    <ul className="mt-1">
      {list.map((r, i) => (
        <li key={i}>
          {/* The kind is said, not drawn: the band shows the references alone. */}
          <span className="sr-only">{kindOf(r)}</span>
          <Link href={chapterOf(r)} className="tap-press font-heading text-[16px] font-semibold leading-snug text-paper">
            {reference(r)}
          </Link>
        </li>
      ))}
    </ul>
  );

  // Only when the saint of the day has no profile to open. On a day that does
  // resolve, the reader already has somewhere to go and the list stays short.
  const saying = headlineSaint ? null : sayingForDay(today);
  // The day's event in Church history, on the reader's own calendar.
  const history = todaysHistoryEvent(today, calendarStyle);
  const bible = sectionMedia("bible");

  return (
    <div data-church-today="">
      <div className="flex flex-col gap-2">
        {headlineSaint && words ? <SaintWordsBand saint={headlineSaint} words={words} /> : <SaintBand saint={saint} />}

        {/* This day in Church history (1.9, U9): under the day's saints, on
            the days an event with its picture falls on exactly. */}
        {history ? <HistoryDayBand event={history} /> : null}

        {view && !path ? (
          <Link href="/fasting" data-today-band="fast" className="press-card block rounded-[18px] border border-paper/8 bg-night-deep px-4 py-3.5">
            {fastBody}
          </Link>
        ) : path ? (
          // Two ways on from one band, each its own link: the fast, and the
          // path at its foot under a hairline.
          <div data-today-band="fast" className="overflow-hidden rounded-[18px] border border-paper/8 bg-night-deep">
            {view ? (
              <Link href="/fasting" className="block px-4 pb-3 pt-3.5 transition-colors active:bg-paper/[0.04] motion-reduce:transition-none">
                {fastBody}
              </Link>
            ) : null}
            <Link href={path.href} data-nativity-path="" className="block px-4 transition-colors active:bg-paper/[0.04] motion-reduce:transition-none">
              <span className={cn("flex items-center gap-2.5 pb-3.5", view ? "border-t border-paper/8 pt-[11px]" : "pt-3.5")}>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-caption leading-[1.3] text-paper/50">{t("today.nativity.label")}</span>
                  <span className="mt-0.5 block font-heading text-ui font-semibold leading-[1.3] text-paper">{path.value}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-paper/35 rtl:-scale-x-100" />
              </span>
            </Link>
          </div>
        ) : null}

        <section data-today-band="readings" aria-labelledby="today-readings" className="relative overflow-hidden rounded-[18px] bg-night-deep">
          {/* The shade along the start is the band's own ground: the page is
              faded into it by a mask (.today-readings-picture in globals.css),
              not darkened by a layer laid over it. The band clips each layer
              to its round corners on its own, so a layer over the page let a
              hairline of it show round the two start corners, where the shade
              is darkest (the line the owner's build 80 note 1 found on
              Discover's bands). Under the card's foot, where the saints'
              readings open and the buttons stand, the page calms the same way
              (.today-readings-calm), by a mask and not a shade. */}
          {bible ? (
            <span aria-hidden className="today-readings-calm pointer-events-none absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- the Bible tab's own picture (lib/media/sections.ts), as the band's ground */}
              <img src={bible.src} alt="" aria-hidden decoding="async" className="today-readings-picture pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55" />
            </span>
          ) : null}
          <div className="relative px-4 pb-4 pt-3.5">
            <p id="today-readings" className="font-sans text-caption font-semibold text-paper/60">
              {t("today.readingsEyebrow")}
            </p>
            {readings.length ? refs(readings) : <p className="mt-1 font-sans text-ui italic text-paper/55">{t("today.readingsEmpty")}</p>}
            {ordinaryReadings.length ? (
              <>
                <p className="mt-2.5 font-sans text-caption text-paper/55">{t("bible.readForDay")}</p>
                {refs(ordinaryReadings)}
              </>
            ) : null}
            {commemorationReadings.length ? (
              <SaintsFold open={saintsOpen} onToggle={() => setSaintsOpen((was) => !was)} count={commemorationReadings.length}>
                {commemorationReadings.map((r, i) => (
                  <li key={i} className="border-b border-paper/[0.06]">
                    <Link href={chapterOf(r)} className="flex min-h-11 items-center gap-2.5 py-1.5">
                      <span className="w-[54px] shrink-0 font-sans text-caption leading-[1.3] text-paper/50">{kindOf(r)}</span>
                      <span className="min-w-0 flex-1 font-heading text-[15px] font-semibold leading-[1.35] text-paper">{reference(r)}</span>
                      <ChevronRight size={15} className="shrink-0 text-paper/35 rtl:-scale-x-100" />
                    </Link>
                  </li>
                ))}
              </SaintsFold>
            ) : null}
            {walk.length || parts.length ? (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {walk.length ? (
                  <Link
                    href={hrefOf(walk[0])}
                    onClick={walk.length > 1 ? () => startReadingsFlow(walk) : undefined}
                    data-read-all=""
                    className="tap-press inline-flex min-h-11 items-center gap-2 rounded-pill bg-paper px-[18px] font-sans text-ui font-semibold text-night"
                  >
                    <Play size={13} className="shrink-0 rtl:-scale-x-100" />
                    {walk.length > 1 ? tn("today.readings.readAll", walk.length) : t("reading.featured.read")}
                  </Link>
                ) : null}
                {parts.length ? (
                  <button
                    type="button"
                    onClick={() => startListening(parts)}
                    data-listen=""
                    className="tap-press inline-flex min-h-11 items-center gap-2 rounded-pill border border-paper/22 bg-paper/[0.03] px-[18px] font-sans text-ui font-semibold text-paper"
                  >
                    <Headphones size={17} className="shrink-0" />
                    {t("readAloud.listen")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {saying ? (
        <div className="mt-3">
          <TodaySayingCard saying={saying} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The readings for the day's saints, folded into one line on the readings
 * card (r3-21 A): "For today's saints · 3 more", opening in place. It opens
 * in about 240 ms on the house curve, its rows rising a few pixels into
 * place; with the app's motion off it simply opens. Shut, its rows are inert:
 * not read out, not reached by Tab.
 */
export function SaintsFold({ open, onToggle, count, children }: { open: boolean; onToggle: () => void; count: number; children: ReactNode }) {
  const { t, tn } = useTranslate();
  const id = useId();
  return (
    <>
      <div className="mt-3 border-t border-paper/10 pt-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          data-saints-fold=""
          className="flex min-h-11 w-full items-center justify-between gap-3 text-start"
        >
          <span className="min-w-0 font-sans text-[13.5px] leading-[1.3]">
            <span className="font-semibold text-paper/85">{t("bible.readForCommemoration")}</span>
            <span className="text-paper/50"> · {tn("today.readings.more", count)}</span>
          </span>
          <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-full bg-paper/[0.07] text-paper/80">
            <ChevronDown size={16} className={cn("transition-transform duration-[240ms] ease-house motion-reduce:transition-none", open && "rotate-180")} />
          </span>
        </button>
      </div>
      <div
        id={id}
        inert={!open}
        className={cn("grid transition-[grid-template-rows] duration-[240ms] ease-house motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <ul
          className={cn(
            "min-h-0 overflow-hidden transition-[opacity,translate] duration-[240ms] ease-house motion-reduce:transition-none",
            open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {children}
        </ul>
      </div>
    </>
  );
}

type BandSaint = {
  name: string;
  /** Under the name: a plain line (his title, the commemoration's note). */
  line: { plain: string } | null;
  picture: SaintPicture | null;
  href?: string;
  /** No saint on the calendar today. */
  quiet?: boolean;
};

/**
 * The saint's words whole beside his face (r3-21 A). His face is the one his
 * words' picture shares (lib/today/saintFaces.ts, quoteFace): his cover
 * portrait, else an icon the app carries whose rights are recorded, else the
 * lit cross, never a stand-in (BUILD-80-NOTES 64). The share mark opens the
 * picture sheet with his own looks, the Portrait, the Page and the Seal, as
 * his window did (round 3, r3-11).
 */
function SaintWordsBand({ saint, words }: { saint: SaintBrief; words: SaintWords }) {
  const { t, locale } = useTranslate();
  const [making, setMaking] = useState(false);
  const face = useMemo(() => quoteFace(saint, isNativeClient()), [saint]);
  const work = words.shown.kind === "father" || words.shown.kind === "text" ? words.shown.work : null;
  // The same objects while the words are the same: the sheet draws its preview again when they change.
  const pictureWords = useMemo(() => ({ ...saintPictureInput(words, saint.name), ...(work ? { note: work } : {}) }), [words, saint.name, work]);
  const quote = useMemo(
    () =>
      making
        ? saintQuote({
            saint,
            words,
            face,
            pageHead: t("saints.inHisOwnWords"),
            feast: saint.feastDays?.[0] ? feastDaysIn([saint.feastDays[0]], locale, "long", t) : undefined,
            lang: locale,
          })
        : undefined,
    [making, saint, words, face, t, locale],
  );
  return (
    <>
      <SpeakerBand
        data-today-band="saint"
        data-tour="quote-picture"
        eyebrow={t("today.saintEyebrow")}
        name={{ text: saint.name, href: `/saints/${saint.slug}` }}
        words={quoted(words.text)}
        cite={bandCite(words.shown)}
        face={face}
        onShare={() => setMaking(true)}
        shareMark="data-saint-share"
      />
      {making ? (
        <PictureSheet
          open={making}
          onClose={() => setMaking(false)}
          words={pictureWords}
          title={saint.name}
          name={saint.name}
          caption={work ? `${saint.name}\n${work}` : saint.name}
          referenceLabel={saint.name}
          quote={quote}
        />
      ) : null}
    </>
  );
}

/** The saint's band of round 12, for a saint with no words of his own: his face at its side, his name, his title. */
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
        {/* The saint's name is English; the quiet line in its place ("No commemoration") is the reader's. */}
        <span
          lang={saint.quiet ? undefined : "en"}
          dir={textDir(saint.quiet ? undefined : "en")}
          className={
            saint.quiet
              ? "mt-1 block font-sans text-ui italic text-paper/55"
              : "mt-0.5 block font-heading text-lede font-bold leading-tight text-paper"
          }
        >
          {saint.name}
        </span>
        {saint.line ? (
          <span lang="en" dir="ltr" className="mt-1 block font-sans text-caption leading-snug text-paper/55">
            {saint.line.plain}
          </span>
        ) : null}
      </span>
    </>
  );
  const look = "relative block min-h-[124px] w-full overflow-hidden rounded-[18px] bg-night-deep text-start";
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
