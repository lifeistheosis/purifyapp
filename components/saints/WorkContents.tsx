"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { ShareWorkRow } from "@/components/reading/ShareWorkRow";
import { Book } from "@/components/ui/icons/Book";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import type { WorkShare } from "@/lib/reading/shareWork";
import type { ContentsEntry, SectionHead } from "@/lib/saints/parts";
import { scrollBehavior } from "@/lib/ui/motion";

/** The sheet's own row: About this book, and Share under it. */
const ROW =
  "inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10";

import { usePartWords } from "./partWords";

/**
 * A work's contents, as the Bible's books sheet (1.8, the owner's pick A of
 * r3-29; components/bible/MobileChapterSheet.tsx), opened by the chapter's
 * title and the pill's name:
 *
 *  - About this book at the top: the book's page, its cover, what it is and
 *    More like this (components/saints/AboutBook.tsx). Under it Share, the
 *    work itself to the phone's share sheet (1.9, build 95 note 15:
 *    components/reading/ShareWorkRow.tsx).
 *  - A work in two levels lists its larger parts as the Bible lists its
 *    books, "Conference 10 · 14 ch", the one being read opened at its
 *    chapters as a grid, the chapter being read lit white (.reader-lit; ink
 *    on Parchment) with its own title under the grid. A part the edition
 *    leaves out stands in its place, quiet: "Conference 12, Not in this
 *    edition". A tap on another part opens its grid in its place, and keeps
 *    the row where the finger is.
 *  - A work in one level is one grid, "Homily 15" lit.
 *  - A section known by its own title (a preface, a work whose parts are not
 *    numbered) is a row of its own.
 *  - A work of one section has nothing to choose, and no list: until build
 *    95 note 15 its empty list's border stood under About this book as a
 *    rule before nothing (The Paschal Homily, his first screenshot).
 *
 * The names are the work's own (lib/saints/parts.ts), the same the head and
 * the pill say. Choosing closes the sheet and opens the chapter, in the same
 * page (its address, #sN): the works' parts as pages of their own would not
 * fit the apps' 240 MB. It rises as every sheet does; with motion off it is
 * simply there.
 */
