"use client";

// The row of an event's parts (1.7, the owner's note 20: "it needs better
// structure"). Every event page is in the same four parts, What happened,
// Why it matters, The people and Sources, and this row, pinned under the bar,
// names them: a tap goes to a part, and the part being read is filled. The
// whole account stays one page to read down, as history is read; the row
// is a way through it, not a switch that hides the rest.
//
// The look is the app's segmented switch (components/ui/SegmentedSwitch.tsx),
// in short words so four fit a phone, and it holds its words the same way: a
// part is never cut, the parts are equal while every word fits its share, and
// a longer word takes what it needs (1.9, the arbiter's of 2026-11-10). In
// equal quarters, 22 words were cut in fourteen languages at 390 and 360
// pixels (German lost three of four). Four parts are tight, so each part's
// padding is 4 pixels a side, not 8: measured with the export's own fonts in
// all twenty-one languages, every row then holds its words at 390, 360 and
// 320 pixels. At 320 five needed shorter words for it, each measured in this
// row (German Hergang and Sinn, Bulgarian Извори, Filipino Batis, Georgian
// აზრი, Hungarian Jelentés and Alakok). Should a row ever not hold its words,
// it scrolls inside its rim; nothing is cut.
// It is a list of links, not tabs: every
// part is always there. A tap moves the page and never the history, so Back
// still leaves the page. Solid, never blurred (a blurred layer over moving
// text is repainted on every frame on Android).

import { useEffect, useState, type MouseEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { partJumpTop } from "@/lib/history/scroll";
import { scrollBehavior } from "@/lib/ui/motion";

export type EventPart = { id: string; labelKey: string };

export function EventPartsNav({ parts }: { parts: EventPart[] }) {
  const { t } = useTranslate();
  const [current, setCurrent] = useState(parts[0]?.id);
  const key = parts.map((p) => p.id).join(" ");

  // The part whose top has passed the foot of this row is the one being read.
  // One observer on the parts, a band one pixel tall at that line: it speaks
  // only when a part's edge crosses it, never on each frame.
  useEffect(() => {
    const ids = key.split(" ");
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    const row = document.querySelector<HTMLElement>("[data-event-parts]");
    if (!sections.length || !row || typeof IntersectionObserver === "undefined") return;
    const line = Math.round(row.getBoundingClientRect().height + (parseFloat(getComputedStyle(row).top) || 0)) + 1;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent((entry.target as HTMLElement).id);
        }
      },
      { rootMargin: `-${line}px 0px -${Math.max(0, window.innerHeight - line - 1)}px 0px`, threshold: 0 },
    );
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [key]);

  // The thread map (components/history/EventThread.tsx) pins a little below
  // the same line as this row, later in the page, and is drawn over it: at
  // rest the row's pill showed at the map's sides, and on the way the map
  // slid over the pinned row (Gate 2.0's run, 2026-11-13, Alaska's mission).
  // So while the map stands over the row, the row steps aside, as the bars
  // at the foot step aside for a toast; where the map is not over it, as at
  // the top of the page, nothing changes. One read of the two boxes a frame,
  // only while the page scrolls.
  const [underMap, setUnderMap] = useState(false);
  useEffect(() => {
    const row = document.querySelector<HTMLElement>("[data-event-parts]");
    if (!row) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      // Asked each time: the map is drawn after this row (the walk found it absent at first).
      const map = document.querySelector<HTMLElement>("[data-thread-map]");
      if (!map) return setUnderMap(false);
      const r = row.getBoundingClientRect();
      const m = map.getBoundingClientRect();
      setUnderMap(m.top < r.bottom - 1 && m.bottom > r.top + 1);
    };
    const onMove = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    onMove();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);

  function go(e: MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    const row = e.currentTarget.closest<HTMLElement>("[data-event-parts]");
    if (!el || !row) return;
    e.preventDefault();
    // The part's top to the foot of this row, pinned (lib/history/scroll.ts:
    // scrollIntoView added the page's scroll padding and landed it low). The
    // page has the room to get there on a tall screen too (globals.css, the
    // box under the last part, 1.7.1), and the row pins under the bar and
    // the status bar's inset (--history-sticky-top). The page glides there on
    // the house's motion, as a change inside a page moves (the owner's ruling
    // of 2026-11-13); still where motion is off (Gate 2.0's run: four cuts).
    window.scrollTo({
      top: partJumpTop({
        scrollY: window.scrollY,
        partTop: el.getBoundingClientRect().top,
        rowTop: parseFloat(getComputedStyle(row).top) || 0,
        rowHeight: row.getBoundingClientRect().height,
      }),
      behavior: scrollBehavior(),
    });
    setCurrent(id);
  }

  if (parts.length < 2) return null;

  return (
    <nav
      data-event-parts
      data-under-map={underMap ? "" : undefined}
      aria-label={t("study.history.partsNav")}
      className={cn(
        "history-era-head -mx-5 px-5 py-2 md:-mx-8 md:px-8 motion-safe:transition-opacity motion-safe:duration-200",
        underMap && "pointer-events-none opacity-0",
      )}
    >
      <ul className="no-scrollbar mx-auto grid max-w-[460px] grid-flow-col auto-cols-[minmax(max-content,1fr)] gap-1 overflow-x-auto rounded-pill border border-paper/10 p-1 md:mx-0">
        {parts.map((part) => {
          const on = part.id === current;
          return (
            <li key={part.id}>
              <a
                href={`#${part.id}`}
                onClick={(e) => go(e, part.id)}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "tap-press flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-pill px-1 font-sans text-detail font-semibold motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                  on ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
                )}
              >
                <span>{t(part.labelKey)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
