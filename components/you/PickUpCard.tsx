"use client";

// Where you left off, on the You tab (1.8): the chapter, the work of the
// Fathers, the prayer and the reading plan a reader was last in, the most
// recent first, three at most. Until 1.8 it was the Bible's chapter alone.
//
// Drawn as the owner's pick A of r3-25 draws it (note 71, "the Ladder, then
// the day"): one lit card, the newest place large with its cover, its name,
// where it picks up, a bar for how far in, and a round white way in; the two
// after it as small rows with their covers under it. It was a list of three
// rows, the same weight as everything else on the tab.
//
// Each is read off the device, where the screens that write it keep it:
//   the chapter    purify:bible:last, at the verse in view (lib/bible/lastRead.ts)
//   the work       the reading history and how far in (lib/reading/history.ts,
//                  lib/reading/progress.ts); a finished work is not offered
//   the prayer     the prayers opened lately (lib/prayers/storage.ts)
//   the plan       the next day not read of a plan begun (lib/plans/progress.ts)
// A work opens where it was left: its reader resumes the section by itself.
// The covers are lib/you/covers.ts.

import Link from "next/link";
import { useLayoutEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { usePartWords } from "@/components/saints/partWords";
import { localBookNames } from "@/lib/bible/books";
import { readLastRead, type LastRead } from "@/lib/bible/lastRead";
import { cn } from "@/lib/cn";
import { dayLabel, getPlan } from "@/lib/plans/plans";
import { nextDay, usePlans } from "@/lib/plans/progress";
import { useRecentPrayers } from "@/lib/prayers/storage";
import { useReadingHistory } from "@/lib/reading/history";
import { useReadingProgress } from "@/lib/reading/progress";
import { saintNameOf } from "@/lib/saved/passages";
import { coverOf, type CoverSubject } from "@/lib/you/covers";
import { howFar, latestFirst, type Place } from "@/lib/you/you";

/** Each plan's name, a closed map of literal keys for the key test. */
const PLAN_NAME: Record<string, string> = {
  psalter: "plans.psalter.name",
  gospels: "plans.gospels.name",
  john: "plans.john.name",
  acts: "plans.acts.name",
  newtestament: "plans.newtestament.name",
  proverbs: "plans.proverbs.name",
  // Missing from 1.9's first Nativity build: a reader in the fast's plan was never offered it here.
  nativity: "plans.nativity.name",
  holyweek: "plans.holyweek.name",
};

type Row = Place & {
  href: string;
  title: string;
  detail?: string;
  note: string;
  /** How far in, 0 to 1, or null when the whole is not known. */
  far: number | null;
  cover: CoverSubject | null;
};

/** A civil day "YYYY-MM-DD" as a moment: its noon, local. */
const dayAt = (day: string) => Date.parse(`${day}T12:00:00`);

export function PickUpCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const { sayPill } = usePartWords();
  const history = useReadingHistory();
  const progress = useReadingProgress();
  const prayers = useRecentPrayers();
  const plans = usePlans();
  const [last, setLast] = useState<LastRead | null | undefined>(undefined);

  // Before the first paint, so the card arrives with the rest of the screen
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
        far: verse ? howFar(verse, last.totalVerses) : null,
        cover: { kind: "book", book: last.book },
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
        // The chapter by the work's own name (r3-29 A); a reading kept before it by its place.
        note: p?.pill ? sayPill(p.pill) : p && p.of > 1 ? t("saints.sectionOf", { n: p.i + 1, total: p.of }) : t("reading.continue"),
        far: p && p.of > 1 ? howFar(p.i + 1, p.of) : null,
        cover: e.saintSlug ? { kind: "saint", slug: e.saintSlug } : null,
      });
      break;
    }

    const prayer = prayers[0];
    if (prayer) {
      out.push({ key: "prayer", at: prayer.at, href: prayer.href, title: prayer.title, note: t("ui.continuePraying"), far: null, cover: { kind: "prayer" } });
    }

    for (const [id, state] of Object.entries(plans)) {
      const plan = getPlan(id);
      const name = PLAN_NAME[id];
      if (!plan || !name || !state?.startedOn) continue;
      const next = nextDay(plan, state);
      if (next === null) continue;
      const read = Object.values(state.done ?? {}).sort();
      const day = plan.days[next];
      out.push({
        key: `plan:${id}`,
        at: dayAt(read.at(-1) ?? state.startedOn),
        href: `/plans/${id}`,
        title: t(name),
        detail: dayLabel(day, bookName),
        note: t("plans.dayOf", { day: next + 1, total: plan.days.length }),
        far: howFar(next + 1, plan.days.length),
        cover: day?.[0] ? { kind: "book", book: day[0].book } : null,
      });
    }

    return latestFirst(out, 3);
  }, [last, history, progress, prayers, plans, t, sayPill]);

  if (rows.length === 0) return null;
  const [first, ...rest] = rows;
  const label = t("prayers.today.whereYouLeftOff");
  return (
    <section aria-label={label} data-you-pickup="" className={className}>
      <div className="you-lit lm-card relative overflow-hidden rounded-[22px]">
        <Link
          href={first.href}
          data-pickup={first.key.split(":")[0]}
          data-pickup-first=""
          className="tap-press relative flex items-center gap-3.5 p-4 motion-safe:transition-colors active:bg-paper/[0.04]"
        >
          <Cover subject={first.cover} width={58} height={74} className="rounded-[11px]" />
          <span className="min-w-0 flex-1">
            <span aria-hidden className="block font-sans text-caption text-paper/55">
              {label}
            </span>
            <span className="mt-[5px] block truncate font-heading text-[23px] font-bold leading-[1.15] text-paper">{first.title}</span>
            {first.detail ? <span className="mt-0.5 block truncate font-sans text-caption text-paper/55">{first.detail}</span> : null}
            <span className="mt-[5px] block truncate font-sans text-detail text-paper/60">{first.note}</span>
            {first.far !== null ? (
              <span aria-hidden className="mt-[11px] block h-[3px] rounded-[2px] bg-paper/10">
                <span className="you-progress-lit block h-full rounded-[2px] bg-paper" style={{ width: `${Math.max(first.far * 100, 2)}%` }} />
              </span>
            ) : null}
          </span>
          <span aria-hidden className="you-go grid size-11 shrink-0 place-items-center rounded-full bg-paper text-night">
            <Arrow />
          </span>
        </Link>
        {rest.map((r) => (
          <Link
            key={r.key}
            href={r.href}
            data-pickup={r.key.split(":")[0]}
            className="tap-press relative flex items-center gap-3 px-4 py-2.5 motion-safe:transition-colors active:bg-paper/[0.04]"
          >
            {/* The hairline between the rows, set in from both sides. */}
            <span aria-hidden className="absolute inset-x-4 top-0 h-px bg-paper/[0.07]" />
            <Cover subject={r.cover} width={32} height={40} className="rounded-[7px]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-sans text-ui font-semibold leading-snug text-paper">{r.title}</span>
              {r.detail ? <span className="mt-0.5 block truncate font-sans text-caption text-paper/55">{r.detail}</span> : null}
            </span>
            <span className="shrink-0 font-sans text-caption tabular-nums text-paper/50">{r.note}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** A place's cover: its book's or its saint's icon, the Pantocrator for a prayer, or the plate. */
function Cover({ subject, width, height, className }: { subject: CoverSubject | null; width: number; height: number; className?: string }) {
  const cover = coverOf(subject);
  return (
    <span aria-hidden className={cn("you-cover relative block shrink-0 overflow-hidden", className)} style={{ width, height }}>
      <CoverArt
        src={cover?.src ?? null}
        fallback={cover?.fallback}
        size={Math.max(width, height)}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: cover?.focus }}
      />
    </span>
  );
}

/** The way in: an arrow, turned for a page read right to left. */
function Arrow() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
      <path d="M5 12h13.5" />
      <path d="M13 6.5l5.5 5.5-5.5 5.5" />
    </svg>
  );
}
