"use client";

// The steps of an event, and its Thread (1.9, Purify Plus; lib/history/thread.ts
// says what it is and where its places come from).
//
// Every reader has the steps, as the plain dated list the article always
// had: they are the history itself, which the Plus row promises stays free.
// A reader without Plus sees, under it, the way to follow them as a Thread,
// with the Plus mark (a Plus feature is never hidden). A reader with Plus
// follows them as a Thread: drawn as a saint's Timeline is (the year, the
// line, a mark for each step, heavier at the turning points), with a small
// map pinned over them that moves to each step's place as the reader comes
// to it, the step being read marked on the line.
//
// The map is the history map's own outline, fetched once as a file
// (app/history-land.json) and only for the Thread. Its motion is a transform
// on the app's motion switch; without motion it is where it should be at once.

import { useEffect, useRef, useState } from "react";

import { PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import type { EventThreadData, ThreadPlace, ThreadStep } from "@/lib/history/thread";

export function EventThread({ thread }: { thread: EventThreadData }) {
  const { steps, home } = thread;
  const { t } = useTranslate();
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  if (!steps.length) return null;
  if (plus === true) return <Thread steps={steps} home={home} />;
  return (
    <>
      <PlainSteps steps={steps} />
      {plus === false ? (
        <button
          type="button"
          onClick={() => upgrade.open("history")}
          data-thread-invite=""
          className="tap-press mt-5 flex min-h-11 w-full items-center gap-3 rounded-[14px] bg-paper/[0.04] px-4 py-3 text-start ring-1 ring-inset ring-paper/10"
        >
          <span className="min-w-0 flex-1 font-sans text-detail font-semibold text-paper/85">{t("history.thread.invite")}</span>
          <PlusMark />
        </button>
      ) : null}
    </>
  );
}

/** The steps as the article has always listed them. */
function PlainSteps({ steps }: { steps: ThreadStep[] }) {
  return (
    <ol className="mt-4 space-y-4">
      {steps.map((e, i) => (
        <li key={i} className="md:grid md:grid-cols-[9.5rem_minmax(0,1fr)] md:gap-4">
          <p className={cn("font-sans text-caption font-semibold tabular-nums", e.pivotal ? "text-paper/85" : "text-paper/55")}>{e.date}</p>
          <p className={cn("mt-0.5 font-sans text-ui leading-[1.65] md:mt-0", e.pivotal ? "font-medium text-paper/95" : "text-paper/75")}>
            {e.text}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** The steps as a Thread: the line, the years, and the map that follows. The paywall's preview shows it too. */
export function Thread({ steps, home }: { steps: ThreadStep[]; home: ThreadPlace | null }) {
  const [current, setCurrent] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  // The step being read is the one crossing a band a little above the
  // screen's middle, under the pinned map: where the eye reads.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (seen) => {
        for (const e of seen) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-42% 0px -54% 0px" },
    );
    for (const row of rows.current) if (row) observer.observe(row);
    return () => observer.disconnect();
  }, [steps.length]);

  const last = steps.length - 1;
  return (
    <div className="event-thread mt-4" data-event-thread="">
      <ThreadMap steps={steps} home={home} current={current} />
      <ol className="mt-5">
        {steps.map((s, i) => {
          const line = s.place ? `${s.date} · ${s.place.name}` : s.date;
          return (
            <li
              key={i}
              ref={(el) => {
                rows.current[i] = el;
              }}
              data-step={i}
              aria-current={i === current ? "step" : undefined}
              className="grid grid-cols-[58px_22px_minmax(0,1fr)] pe-1"
            >
              <span className="pe-2 pt-px text-end font-sans text-[12.5px] font-semibold whitespace-nowrap tabular-nums text-paper/50">{s.year ?? ""}</span>
              <span aria-hidden className="relative">
                <span className={cn("absolute start-[10px] w-[1.5px] bg-paper/20", i === 0 ? "top-[7px]" : "top-0", i === last ? "h-[7px]" : "bottom-0")} />
                <span
                  className={cn(
                    "absolute rounded-full shadow-[0_0_0_4px_var(--color-night)] motion-safe:transition-transform motion-safe:duration-300",
                    s.pivotal ? "start-[5px] top-[4.5px] h-[11.5px] w-[11.5px] bg-paper" : "start-[6.25px] top-[5.75px] h-[9px] w-[9px] bg-paper/70",
                    i === current && "scale-[1.35]",
                  )}
                />
              </span>
              <div className="min-w-0 pb-[21px] ps-2">
                <p lang="en" dir="ltr" className="font-sans text-caption font-semibold text-paper/55">{line}</p>
                <p lang="en" dir="ltr" className={cn("mt-0.5 font-sans text-ui leading-[1.6]", s.pivotal ? "font-medium text-paper/95" : "text-paper/75")}>{s.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The frame, in the map's own units on the screen, and how much of the map it shows across. */
const FRAME = { w: 360, h: 150 } as const;
const ACROSS = 520;

/**
 * The small map pinned over the Thread: at the place of the step being read
 * when its words name one, its name on the map. A step that names none
 * leaves the map where the last named one put it (at first, the event's own
 * place), its mark dimmed and no name shown: the map never says a step
 * happened somewhere its words do not.
 */
function ThreadMap({ steps, home, current }: { steps: ThreadStep[]; home: ThreadPlace | null; current: number }) {
  const { t } = useTranslate();
  const [land, setLand] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/history-land.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { land?: string } | null) => {
        if (live && d?.land) setLand(d.land);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const own = steps[current]?.place ?? null;
  let last: ThreadPlace | null = null;
  for (let i = current; i >= 0 && !last; i -= 1) last = steps[i]?.place ?? null;
  const here = own ?? last ?? home;
  if (!here) return null;
  const places = unique([home, ...steps.map((s) => s.place)]);
  const k = FRAME.w / ACROSS;
  const move = `translate(${FRAME.w / 2 - here.x * k}px, ${FRAME.h / 2 - here.y * k}px) scale(${k})`;
  const label = own ? `${t("history.thread.map")}: ${own.name}` : t("history.thread.map");
  return (
    <div className="sticky top-[calc(var(--history-sticky-top)+0.5rem)] z-10 overflow-hidden rounded-[16px] bg-night-soft ring-1 ring-inset ring-paper/10" data-thread-map="">
      <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} role="img" aria-label={label} className="block h-[150px] w-full">
        <g style={{ transform: move }} className="motion-safe:transition-transform motion-safe:duration-700">
          {land ? <path d={land} className="fill-paper/[0.11]" /> : null}
          {places.map((p) => (
            <circle key={p.name} cx={p.x} cy={p.y} r={3 / k} className="fill-paper/40" />
          ))}
          <circle cx={here.x} cy={here.y} r={6.5 / k} className={own ? "fill-paper" : "fill-paper/45"} />
        </g>
      </svg>
      {own ? (
        <p aria-hidden className="absolute bottom-2.5 start-3 rounded-full bg-night/70 px-2.5 py-1 font-sans text-caption font-semibold text-paper">
          {own.name}
        </p>
      ) : null}
    </div>
  );
}

function unique(places: (ThreadPlace | null)[]): ThreadPlace[] {
  const seen = new Map<string, ThreadPlace>();
  for (const p of places) if (p && !seen.has(p.name)) seen.set(p.name, p);
  return [...seen.values()];
}
