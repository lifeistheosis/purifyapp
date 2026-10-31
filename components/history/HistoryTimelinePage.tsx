"use client";

// The Orthodox History timeline (1.7, the owner's note 20 of 2026-10-16):
// one orchestrator around one timeline.
//
// The timeline renders exactly ONCE (unique #event-<slug> anchors are what
// the scroll restore, deep links and the scroll spy key off). What changes
// with the width is around it:
//   < lg   a phone and a tablet held upright: the line in one column; a tap
//          on a row opens its peek sheet. The search field opens the one
//          search turned to History (1.8, r3-12), Filter its sheet beside it;
//          from md Eras is beside them too.
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
// slug and offset), so coming back from an event, Back and the Android Back
// return to the same row. A fresh visit, from Discover or anywhere, opens at
// the top, with "Continue at ..." to the row kept from the last visit. The
// row at that line is the reader's place, and its mark is filled.
//
// The page arrives whole and still (the owner's note 66 of build 80, "there's
// like a frame where it bugs in"): what the device kept is read in the first
// render, so the page is never drawn empty and then again, and the place is
// put back, on Back alone, before the page is painted. Until then the page
// was drawn with nothing kept, then filled from an effect, then put back at
// the last visit's place on every visit: a jump of 64px with the reader at
// the top, of 2,600px with them further down, filmed on the export. The route
// has no loading screen either: it cut to the page after at least the 300ms
// React holds a fallback, when the page's own code was already there
// (app/(app)/history/ has no loading.tsx, on purpose).

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sliders } from "@/components/ui/icons/Sliders";
import { Sheet } from "@/components/ui/Sheet";
import { centuriesInDataset, centuryOf, eventBySlug, publishedEvents, type Era } from "@/lib/history/events";
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
import { isReturning } from "@/lib/ui/returnPlace";
import { cameBack } from "@/lib/ui/scrollReset";
import { useMounted } from "@/lib/useMounted";

import { CenturyScrubber } from "./CenturyScrubber";
import { ContinueExploring } from "./ContinueExploring";
import { EraJumpList } from "./EraJumpList";
import { EventContextRail } from "./EventContextRail";
import { EventPeekSheet } from "./EventPeekSheet";
import { HistorySearchInline } from "./HistorySearch";
import { TimelineCore } from "./TimelineCore";
import { ActiveFilterChips, TimelineFilters } from "./TimelineFilters";

const ALL_EVENTS = publishedEvents();
const CENTURIES = centuriesInDataset();
const WIDE = "(min-width: 1024px)";

const BUTTON =
  "tap-press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-paper/15 px-4 font-sans text-ui font-semibold text-paper/80 hover:border-paper/35 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

// On the server there is no layout to read (components/nav/ScrollResetBridge.tsx).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * What the reader was looking at. The address wins when it is this page's and
 * carries any (the web: a shared view, a reload, Back to a filtered view);
 * else what the device kept. Read from window.location, not useSearchParams,
 * which keeps the page exportable with no Suspense boundary. While a link to
 * this page is still being followed the address is the page being left, so
 * it counts only once it is the timeline's own.
 */
function readState(): TimelineState {
  const { pathname, search } = window.location;
  if (/^\/history\/?$/.test(pathname) && search.length > 1) return fromSearchParams(new URLSearchParams(search));
  return loadPersistedState() ?? EMPTY_STATE;
}

export function HistoryTimelinePage({ lead }: { lead?: ReactNode }) {
  const { t } = useTranslate();
  const isNative = useIsNative();
  const router = useRouter();

  // ----- state ------------------------------------------------------------
  // What the device kept is read in the first render wherever the device can
  // be read then: in the apps, which draw every page on the device, and on
  // the web after its first page. Only the web's first page hydrates the
  // server's page, drawn with nothing kept, and reads it a moment later.
  const client = useMounted();
  const [state, setState] = useState<TimelineState>(() => (client ? readState() : EMPTY_STATE));
  // Where the reader had got to on the line, for "Continue at ...": read once.
  const [kept, setKept] = useState<scroll.TimelinePosition | null>(() => (client ? scroll.loadKeptPlace() : null));
  const [hydrated, setHydrated] = useState(client);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [erasOpen, setErasOpen] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const [activeEra, setActiveEra] = useState<Era | undefined>(undefined);

  /* eslint-disable react-hooks/set-state-in-effect -- the web's first page
     only, the hydration gate of components/ui/Sheet.tsx: the address and
     localStorage cannot be read while the server's page is hydrated. */
  useEffect(() => {
    if (hydrated) return;
    setState(readState());
    setKept(scroll.loadKeptPlace());
    setHydrated(true);
  }, [hydrated]);
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

  // ----- the way back --------------------------------------------------------
  // Back puts the row the spy last saw back on the line under the pinned era
  // name, less its recorded offset, read from the live rect so it holds
  // whatever the bar and the pinned name measure. In a layout effect, so it
  // is there before the timeline is painted, then held while the rows around
  // it are first drawn. Only on Back (lib/ui/scrollReset.ts, cameBack): a
  // fresh visit opens at the top, where ScrollResetBridge has put it. And not
  // when the page is already being moved to a link the reader had tapped on it
  // (lib/ui/returnPlace.ts), so the two never pull it two ways.
  useIsoLayoutEffect(() => {
    if (!hydrated || !cameBack() || isReturning()) return;
    const saved = scroll.loadPosition();
    if (!saved) return;
    return scroll.restorePosition(saved);
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
      // One rect, on the trailing edge, for one row. Back returns to it
      // wherever it is; the device keeps it for "Continue at ..." only once
      // the reader has gone into the line, past its first row's place.
      const offset = Math.round(top.getBoundingClientRect().top - line);
      scroll.savePosition(slug, offset, { mirror: !(top === rows[0] && offset > 0) });
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

  // "Continue at ...": the row kept from the last visit, when it is on the
  // line now and the reader had gone into the line to reach it.
  const continueAt = useMemo(() => {
    const slug = scroll.placeToContinue(kept, filtered[0]?.slug);
    return slug && eventBySlug(slug) && filtered.some((e) => e.slug === slug) ? slug : null;
  }, [kept, filtered]);

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
            {/* A 250px column: the short line fits it in every language. */}
            <HistorySearchInline short />
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
          <ContinueExploring slug={continueAt} onGo={jumpToEvent} />

          {/* A phone: the field opens the one search on History, Filter beside it. */}
          <div className="mt-5 flex items-center gap-2 md:hidden">
            <HistorySearchInline short className="min-w-0 flex-1" />
            {filterButton}
          </div>
          {/* A tablet: the field, the eras and the filters beside it. */}
          <div className="mt-6 hidden items-center gap-2 md:flex xl:hidden">
            <HistorySearchInline className="min-w-0 flex-1" />
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

      <EventPeekSheet slug={peek} onClose={() => setPeek(null)} />
    </div>
  );
}
