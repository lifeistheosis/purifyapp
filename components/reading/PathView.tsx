"use client";

// A reading path (1.8): its name and what it is, then its days, each a
// reading or two of the Fathers' own words with how long it takes, opening
// where it stands, and "Mark as read". The days read are kept on the device
// (purify:path:<id>), so the path remembers where the reader is without an
// account. Every word around the readings is looked up here, in the reader's
// language; the works keep their English titles, as the library has them.

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { pathKey as keyOf, readPathDone as readDone } from "@/lib/reading/pathProgress";
import type { PathView as View } from "@/lib/reading/pathView";

import { readingTime } from "./CoverRow";
import { DayThread } from "./DayThread";
import { ReadTogether, useCircles } from "./ReadTogether";

export function PathView({ path }: { path: View }) {
  const { t } = useTranslate();
  const [done, setDone] = useState<number[]>([]);
  // Read once the page has woken: the server has no device to read.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDone(readDone(path.id)), [path.id]);
  // Read together (1.8): the reader's circles on this path, and the day whose
  // conversation is open.
  const circles = useCircles(path.id);
  const [thread, setThread] = useState<number | null>(null);
  const circle = circles.circles?.[0] ?? null;

  function toggle(i: number) {
    const wasRead = done.includes(i);
    const next = wasRead ? done.filter((n) => n !== i) : [...done, i].sort((a, b) => a - b);
    setDone(next);
    try {
      window.localStorage.setItem(keyOf(path.id), JSON.stringify(next));
    } catch {
      /* a private window: the path just will not remember */
    }
    circles.mark(i + 1, !wasRead);
  }

  return (
    <section className="bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <header>
          <p className="font-sans text-caption font-semibold text-paper/55">{t("paths.title")}</p>
          <h1 id="path-title" className="mt-3 font-serif text-display-sm font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display">
            {t(`paths.${path.id}.name`)}
          </h1>
          <p className="mt-5 max-w-[60ch] font-serif text-body leading-[1.75] text-paper/80">{t(`paths.${path.id}.body`)}</p>
          <p className="mt-3 font-sans text-caption text-paper/50">{t("paths.progress", { done: done.length, total: path.days.length })}</p>
        </header>
        <ReadTogether pathId={path.id} state={circles} />
        <ol className="mt-8 divide-y divide-paper/[0.07]">
          {path.days.map((day, i) => {
            const read = done.includes(i);
            const readers = circles.readersOf(i + 1);
            return (
              <li key={i} id={`day-${i + 1}`} data-path-day={i + 1} className="scroll-mt-24 py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-sans text-caption font-semibold text-paper/55">{t("paths.day", { n: i + 1 })}</p>
                  <p className="font-sans text-caption text-paper/45">{readingTime(day.minutes, t)}</p>
                </div>
                <ul className="mt-2 space-y-2">
                  {day.readings.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href} className={`group block ${read ? "opacity-60" : ""}`}>
                        <span lang="en" className="block font-serif text-title-sm font-semibold leading-tight text-paper group-hover:underline">
                          {r.title}
                        </span>
                        <span className="mt-0.5 block font-sans text-caption text-paper/55">
                          {[r.author, r.part ? t("paths.part", { n: r.part.n, total: r.part.of }) : null].filter(Boolean).join(" · ")}
                          {r.place ? (
                            <>
                              {r.author || r.part ? " · " : null}
                              <span lang="en">{r.place}</span>
                            </>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  aria-pressed={read}
                  onClick={() => toggle(i)}
                  className="tap-press hit-44 mt-3 inline-flex h-9 items-center rounded-pill border border-paper/15 px-4 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper aria-pressed:border-paper/35 aria-pressed:text-paper"
                >
                  {read ? t("paths.read") : t("paths.markRead")}
                </button>
                {readers.length ? (
                  <p className="mt-2 font-sans text-caption text-paper/55">{t("together.readBy", { names: readers.join(", ") })}</p>
                ) : null}
                {circle ? (
                  <button
                    type="button"
                    onClick={() => setThread(i + 1)}
                    className="tap-press mt-1 inline-flex min-h-11 items-center font-sans text-caption font-semibold text-paper/70 underline-offset-4 hover:underline"
                  >
                    {t("together.talk")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
        <DayThread circle={circle} day={thread ?? 1} open={thread !== null} onClose={() => setThread(null)} />
      </div>
    </section>
  );
}

/** The paths, as a list of doors (the index page). */
export function PathList({ paths }: { paths: { id: string; days: number; minutes: number }[] }) {
  const { t, tn } = useTranslate();
  return (
    <section className="bg-night px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <header>
          <h1 id="paths-title" className="font-serif text-display-sm font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display">
            {t("paths.title")}
          </h1>
          <p className="mt-5 max-w-[60ch] font-serif text-body leading-[1.75] text-paper/80">{t("paths.intro")}</p>
        </header>
        <ul className="mt-8 divide-y divide-paper/[0.07]">
          {paths.map((p) => (
            <li key={p.id}>
              <Link href={`/reading/paths/${p.id}`} className="group block py-5">
                <span className="block font-serif text-title-sm font-semibold leading-tight text-paper group-hover:underline">{t(`paths.${p.id}.name`)}</span>
                <span className="mt-1 block max-w-[60ch] font-serif text-detail leading-[1.6] text-paper/70">{t(`paths.${p.id}.body`)}</span>
                <span className="mt-1 block font-sans text-caption text-paper/50">
                  {tn("today.paschaDays", p.days)} · {readingTime(p.minutes, t)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
