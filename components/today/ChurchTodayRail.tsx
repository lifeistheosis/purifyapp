"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { fastNotAllowedKey } from "@/lib/calendar/fastFoods";
import type { ReadingRef } from "@/lib/calendar/orthodox";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { hrefOf, rangesOf, startReadingsFlow, type FlowItem } from "@/lib/readings/flow";
import { listenParts, startListening } from "@/lib/readings/listen";
import { NATIVITY_PATH } from "@/lib/reading/nativity";
import { useNativityRow } from "@/lib/reading/useNativityRow";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { fastView } from "@/lib/onboarding/space";
import { useSpace } from "@/lib/onboarding/useSpace";
import { saintWordsFor } from "@/lib/today/saintWords";
import { sayingForDay } from "@/lib/today/saying";
import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Skeleton } from "@/components/ui/Skeleton";
import { TodaySaintWordsCard } from "./TodaySaintWordsCard";
import { TodaySayingCard } from "./TodaySayingCard";

/**
 * "The Church today": the day's saint, the fast, each reading and the count
 * to Pascha, as ONE list of rows, each opening deeper.
 *
 * Until 1.7 this was five cards in four looks on a dotted timeline rail. On
 * 2026-10-07 the owner marked "The Church today as one list of four rows in
 * place of five cards", and on 2026-10-15 he picked this Today ("B"). The
 * rows wear the Bible tab's list look (IndexRows, 1.6), so Today and the
 * Bible tab speak one row language. A reading is a row of its own, as on the
 * Bible tab. The Desert Fathers' saying, when the day has one, sits under the
 * list as the one card left.
 *
 * The fast row says what is not allowed as well as what is (lib/calendar/
 * fastFoods.ts), the owner's yes of 2026-10-15.
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
  // invitation in the week before the fast and through it.
  const nativity = useNativityRow(day?.today ?? null, calendarStyle);

  // One frame before hydration: the list's own shape, row for row, so the
  // front door does not jump when the real day lands. Saint, fast (three
  // lines), two readings and Pascha (three lines), the ordinary day.
  if (!day) {
    return (
      <ul aria-hidden className={INDEX_LIST_LOOK}>
        {[2, 3, 2, 2, 3].map((lines, i) => (
          <li key={i} className={i ? "border-t border-paper/[0.06] px-4 py-3" : "px-4 py-3"}>
            <Skeleton className="h-3 w-20" weight="faint" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            {lines === 3 ? <Skeleton className="mt-2 h-3 w-1/2" weight="faint" /> : null}
          </li>
        ))}
      </ul>
    );
  }

  const { today, headline, headlineSaint, fast, readings, ordinaryReadings, commemorationReadings, pascha } = day;
  const books = localBookNames(t);

  const rows: (RowProps & { id: string })[] = [];

  // The saint. A profiled saint opens their page; a saint the calendar names
  // but the registry has not profiled opens the calendar day, which shows
  // the fuller commemoration.
  if (headlineSaint) {
    rows.push({ id: "saint", href: `/saints/${headlineSaint.slug}`, label: t("today.saintEyebrow"), value: headlineSaint.name });
  } else if (headline) {
    rows.push({ id: "saint", href: "/calendar", label: t("today.saintEyebrow"), value: headline.name, sub: headline.note });
  } else {
    rows.push({ id: "saint", label: t("today.saintEyebrow"), value: t("today.noSaint"), quiet: true });
  }

  // The fast, unless the reader chose to hide fasting. The simpler rule
  // reads every fast day the same plain way and leaves oil, wine and fish to
  // their priest, so it carries no "not allowed" line of its own.
  if (fasting !== "hidden") {
    const plain = fastView(fast.kind, fasting)?.mode === "plain";
    const not = plain ? null : fastNotAllowedKey(fast.kind);
    rows.push({
      id: "fast",
      href: "/fasting",
      label: t("today.fastEyebrow"),
      value: plain ? t("today.fastPlain.label") : t(`calendar.fast.${fast.ruleId}.label`),
      sub: plain ? t("today.fastPlain.rule") : t(`calendar.fast.${fast.ruleId}.rule`),
      sub2: not ? t(not) : undefined,
    });
  }

  // The readings, a row each. On a great feast whose own readings lead, the
  // day's ordinary pair follows with "For the day" (the owner's ruling of
  // 2026-10-12); the saint's own reading follows with whose it is (his
  // ruling of 2026-10-10). The book is named in the reader's language; the
  // chapter and verses stay as written.
  const kindOf = (r: Pick<ReadingRef, "kind">) =>
    r.kind === "epistle" ? t("bible.kindEpistle") : r.kind === "ot" ? t("bible.kindOt") : t("bible.kindGospel");
  const groups: [ReadingRef[], string | null][] = [
    [readings, null],
    [ordinaryReadings, t("bible.readForDay")],
    [commemorationReadings, t("bible.readForCommemoration")],
  ];
  if (!readings.length) {
    rows.push({ id: "readings", label: t("today.readingsEyebrow"), value: t("today.readingsEmpty"), quiet: true });
  }
  for (const [list, whose] of groups) {
    list.forEach((r, i) => {
      rows.push({
        id: `${whose ?? "day"}-${i}`,
        href: `/bible/${r.book}/${r.chapter}#v${r.from}`,
        label: whose ? `${kindOf(r)} · ${whose}` : kindOf(r),
        value: <Reference>{referenceIn(r.label, r.book, books)}</Reference>,
      });
    });
  }

  // All of them, one after another (1.7): the first opens, a bar at its
  // foot leads on to the next, and "Done" keeps the day.
  const walk: FlowItem[] = groups
    .flatMap(([list]) => list)
    .map((r) => ({ book: r.book, chapter: r.chapter, ranges: rangesOf(r.label, r.from, r.to), label: r.label, kind: r.kind }));
  if (walk.length > 1) {
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
  // On a day that does resolve, the saint in their own words when the app has
  // a line of theirs it can show where it stands (1.8).
  const words = headlineSaint ? saintWordsFor(headlineSaint.slug) : null;

  return (
    <>
      <ul className={INDEX_LIST_LOOK}>
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
        <div className="mt-3">
          <TodaySaintWordsCard name={headlineSaint.name} words={words} />
        </div>
      ) : null}
    </>
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
  sub2?: string;
  /** An empty day's row: no link, quieter words. */
  quiet?: boolean;
  first?: boolean;
};

function Row({ href, onClick, label, value, sub, sub2, quiet, first }: RowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-caption text-paper/50">{label}</span>
        <span
          className={
            quiet
              ? "mt-0.5 block font-sans text-ui italic text-paper/55"
              : "mt-0.5 block font-heading text-ui font-semibold leading-tight text-paper"
          }
        >
          {value}
        </span>
        {sub ? <span className="mt-1 block font-sans text-caption leading-snug text-paper/55">{sub}</span> : null}
        {sub2 ? <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/55">{sub2}</span> : null}
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
          className="shrink-0 text-paper/35"
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
        <Link href={href} onClick={onClick} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-paper/[0.04]">
          {body}
        </Link>
      ) : onClick ? (
        // A row that does something here rather than going somewhere: the
        // readings read aloud.
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-paper/[0.04]"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">{body}</div>
      )}
    </li>
  );
}
