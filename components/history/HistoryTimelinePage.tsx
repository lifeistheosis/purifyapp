"use client";

// The Orthodox History timeline (1.7, the owner's note 20 of 2026-10-16):
// one orchestrator around one timeline.
//
// The timeline renders exactly ONCE (unique #event-<slug> anchors are what
// the scroll restore, deep links and the scroll spy key off). What changes
// with the width is around it:
//   < lg   a phone and a tablet held upright: the line in one column; a tap
//          on a row opens its peek sheet. On a phone the search field opens
//          the search in a sheet, and Filter opens its sheet; from md the
//          field searches in place, with Eras and Filter beside it.
//   lg     a tablet held sideways: the line, and the rail of the chosen event.
//   xl     a computer: the eras, the century slider, the search and the
//          filters in a column of their own, the line, and the rail. The
//          arrow keys and Enter move the choice and open it.
// Every era's pinned name opens the Eras sheet (the century slider is in it).
//
// State: one TimelineState. On the web it round-trips through the address
// (?era=...&cat=...&q=...&e=..., a debounced replace, so a filtered view can
// be shared and Back is safe) and localStorage; in the apps the address is
// never touched, so the phone's Back always leaves the page.
//
// Scroll: the spy notes the row at the line under the pinned era name (its
// slug and offset), so coming back from an event, Back, the Android Back and
// a fresh visit the same day all return to the same row. The row at that
// line is the reader's place, and its mark is filled.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Search } from "@/components/ui/icons/Search";
import { Sliders } from "@/components/ui/icons/Sliders";
import { Sheet } from "@/components/ui/Sheet";
import { centuriesInDataset, centuryOf, publishedEvents, type Era } from "@/lib/history/events";
import { applyFilters, groupByEra, hasActiveFilters } from "@/lib/history/filter";
import * as scroll from "@/lib/history/scroll";
import {
  EMPTY_STATE,
  fromSearchParams,
  loadPersistedState,
  persistState,
  toSearchParams,
  type TimelineState,
} from "@/lib/history/state";
import { useIsNative } from "@/lib/platform/native";

import { CenturyScrubber } from "./CenturyScrubber";
import { ContinueExploring } from "./ContinueExploring";
import { EraJumpList } from "./EraJumpList";
import { EventContextRail } from "./EventContextRail";
import { EventPeekSheet } from "./EventPeekSheet";
import { HistorySearchInline, HistorySearchSheet } from "./HistorySearch";
import { TimelineCore } from "./TimelineCore";
import { ActiveFilterChips, TimelineFilters } from "./TimelineFilters";

const ALL_EVENTS = publishedEvents();
const CENTURIES = centuriesInDataset();
const WIDE = "(min-width: 1024px)";

const BUTTON =
  "tap-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-paper/15 px-4 font-sans text-ui font-semibold text-paper/80 hover:border-paper/35 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

