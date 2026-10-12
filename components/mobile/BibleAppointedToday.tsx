"use client";

import { useMemo } from "react";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { readingsOn, readingsOptionsFor, readingsSourceOn, type ReadingRef } from "@/lib/calendar/orthodox";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useToday } from "@/lib/calendar/useToday";
import { SoftTile, SoftTileGrid, FeatureBand } from "./SoftTiles";
import { Book } from "@/components/ui/icons/Book";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Codex } from "@/components/ui/icons/Codex";

/**
 * The Bible tab's "Appointed today" band.
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
 */

// `fixedSubKey` is used on the days the reading comes from the date's own
// table (the saints and feasts), which is most days: see readingsSourceOn.
const KIND_META: Record<
  string,
  {
    labelKey: string;
    subKey: string;
    fixedSubKey: string;
    icon: (s: number) => React.ReactNode;
  }
> = {
  gospel: {
    labelKey: "bible.kindGospelLong",
    subKey: "bible.appointedGospelSub",
    fixedSubKey: "bible.commemorationGospelSub",
    icon: (s) => <Book size={s} />,
  },
  epistle: {
    labelKey: "bible.kindEpistleLong",
    subKey: "bible.appointedEpistleSub",
    fixedSubKey: "bible.commemorationEpistleSub",
    icon: (s) => <Scroll size={s} />,
  },
  ot: {
    labelKey: "bible.kindOtLong",
    subKey: "bible.appointedOtSub",
    fixedSubKey: "bible.commemorationOtSub",
    icon: (s) => <Codex size={s} />,
  },
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
  // is left off here: this band is the way into the day's reading.
  const [style] = useCalendarStyleDefault();
  const fixed = useMemo(
    () => (today ? readingsSourceOn(today, readingsOptionsFor(style)) === "fixed" : false),
    [today, style],
  );
  const appointed = useMemo(() => {
    if (!today) return [];
    const readings = readingsOn(today, readingsOptionsFor(style));
    // Ordered Gospel, then Epistle, then Old Testament: the first becomes
    // the featured band, any others sit beside it as soft tiles.
    return [
      readings.find((r) => r.kind === "gospel"),
      readings.find((r) => r.kind === "epistle"),
      readings.find((r) => r.kind === "ot"),
    ].filter(Boolean) as ReadingRef[];
  }, [today, style]);

  if (!appointed.length) return null;
  const [lead, ...rest] = appointed;

  return (
    <>
      <div className="mt-3">
        <FeatureBand
          href={href(lead)}
          eyebrow={t(fixed ? "bible.readForCommemoration" : "bible.appointedToday")}
          title={referenceIn(lead.label, lead.book, books)}
          sub={t(fixed ? KIND_META[lead.kind].fixedSubKey : KIND_META[lead.kind].subKey)}
          cta={t("saints.read")}
          icon={KIND_META[lead.kind].icon(18)}
        />
      </div>

      {rest.length > 0 && (
        <SoftTileGrid className="mt-3">
          {rest.map((r, i) => (
            <SoftTile
              key={r.kind}
              href={href(r)}
              label={t(KIND_META[r.kind].labelKey)}
              sub={referenceIn(r.label, r.book, books)}
              icon={KIND_META[r.kind].icon(21)}
              tone={i === 0 ? "b" : "c"}
            />
          ))}
        </SoftTileGrid>
      )}
    </>
  );
}
