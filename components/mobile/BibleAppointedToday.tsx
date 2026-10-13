"use client";

import { useMemo } from "react";
import { Reference } from "@/components/bible/Reference";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { readingsOn, readingsOptionsFor, readingsSourceOn, type ReadingRef } from "@/lib/calendar/orthodox";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useToday } from "@/lib/calendar/useToday";
import { IndexEyebrow, IndexList, IndexRow } from "./IndexRows";

/**
 * The Bible tab's "Appointed today" rows: the day's readings, one row each.
 *
 * Client-side because it is derived from the current day, and the Android
 * target is a static export where a server component answers that question
 * once, at build time.
 *
 * This one was MISSED by the Beta 2.7 day fix, which converted Today,
 * Discover, Prayers and /prayers/today and left the Bible tab on
 * `startOfDayUtc(new Date())` in a server component. That was worse than
 * leaving it alone: the Bible tab showed the build day's Gospel while the
 * Today tab, one tab away, showed the real day's. Two tabs, two different
 * appointed readings, same phone, same second.
 *
 * Renders nothing until the day resolves, which is one frame, rather than
 * showing a reading that might be wrong.
 *
 * Rows since 1.6 (IndexRows.tsx). Until then the Gospel was a band the size
 * of a third of the screen, with a round icon, three lines and a button, and
 * each other reading was a half width tile beside nothing. Today already
 * gives the day's readings that weight, one tab away. Here they are a way
 * into a chapter, on a tab whose job is the list of chapters, so they are
 * drawn as that list is: the reference, and which reading it is.
 */

const KIND_LABEL: Record<string, string> = {
  gospel: "bible.kindGospelLong",
  epistle: "bible.kindEpistleLong",
  ot: "bible.kindOtLong",
};

const href = (r: ReadingRef) => `/bible/${r.book}/${r.chapter}#v${r.from}`;

export function BibleAppointedToday() {
  const { t } = useTranslate();
  // The book of each reference, in the reader's language (lib/bible/books.ts).
  const books = localBookNames(t);
  const today = useToday();

  // "Appointed today" is lectionary language, and on most days the reading
  // here is not the lectionary's but the day's saints'. Said honestly since
  // 2026-09-25; see readingsSourceOn in lib/calendar/orthodox.ts.
  // From 1.6 the day's own Epistle and Gospel answer wherever the official
  // calendar holds the day, for a reader on the calendar that list is for
  // (readingsOptionsFor). The saint's reading that sits under them on Today
  // is left off here: these rows are the way into the day's reading.
  const [style] = useCalendarStyleDefault();
  const fixed = useMemo(
    () => (today ? readingsSourceOn(today, readingsOptionsFor(style)) === "fixed" : false),
    [today, style],
  );
  const appointed = useMemo(() => {
    if (!today) return [];
    const readings = readingsOn(today, readingsOptionsFor(style));
    // Gospel, then Epistle, then Old Testament: the order this tab has
    // always given them.
    return [
      readings.find((r) => r.kind === "gospel"),
      readings.find((r) => r.kind === "epistle"),
      readings.find((r) => r.kind === "ot"),
    ].filter(Boolean) as ReadingRef[];
  }, [today, style]);

  if (!appointed.length) return null;

  return (
    <section data-bible-readings="">
      <IndexEyebrow>{t(fixed ? "bible.readForCommemoration" : "bible.appointedToday")}</IndexEyebrow>
      <IndexList>
        {appointed.map((r, i) => (
          <IndexRow
            key={r.kind}
            first={i === 0}
            href={href(r)}
            left={<Reference>{referenceIn(r.label, r.book, books)}</Reference>}
            right={t(KIND_LABEL[r.kind])}
          />
        ))}
      </IndexList>
    </section>
  );
}
