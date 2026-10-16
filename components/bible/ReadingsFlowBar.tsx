"use client";

// Today's readings in one go (1.7): on the chapter of the reading under
// way, the verses read today stand out and the rest of the chapter goes
// quiet, and a bar at the foot says where the reader is ("1 of 2 · Epistle")
// and offers the next reading, or "Done" after the last. lib/readings/flow.ts
// keeps the walk.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { localBookNames, referenceIn } from "@/lib/bible/books";
import {
  finishReadingsFlow,
  goToReading,
  hrefOf,
  inRanges,
  leaveReadingsFlow,
  useReadingsFlow,
  type FlowItem,
} from "@/lib/readings/flow";
import { softTick } from "@/lib/ui/softTick";

const QUIET = "0.38";

export function ReadingsFlowBar({ book, chapter }: { book: string; chapter: number }) {
  const { t } = useTranslate();
  const router = useRouter();
  const flow = useReadingsFlow();
  const [finished, setFinished] = useState(false);
  const item = flow?.items[flow.at];
  const here = Boolean(item && item.book === book && item.chapter === chapter);

  // The day's verses stand out; the rest of the chapter goes quiet.
  useEffect(() => {
    if (!here || !item) return;
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[id^='v']")).filter((el) => /^v\d+$/.test(el.id));
    for (const el of rows) {
      el.style.transition = "opacity 400ms ease";
      el.style.opacity = inRanges(Number(el.id.slice(1)), item.ranges) ? "" : QUIET;
    }
    return () => {
      for (const el of rows) el.style.opacity = "";
    };
  }, [here, item]);

  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(() => setFinished(false), 2600);
    return () => window.clearTimeout(id);
  }, [finished]);

  const kindName = (it: FlowItem) =>
    it.kind === "epistle" ? t("bible.kindEpistle") : it.kind === "ot" ? t("bible.kindOt") : t("bible.kindGospel");

  if (finished) {
    return (
      <Shell>
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-night">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.4 4.4L19 7.2" />
          </svg>
        </span>
        <p role="status" className="min-w-0 flex-1 font-sans text-ui font-semibold text-paper">
          {t("readingsFlow.finished")}
        </p>
      </Shell>
    );
  }
  if (!flow || !item || !here) return null;

  const books = localBookNames(t);
  const last = flow.at === flow.items.length - 1;
  const next = last ? null : flow.items[flow.at + 1];

  return (
    <Shell>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-caption text-paper/55">
          {t("readingsFlow.of", { n: flow.at + 1, total: flow.items.length })} · {kindName(item)}
        </p>
        <p className="truncate font-sans text-ui font-semibold text-paper">{referenceIn(item.label, item.book, books)}</p>
      </div>
      <button
        type="button"
        onClick={leaveReadingsFlow}
        aria-label={t("readingsFlow.leave")}
        className="tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper/50"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {next ? (
        <button
          type="button"
          onClick={() => {
            goToReading(flow.at + 1);
            router.push(hrefOf(next));
          }}
          className="tap-press h-11 shrink-0 rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night"
        >
          {t("readingsFlow.next", { what: kindName(next) })}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            finishReadingsFlow();
            softTick();
            setFinished(true);
          }}
          className="tap-press h-11 shrink-0 rounded-pill bg-paper px-5 font-sans text-caption font-semibold text-night"
        >
          {t("readingsFlow.done")}
        </button>
      )}
    </Shell>
  );
}

/**
 * At the foot, over the tab bar and over the mini player when one plays.
 * While it is up it says so on <html> (.has-readings-flow, globals.css), as
 * the mini player does, so the way out of focus mode stands above it.
 */
function Shell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-readings-flow");
    return () => root.classList.remove("has-readings-flow");
  }, []);
  return (
    <div
      className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[54] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-4"
      style={{ transform: "translateY(calc(-1 * var(--now-playing-h, 0px)))" }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-[18px] bg-night-soft py-2 pl-4 pr-2 shadow-[0_14px_34px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-paper/10">
        {children}
      </div>
    </div>
  );
}
