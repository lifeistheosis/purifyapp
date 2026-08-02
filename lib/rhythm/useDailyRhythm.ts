"use client";

// The rule of life for today, as data. One model, so the native Today tab and
// /prayers/today can agree on the facts while keeping their own layouts.
//
// Composes `useChurchDay()` rather than resolving its own day. That is not a
// tidiness preference: `useToday()` owns the midnight timer and the
// visibilitychange/focus resync that catches a backgrounded phone whose timers
// were suspended. A second clock in here would drift from the saint and the
// fast shown beside it, which is the exact bug useChurchDay was created to end.
//
// Null until mounted, for the same reason everything day-dependent is: under
// `output: "export"` a server render answers "what day is it" once, at build
// time, and the APK shows the build day forever.
//
// Nothing here decides how a kept strand LOOKS. That belongs to the surface.
// `keptCount` exists so a layout can sort kept strands below unkept ones; it
// is never to be rendered as a number, a score, or a fraction.

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useChurchDay, type ChurchDay } from "@/lib/calendar/useChurchDay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { readLastRead } from "@/lib/bible/lastRead";
import { lessonsFor } from "@/lib/prayers/learning";
import { PRAYER_EVENT } from "@/lib/prayers/storage";
import { keyOf } from "./dayKey";
import { isKept, rhythm, strandKey, type StrandId } from "./marks";

export type Strand = {
  id: StrandId;
  /** The id this strand is stored under. Pass to markKept / unmark. */
  storageId: string;
  kept: boolean;
  /**
   * False when the day simply does not offer this strand: no appointed
   * Gospel, no saint profile, nothing read yet to continue. An unavailable
   * strand is absent from the surface. It is never shown as missed.
   */
  available: boolean;
  href: string;
  /** Oldest first, ending today. Fourteen days. */
  rhythm: { date: string; kept: boolean }[];
};

export type DailyRhythm = {
  day: ChurchDay;
  dayKey: string;
  strands: Strand[];
  /** For ORDERING ONLY. Never render this. */
  keptCount: number;
};

/** Re-read on any prayer mark, from this tab or another. */
function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PRAYER_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PRAYER_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// A counter, not a snapshot of the data. getSnapshot must be referentially
// stable between changes, and any object read out of localStorage is a fresh
// identity every call, which sends React into an update loop.
let version = 0;
function bumpVersion() {
  version += 1;
}
function getVersion() {
  return version;
}
function getServerVersion() {
  return 0;
}

export function useDailyRhythm(): DailyRhythm | null {
  const day = useChurchDay();
  const { locale } = useTranslate();

  const onStoreChange = useCallback((cb: () => void) => {
    return subscribe(() => {
      bumpVersion();
      cb();
    });
  }, []);
  const v = useSyncExternalStore(onStoreChange, getVersion, getServerVersion);

  return useMemo(() => {
    if (!day) return null;
    void v; // the dependency that re-reads localStorage after a mark

    // The CIVIL day, always, even for the saint strand. useChurchDay shifts
    // the menologion 13 days for Julian readers; filing a mark under that
    // shifted day would move a reader's whole history the moment they change
    // reckoning. Display is shifted, storage is not.
    const dayKey = keyOf(day.today);

    // Which rule is being offered right now. Before noon the morning rule,
    // after it the evening one. The strand counts as kept if EITHER was
    // prayed today, because the question a rhythm asks is "did you pray",
    // not "did you pray the one we happened to show you".
    const hour = new Date().getHours();
    const activeRule = hour < 12 ? "morning" : "evening";
    const prayerKept =
      isKept("morning", dayKey) || isKept("evening", dayKey);

    const gospel = day.readings.find((r) => r.kind === "gospel");
    const last = readLastRead();

    // A stable lesson per day: the same reader opening twice sees the same
    // teaching. Derived from the day itself so it cannot freeze at build time.
    const lessons = lessonsFor(locale);
    const lesson =
      lessons.length > 0
        ? lessons[
            Math.floor(day.today.getTime() / 86_400_000) % lessons.length
          ]
        : null;

    const strands: Strand[] = [
      {
        id: "prayer",
        storageId: activeRule,
        kept: prayerKept,
        available: true,
        href: `/prayers/${activeRule}`,
        rhythm: mergeRhythm(
          rhythm("morning", day.today),
          rhythm("evening", day.today),
        ),
      },
      {
        id: "gospel",
        storageId: strandKey("gospel"),
        kept: isKept(strandKey("gospel"), dayKey),
        available: !!gospel,
        href: gospel
          ? `/bible/${gospel.book}/${gospel.chapter}#v${gospel.from}`
          : "/bible",
        rhythm: rhythm(strandKey("gospel"), day.today),
      },
      {
        id: "saint",
        storageId: strandKey("saint"),
        kept: isKept(strandKey("saint"), dayKey),
        available: !!day.headlineSaint,
        href: day.headlineSaint ? `/saints/${day.headlineSaint.slug}` : "/calendar",
        rhythm: rhythm(strandKey("saint"), day.today),
      },
      {
        id: "reading",
        storageId: strandKey("reading"),
        kept: isKept(strandKey("reading"), dayKey),
        available: !!last,
        href: last ? `/bible/${last.book}/${last.chapter}` : "/bible",
        rhythm: rhythm(strandKey("reading"), day.today),
      },
      {
        id: "teaching",
        storageId: strandKey("teaching"),
        kept: isKept(strandKey("teaching"), dayKey),
        available: !!lesson,
        href: lesson ? `/prayers/learning/${lesson.id}` : "/prayers/learning",
        rhythm: rhythm(strandKey("teaching"), day.today),
      },
    ];

    return {
      day,
      dayKey,
      strands,
      keptCount: strands.filter((s) => s.available && s.kept).length,
    };
  }, [day, locale, v]);
}

/** A day counts in the prayer rhythm if either rule was kept on it. */
function mergeRhythm(
  a: { date: string; kept: boolean }[],
  b: { date: string; kept: boolean }[],
): { date: string; kept: boolean }[] {
  const other = new Map(b.map((x) => [x.date, x.kept]));
  return a.map((x) => ({ date: x.date, kept: x.kept || !!other.get(x.date) }));
}
