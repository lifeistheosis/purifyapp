"use client";

// The day under the one search's doors, with nothing typed (1.8, r3-31 B,
// the owner's pick of 2026-10-31; lib/search/day.ts chooses what each place
// shows). Read through lib/calendar/useChurchDay.ts, the app's one reading
// of the day, so the reader's own reckoning holds here as on Today: an Old
// Calendar reader sees the saints of the day his calendar keeps.
//
// Fetched on the search's first opening, as the reference reader is
// (components/search/CommandPalette.tsx): the calendar carries the year's
// saints and readings, and a screen mounted on every page must not put them
// on each. Until it is here the screen holds this block's room
// (components/search/SearchRows.tsx, DayBlock), so nothing moves as it comes.

import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Hands } from "@/components/ui/icons/Hands";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import type { ReadingRef } from "@/lib/calendar/orthodox";
import { hoursTimeline, litNow } from "@/lib/prayers/dayTimeline";
import { dayWalk, goToReading, hrefOf, startReadingsFlow } from "@/lib/readings/flow";
import { DAY_EYEBROW, DAY_SLOTS, READING_KIND_LABEL, dayRows, type DayEvent, type DayHour, type DayRow } from "@/lib/search/day";
import type { DoorId } from "@/lib/search/places";

import { DayBlock, DayLine } from "./SearchRows";

/** The Hour the clock is in when the screen opens; undefined until it has looked. */
function useHourNow(): DayHour | null | undefined {
  const [hour, setHour] = useState<DayHour | null | undefined>(undefined);
  /* eslint-disable react-hooks/set-state-in-effect -- the clock is read once
     the screen is open, as the Hours' timeline reads it
     (components/prayers/DayTimeline.tsx): client-only, never at build time. */
  useEffect(() => {
    const lit = litNow(new Date()).hour;
    setHour(hoursTimeline().find((h) => h.id === lit) ?? null);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  return hour;
}

/**
 * History's On this day, read only when the search is turned to History:
 * its register of events is fetched then, and not with the rest of the day.
 * Null until it has answered.
 */
function useEventsOn(today: Date | null): DayEvent[] | null {
  const [found, setFound] = useState<{ day: number; events: DayEvent[] } | null>(null);
  useEffect(() => {
    if (!today) return;
    let alive = true;
    const mmdd = `${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    import("@/lib/history/events")
      .then((m) => m.historyEventsOn(mmdd).map((e) => ({ slug: e.slug, title: e.title, displayDate: e.displayDate })))
      .catch(() => [])
      .then((events) => {
        if (alive) setFound({ day: today.getTime(), events });
      });
    return () => {
      alive = false;
    };
  }, [today]);
  return today && found && found.day === today.getTime() ? found.events : null;
}

export function SearchDay({ door, onGo }: { door: DoorId; onGo: (href: string) => void }) {
  const { t } = useTranslate();
  const church = useChurchDay();
  const hour = useHourNow();
  const events = useEventsOn(door === "history" ? (church?.today ?? null) : null);
  const books = localBookNames(t);
  const slots = DAY_SLOTS[door] ?? 0;
  const eyebrow = DAY_EYEBROW[door];

  const ready = church !== null && hour !== undefined && (door !== "history" || events !== null);
  const rows = useMemo<DayRow[]>(
    () =>
      church && hour !== undefined
        ? dayRows(door, { today: church.today, readings: church.readings, commemorations: church.commemorations, hour, events: events ?? [] })
        : [],
    [church, door, events, hour],
  );
  if (!slots || !eyebrow) return null;

  const reference = (r: ReadingRef) => referenceIn(r.label, r.book, books);
  // A reading opens the day's walk at it, as Today's readings do
  // (lib/readings/flow.ts): Next leads on through the rest of the day.
  const read = (at: number) => {
    if (!church) return;
    const walk = dayWalk(church);
    if (!walk[at]) return;
    startReadingsFlow(walk);
    if (at > 0) goToReading(at);
    onGo(hrefOf(walk[at]));
  };

  const line = (row: DayRow, i: number) => {
    switch (row.kind) {
      case "reading":
        return <DayLine key={i} glyph={Book} title={reference(row.reading)} sub={t(READING_KIND_LABEL[row.reading.kind])} onOpen={() => read(row.at)} />;
      case "readings":
        return <DayLine key={i} glyph={Book} title={row.readings.map(reference).join(" · ")} sub={t("calendar.todaysReadings")} onOpen={() => read(0)} />;
      case "saint": {
        const icon = row.saint.saint?.iconUrl;
        return (
          <DayLine
            key={i}
            glyph={HaloedHead}
            face={icon ? { src: icon, name: row.saint.name } : undefined}
            title={row.saint.name}
            sub={door === "all" ? t("prayers.today.commemoratedToday") : (row.saint.note ?? row.saint.saint?.epithet)}
            onOpen={() => onGo(row.href)}
          />
        );
      }
      case "hour":
        return (
          <DayLine
            key={i}
            glyph={Hands}
            title={t(row.hour.titleKey)}
            sub={row.hour.minutes ? t("today.minRead", { count: row.hour.minutes }) : undefined}
            onOpen={() => onGo(row.hour.href)}
          />
        );
      case "event":
        return <DayLine key={i} glyph={Hourglass} title={row.event.title} sub={row.event.displayDate} onOpen={() => onGo(row.href)} />;
    }
  };

  return (
    <DayBlock eyebrow={t(eyebrow)} slots={slots}>
      {ready && rows.length ? rows.map(line) : undefined}
    </DayBlock>
  );
}