export function HistoryTimelinePage({ lead }: { lead?: ReactNode }) {
  const { t } = useTranslate();
  const isNative = useIsNative();
  const router = useRouter();

  // ----- state ------------------------------------------------------------
  const [state, setState] = useState<TimelineState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [erasOpen, setErasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const [activeEra, setActiveEra] = useState<Era | undefined>(undefined);

  // The address (web) wins over the remembered state. Reading
  // window.location on mount, not useSearchParams, keeps the page
  // exportable with no Suspense boundary.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate, same pattern as components/ui/Sheet.tsx: client-only state
     (the address, localStorage) can't be read during SSR. */
  useEffect(() => {
    const fromUrl = fromSearchParams(new URLSearchParams(window.location.search));
    const hasUrlState = window.location.search.length > 1;
    setState(hasUrlState ? fromUrl : (loadPersistedState() ?? EMPTY_STATE));
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Every change is kept; on the web it goes to the address too (debounced).
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = useCallback(
    (next: TimelineState) => {
      setState(next);
      persistState(next);
      if (isNative) return;
      if (urlTimer.current) clearTimeout(urlTimer.current);
      urlTimer.current = setTimeout(() => {
        const qs = toSearchParams(next).toString();
        router.replace(qs ? `/history?${qs}` : "/history", { scroll: false });
      }, 300);
    },
    [isNative, router],
  );
  useEffect(
    () => () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    },
    [],
  );

  // A reader going into an event while an address write is pending: drop
  // it, or it can fold the timeline's entry in the history into the event's
  // and break Back. React carries the click up from the sheets' portals too.
  const cancelPendingUrlWrite = useCallback((e: React.MouseEvent) => {
    if (urlTimer.current && (e.target as HTMLElement).closest("a")) {
      clearTimeout(urlTimer.current);
      urlTimer.current = null;
    }
  }, []);

  // ----- derived ----------------------------------------------------------
  const filtered = useMemo(() => applyFilters(ALL_EVENTS, state), [state]);
  const groups = useMemo(() => groupByEra(filtered), [filtered]);
  const eraCounts = useMemo(() => {
    const counts: Partial<Record<Era, number>> = {};
    for (const e of filtered) counts[e.era] = (counts[e.era] ?? 0) + 1;
    return counts;
  }, [filtered]);

  // ----- scroll restore ------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const saved = scroll.loadPosition();
    if (!saved) return;
    const el = document.getElementById(`event-${saved.anchorSlug}`);
    if (!el) return;
    // The row goes back exactly where the spy last saw it: at the line under
    // the pinned era name, less its recorded offset. Read from the live rect,
    // so it holds whatever the bar and the pinned name measure.
    const r = el.getBoundingClientRect();
    window.scrollBy({ top: r.top - (scroll.referenceLine() + saved.offsetPx), behavior: "auto" });
  }, [hydrated]);

  // ----- the scroll spy -------------------------------------------------------
  // An IntersectionObserver answers "which row is at the line under the
  // pinned era name" off the main thread; the place is written on the
  // trailing edge of a scroll. The row found there carries data-current,
  // which fills its mark (globals.css): one attribute, no render of the list.
  // On a computer the chosen row is the filled one instead (aria-current).
  useEffect(() => {
    if (!hydrated) return;
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-event-slug]"));
    if (!rows.length) return;
    const line = scroll.referenceLine();
    const visible = new Set<HTMLElement>();
    let current: HTMLElement | null = null;
    let writeTimer: ReturnType<typeof setTimeout> | undefined;

    const commit = () => {
      const top = rows.find((row) => visible.has(row)) ?? null;
      if (!top) return;
      const slug = top.dataset.eventSlug;
      if (!slug) return;
      const meta = ALL_EVENTS.find((e) => e.slug === slug);
      if (meta) setActiveEra(meta.era);
      if (current !== top) {
        current?.removeAttribute("data-current");
        if (!window.matchMedia(WIDE).matches) top.setAttribute("data-current", "");
        current = top;
      }
      // One rect, on the trailing edge, for one row.
      scroll.savePosition(slug, Math.round(top.getBoundingClientRect().top - line));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) visible.add(el);
          else visible.delete(el);
        }
        if (writeTimer) clearTimeout(writeTimer);
        writeTimer = setTimeout(commit, 120);
      },
      // The top of the root pushed down to the line, so the first row in
      // document order that still crosses it is the reader's place.
      { rootMargin: `-${Math.round(line)}px 0px 0px 0px`, threshold: 0 },
    );
    for (const row of rows) observer.observe(row);

    return () => {
      observer.disconnect();
      if (writeTimer) clearTimeout(writeTimer);
      current?.removeAttribute("data-current");
    };
  }, [hydrated, filtered]);

  // ----- jumps --------------------------------------------------------------
  const jumpToEra = useCallback((era: Era) => {
    setErasOpen(false);
    // After the sheet has let go of the page's scroll.
    requestAnimationFrame(() => document.getElementById(`era-${era}`)?.closest("section")?.scrollIntoView({ block: "start" }));
  }, []);

  const jumpToEvent = useCallback((slug: string) => {
    document.getElementById(`event-${slug}`)?.scrollIntoView({ block: "start" });
  }, []);

  const jumpToCentury = useCallback(
    (century: number) => {
      const target =
        filtered.find((e) => centuryOf(e.yearEnd ?? e.yearStart) >= century && centuryOf(e.yearStart) <= century) ??
        filtered.find((e) => centuryOf(e.yearStart) >= century);
      if (target) jumpToEvent(target.slug);
    },
    [filtered, jumpToEvent],
  );

  const activeCentury = useMemo(() => {
    if (!activeEra) return undefined;
    const first = filtered.find((e) => e.era === activeEra);
    return first ? centuryOf(first.yearStart) : undefined;
  }, [activeEra, filtered]);

  // A row's plain tap: the rail on a computer (a tablet held sideways too),
  // the peek sheet everywhere else.
  const open = useCallback(
    (slug: string) => {
      if (window.matchMedia(WIDE).matches) update({ ...state, selected: slug });
      else setPeek(slug);
    },
    [state, update],
  );
  // The arrow keys: the rail only.
  const select = useCallback(
    (slug: string) => {
      if (window.matchMedia(WIDE).matches) update({ ...state, selected: slug });
    },
    [state, update],
  );

  const clearFilters = useCallback(
    () => update({ ...state, era: undefined, categories: [], certainty: undefined, century: undefined, query: "" }),
    [state, update],
  );

  const filterCount =
    (state.era ? 1 : 0) + state.categories.length + (state.certainty ? 1 : 0) + (state.century ? 1 : 0);
  const filterLabel = filterCount ? t("study.history.filterWithCount", { count: filterCount }) : t("study.filter");
  const filterButton = (
    <button type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" className={BUTTON}>
      <Sliders size={17} className="shrink-0" />
      {filterLabel}
    </button>
  );

  // ----- render -------------------------------------------------------------
  return (
    <div className="history-line mx-auto w-full max-w-[1440px] px-5 md:px-8" onClickCapture={cancelPendingUrlWrite}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 xl:grid-cols-[250px_minmax(0,1fr)_330px]">
        {/* The computer's own column: search, eras, centuries, filters. */}
        <aside className="hidden xl:block">
          <div className="sticky top-[88px] max-h-[calc(100vh-110px)] space-y-8 overflow-y-auto pe-2 pt-2 scrollbar-thin">
            <HistorySearchInline id="history-search-sidebar" />
            <div>
              <p className="mb-2 font-sans text-caption font-semibold text-paper/60">{t("study.eras")}</p>
              <EraJumpList activeEra={activeEra} counts={eraCounts} onJump={jumpToEra} />
            </div>
            <CenturyScrubber
              id="history-century-scrubber-sidebar"
              centuries={CENTURIES}
              active={activeCentury}
              onJump={jumpToCentury}
            />
            <TimelineFilters value={state} onChange={update} />
          </div>
        </aside>

        {/* The line: the one timeline. */}
        <div className="min-w-0">
          {lead}
          <ContinueExploring onGo={jumpToEvent} />

          {/* A phone: the search opens in a sheet, Filter beside it. */}
          <div className="mt-5 flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-haspopup="dialog"
              className="tap-press inline-flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-pill border border-paper/15 bg-night-soft px-4 text-start font-sans text-ui text-paper/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              <Search size={17} className="shrink-0 text-paper/60" />
              <span className="truncate">{t("study.history.searchChurchHistory")}</span>
            </button>
            {filterButton}
          </div>
          {/* A tablet: the field in place, the eras and the filters beside it. */}
          <div className="mt-6 hidden items-center gap-2 md:flex xl:hidden">
            <HistorySearchInline id="history-search-toolbar" className="min-w-0 flex-1" />
            <button type="button" onClick={() => setErasOpen(true)} aria-haspopup="dialog" className={BUTTON}>
              {t("study.eras")}
            </button>
            {filterButton}
          </div>

          <ActiveFilterChips value={state} onChange={update} className="mt-4" />

          <div className="mt-6">
            <TimelineCore
              groups={groups}
              selected={state.selected}
              onOpen={open}
              onSelect={select}
              onOpenEras={() => setErasOpen(true)}
              onClearFilters={clearFilters}
            />
          </div>
        </div>

        {/* The rail: a tablet held sideways and a computer. Height-capped with
            its own scroll so a long summary never pushes the way to the full
            account off the screen; keyed on the choice so a new event starts
            at its top. */}
        <aside className="hidden lg:block">
          <div
            key={state.selected ?? "empty"}
            className="sticky top-[88px] max-h-[calc(100vh-110px)] overflow-y-auto pe-1 scrollbar-thin"
          >
            <EventContextRail selected={state.selected} />
            {hasActiveFilters(state) ? (
              <p className="mt-5 font-sans text-caption text-paper/55">
                {t("study.history.shownCount", { shown: filtered.length, total: ALL_EVENTS.length })}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {/* The sheets: a phone and a tablet (a computer has the column). */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t("study.filterTheTimeline")} desktop openFull>
        <TimelineFilters value={state} onChange={update} />
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => update({ ...state, era: undefined, categories: [], certainty: undefined, century: undefined })}
            className="tap-press min-h-12 flex-1 rounded-pill border border-paper/20 font-sans text-ui font-semibold text-paper/75"
          >
            {t("study.clear")}
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="tap-press min-h-12 flex-1 rounded-pill bg-paper font-sans text-ui font-semibold text-night"
          >
            {t("study.apply")}
          </button>
        </div>
      </Sheet>

      <Sheet open={erasOpen} onClose={() => setErasOpen(false)} title={t("study.erasOfChurchHistory")} desktop>
        <EraJumpList activeEra={activeEra} counts={eraCounts} onJump={jumpToEra} />
        <CenturyScrubber
          id="history-century-scrubber-sheet"
          centuries={CENTURIES}
          active={activeCentury}
          onRelease
          onJump={(c) => {
            setErasOpen(false);
            requestAnimationFrame(() => jumpToCentury(c));
          }}
          className="mt-6 border-t border-paper/10 pt-5"
        />
      </Sheet>

      <HistorySearchSheet key={String(searchOpen)} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <EventPeekSheet slug={peek} onClose={() => setPeek(null)} />
    </div>
  );
}
