"use client";

// Where you left off, on the You tab (1.8): the chapter, the work of the
// Fathers, the prayer and the reading plan a reader was last in, the most
// recent first, three at most. Until 1.8 it was the Bible's chapter alone.
//
// Each is read off the device, where the screens that write it keep it:
//   the chapter    purify:bible:last, at the verse in view (lib/bible/lastRead.ts)
//   the work       the reading history and how far in (lib/reading/history.ts,
//                  lib/reading/progress.ts); a finished work is not offered
//   the prayer     the prayers opened lately (lib/prayers/storage.ts)
//   the plan       the next day not read of a plan begun (lib/plans/progress.ts)
// A work opens where it was left: its reader resumes the section by itself.

import { useLayoutEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { YouList, YouRow, YouSection } from "@/components/you/YouList";
import { localBookNames } from "@/lib/bible/books";
import { readLastRead, type LastRead } from "@/lib/bible/lastRead";
import { dayLabel, getPlan } from "@/lib/plans/plans";
import { nextDay, usePlans } from "@/lib/plans/progress";
import { useRecentPrayers } from "@/lib/prayers/storage";
import { useReadingHistory } from "@/lib/reading/history";
import { useReadingProgress } from "@/lib/reading/progress";
import { saintNameOf } from "@/lib/saved/passages";
import { latestFirst, type Place } from "@/lib/you/you";

/** Each plan's name, a closed map of literal keys for the key test. */
const PLAN_NAME: Record<string, string> = {
  psalter: "plans.psalter.name",
  gospels: "plans.gospels.name",
  proverbs: "plans.proverbs.name",
};

type Row = Place & { href: string; title: string; detail?: string; note: string };

/** A civil day "YYYY-MM-DD" as a moment: its noon, local. */
const dayAt = (day: string) => Date.parse(`${day}T12:00:00`);

export function PickUpRows({ className }: { className?: string }) {
  const { t } = useTranslate();
  const history = useReadingHistory();
  const progress = useReadingProgress();
  const prayers = useRecentPrayers();
  const plans = usePlans();
  const [last, setLast] = useState<LastRead | null | undefined>(undefined);

  // Before the first paint, so the rows arrive with the rest of the screen
  // rather than a frame after it (the You tab draws this only on the device).
  useLayoutEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the
       last-read pointer lives in localStorage, read after mount. */
    setLast(readLastRead());
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (last === undefined) return [];
    const books = localBookNames(t);
    const bookName = (slug: string) => books[slug] ?? t(`bible.books.${slug}`);
    const out: Row[] = [];

    if (last) {
      const verse = last.verse > 1 ? last.verse : 0;
      out.push({
        key: "bible",
        at: last.ts,
        href: verse ? `/bible/${last.book}/${last.chapter}#v${verse}` : `/bible/${last.book}/${last.chapter}`,
        title: `${books[last.book] ?? last.bookName.charAt(0).toUpperCase() + last.bookName.slice(1)} ${last.chapter}`,
        note: !verse
          ? t("bible.continueReading")
          : last.totalVerses
            ? t("bible.continueAtVerseOf", { verse, total: last.totalVerses })
            : t("bible.continueAtVerse", { verse }),
      });
    }

    for (const e of history) {
      if (e.kind !== "work") continue;
      const key = e.href.replace(/^\/saints\//, "").replace(/\/$/, "");
      const p = progress[key];
      if (p?.done) continue;
      out.push({
        key: "work",
        at: Math.max(e.at, p?.at ?? 0),
        href: e.href,
        title: e.label,
        detail: e.saintSlug ? saintNameOf(e.saintSlug) : undefined,
        note: p && p.of > 1 ? t("saints.sectionOf", { n: p.i + 1, total: p.of }) : t("reading.continue"),
      });
      break;
    }

    const prayer = prayers[0];
    if (prayer) out.push({ key: "prayer", at: prayer.at, href: prayer.href, title: prayer.title, note: t("ui.continuePraying") });

    for (const [id, state] of Object.entries(plans)) {
      const plan = getPlan(id);
      const name = PLAN_NAME[id];
      if (!plan || !name || !state?.startedOn) continue;
      const next = nextDay(plan, state);
      if (next === null) continue;
      const read = Object.values(state.done ?? {}).sort();
      out.push({
        key: `plan:${id}`,
        at: dayAt(read.at(-1) ?? state.startedOn),
        href: `/plans/${id}`,
        title: t(name),
        detail: dayLabel(plan.days[next], bookName),
        note: t("plans.dayOf", { day: next + 1, total: plan.days.length }),
      });
    }

    return latestFirst(out, 3);
  }, [last, history, progress, prayers, plans, t]);

  if (rows.length === 0) return null;
  return (
    <YouSection title={t("prayers.today.whereYouLeftOff")} className={className} data-you-pickup="">
      <YouList>
        {rows.map((r, i) => (
          <YouRow key={r.key} first={i === 0} href={r.href} title={r.title} detail={r.detail} note={r.note} data-pickup={r.key.split(":")[0]} />
        ))}
      </YouList>
    </YouSection>
  );
}