export function WorkContents({
  open,
  onClose,
  title,
  entries,
  heads,
  current,
  onGo,
  onAbout,
  share,
}: {
  open: boolean;
  onClose: () => void;
  /** The work's title, the sheet's. */
  title: string;
  entries: readonly ContentsEntry[];
  heads: readonly SectionHead[];
  /** The section being read. */
  current: number;
  onGo: (n: number) => void;
  /** About this book; none where the work has no book's page. */
  onAbout?: () => void;
  /** The work, as Share hands it on (lib/reading/shareWork.ts). */
  share?: WorkShare;
}) {
  const { t } = useTranslate();
  const { say } = usePartWords();
  const head = heads.find((h) => h.n === current) ?? null;
  // The part whose chapters show. Each opening starts on the one being read.
  const [openKey, setOpenKey] = useState<string | null>(head?.group ?? null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenKey(head?.group ?? null);
  }

  const list = useRef<HTMLDivElement | null>(null);
  const tapped = useRef<{ key: string; top: number } | null>(null);

  // As the sheet opens: the part being read in the middle of what it shows.
  const placeList = useCallback((el: HTMLDivElement | null) => {
    list.current = el;
    const scroller = el?.parentElement;
    const block = el?.querySelector<HTMLElement>("[data-open-part]")?.parentElement ?? el?.querySelector<HTMLElement>("[aria-current='page']");
    if (!scroller || !block) return;
    const s = scroller.getBoundingClientRect();
    const b = block.getBoundingClientRect();
    scroller.scrollTop = Math.max(0, b.top - s.top + scroller.scrollTop - Math.max(0, (s.height - b.height) / 2));
  }, []);

  function toggle(key: string, row: HTMLElement) {
    tapped.current = { key, top: row.getBoundingClientRect().top };
    setOpenKey((now) => (now === key ? null : key));
  }

  // A grid closing above the row would lift it from under the finger: put it
  // back, then bring the opened grid into view if it runs past the foot.
  useLayoutEffect(() => {
    const was = tapped.current;
    tapped.current = null;
    const scroller = list.current?.parentElement;
    const row = was ? list.current?.querySelector<HTMLElement>(`[data-part="${was.key}"]`) : null;
    if (!was || !scroller || !row) return;
    scroller.scrollBy({ top: row.getBoundingClientRect().top - was.top, behavior: "instant" });
    const grid = openKey === was.key ? row.nextElementSibling : null;
    if (!grid) return;
    const s = scroller.getBoundingClientRect();
    const over = grid.getBoundingClientRect().bottom + 12 - s.bottom;
    const room = row.getBoundingClientRect().top - s.top;
    if (over > 0 && room > 0) scroller.scrollBy({ top: Math.min(over, room), behavior: scrollBehavior() });
  }, [openKey]);

  function go(n: number) {
    onClose();
    if (n !== current) onGo(n);
  }

  const caption = head?.caption ?? null;
  const lead =
    onAbout || share ? (
      <div className="mb-2 space-y-2.5">
        {onAbout ? (
          <button
            type="button"
            aria-haspopup="dialog"
            data-about-book=""
            onClick={() => {
              onClose();
              onAbout();
            }}
            className={ROW}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Book size={16} className="shrink-0" />
              <span className="truncate">{t("bible.aboutThisBook")}</span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
          </button>
        ) : null}
        {share ? <ShareWorkRow share={share} className={ROW} onShared={onClose} /> : null}
      </div>
    ) : undefined;

  /**
   * A grid of chapters or parts, the one being read lit, its title under it.
   * As many columns as fit at 44px or more each, never a fixed seven: seven
   * were 41.5px wide on a 390px phone, under the 44px a finger needs (the
   * walk of note 15, 2026-11-13; lib/reading/__tests__/shareWork.test.ts).
   */
  const grid = (id: string, cells: { n: number; label: number }[], name: (label: number) => string) => {
    const lit = cells.find((c) => c.n === current);
    return (
      <div id={id} className="bg-paper/[0.05] px-3 pb-3.5 pt-1">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
          {cells.map((c) => {
            const reading = c.n === current;
            return (
              <li key={`${c.n}`}>
                <button
                  type="button"
                  aria-label={name(c.label)}
                  aria-current={reading ? "page" : undefined}
                  onClick={() => go(c.n)}
                  className={cn(
                    "h-11 w-full rounded-xl font-sans text-ui font-semibold tabular-nums motion-safe:transition-colors",
                    reading
                      ? "reader-lit bg-paper text-night"
                      : "bg-paper/[0.04] text-paper/80 ring-1 ring-inset ring-paper/[0.09] active:bg-paper/[0.16] active:text-paper",
                  )}
                >
                  {c.label}
                </button>
              </li>
            );
          })}
        </ul>
        {lit && caption ? (
          <p lang="en" dir="ltr" data-contents-caption="" className="px-1 pt-3 font-serif text-[15px] italic leading-[1.4] text-paper/72">
            <span className="me-1.5 font-sans text-caption font-semibold not-italic text-paper/50">{lit.label}</span>
            {caption}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} openFull desktop lead={lead}>
      <div ref={placeList} data-work-contents="">
        {/* A work of one section lists nothing: no box, not even its border. */}
        {entries.length ? (
          <ul className={INDEX_LIST_LOOK}>
            {entries.map((e, i) => {
              const first = i === 0;
              const line = first ? undefined : "border-t border-paper/[0.06]";
              if (e.kind === "row") {
                const reading = e.n === current;
                return (
                  <li key={`row-${e.n}`} className={line}>
                    <button
                      type="button"
                      aria-current={reading ? "page" : undefined}
                      onClick={() => go(e.n)}
                      className={cn(
                        "flex min-h-[46px] w-full items-center gap-3 px-4 py-2.5 text-start motion-safe:transition-colors active:bg-paper/[0.04]",
                        reading && "bg-paper/[0.05]",
                      )}
                    >
                      <span lang="en" dir="ltr" className={cn("min-w-0 font-heading text-[16px] leading-tight", reading ? "font-semibold text-paper" : "text-paper/85")}>
                        {e.title}
                      </span>
                    </button>
                  </li>
                );
              }
              if (e.kind === "grid") {
                return (
                  <li key={`grid-${i}`} className={line}>
                    {grid(`work-grid-${i}`, e.sections, (label) => {
                      const h = heads.find((x) => x.n === e.sections.find((c) => c.label === label)?.n);
                      return h ? say(h.pill.name) : String(label);
                    })}
                  </li>
                );
              }
              if (e.omitted) {
                return (
                  <li key={e.key} className={line} data-omitted="">
                    <div className="flex min-h-[46px] w-full items-center justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0 font-heading text-[16px] font-semibold leading-tight text-paper/45">{say(e.name)}</span>
                      <span className="shrink-0 font-sans text-caption text-paper/45">{t("reading.part.notInEdition")}</span>
                    </div>
                  </li>
                );
              }
              const isOpen = openKey === e.key;
              const gridId = `work-part-${e.key.replace(/[^a-z0-9]/gi, "-")}`;
              return (
                <li key={e.key} className={line}>
                  <button
                    type="button"
                    data-part={e.key}
                    data-open-part={isOpen ? "" : undefined}
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? gridId : undefined}
                    onClick={(ev) => toggle(e.key, ev.currentTarget)}
                    className={cn(
                      "flex min-h-[46px] w-full items-center justify-between gap-3 px-4 py-2.5 text-start motion-safe:transition-colors active:bg-paper/[0.04]",
                      isOpen && "bg-paper/[0.05]",
                    )}
                  >
                    <span className="min-w-0 font-heading text-[16px] font-semibold leading-tight text-paper">{say(e.name)}</span>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-sans text-detail tabular-nums", isOpen ? "text-paper/70" : "text-paper/45")}>
                      {e.sections.length} {t("bible.chAbbrev")}
                      {isOpen ? <ChevronDown size={15} className="rotate-180" /> : null}
                    </span>
                  </button>
                  {isOpen
                    ? grid(gridId, e.sections, (label) => {
                        const h = heads.find((x) => x.n === e.sections.find((c) => c.label === label)?.n);
                        return h?.sub ? `${say(e.name)}, ${say(h.sub)}` : `${say(e.name)} ${label}`;
                      })
                    : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Sheet>
  );
}
