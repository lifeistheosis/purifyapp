"use client";

// The Orthodox History timeline — one orchestrator, four presentations.
//
// The timeline itself renders exactly ONCE (unique #event-<slug> anchors are
// what scroll restoration, deep links, and the scroll spy key off). The
// responsive shells around it change instead:
//   < lg              single column (native shell, mobile web, tablet
//                     portrait): sticky control row; native gets a
//                     full-screen search overlay and bottom-sheet
//                     filters/eras (hardware Back closes each).
//   lg (tablet land.) two-pane: timeline + selected-event context rail.
//   xl (desktop)      three-column research layout: era/century/search/
//                     filter column · timeline · context rail. Keyboard
//                     ↑/↓ + Enter drive selection; URL carries the state.
//
// State: one TimelineState. On the web it round-trips through the URL
// (?era=…&cat=…&q=…&e=…, debounced router.replace — shareable, Back-safe)
// and localStorage; in the native shell the URL is never touched so system
// Back always means "leave the page", never "undo a filter".
//
// Scroll: a scroll-spy records the topmost visible card (anchor slug +
// offset) so returning from an event page — browser Back, Android hardware
// Back, or a fresh visit within the session — restores the exact position.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { useIsNative } from "@/lib/platform/native";
import {
  centuriesInDataset,
  centuryOf,
  publishedEvents,
  type Era,
} from "@/lib/history/events";
import { applyFilters, groupByEra, hasActiveFilters } from "@/lib/history/filter";
import {
  EMPTY_STATE,
  fromSearchParams,
  loadPersistedState,
  persistState,
  toSearchParams,
  type TimelineState,
} from "@/lib/history/state";
import * as scroll from "@/lib/history/scroll";

import { CenturyScrubber } from "./CenturyScrubber";
import { EraJumpList } from "./EraJumpList";
import { EventContextRail } from "./EventContextRail";
import { HistorySearchInline, HistorySearchOverlay } from "./HistorySearch";
import { TimelineCore } from "./TimelineCore";
import { ActiveFilterChips, TimelineFilters } from "./TimelineFilters";

const ALL_EVENTS = publishedEvents();
const CENTURIES = centuriesInDataset();

export function HistoryTimelinePage() {
  const isNative = useIsNative();
  const router = useRouter();

  // ----- state ------------------------------------------------------------
  const [state, setState] = useState<TimelineState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [erasOpen, setErasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeEra, setActiveEra] = useState<Era | undefined>(undefined);

  // Init: URL params (web) win over the persisted session; reading
  // window.location on mount (instead of useSearchParams) keeps this
  // component static-export-safe with no Suspense boundary.
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate, same pattern as components/ui/Sheet.tsx: client-only state
     (URL/localStorage) can't be read during SSR. */
  useEffect(() => {
    const fromUrl = fromSearchParams(new URLSearchParams(window.location.search));
    const hasUrlState = window.location.search.length > 1;
    setState(hasUrlState ? fromUrl : (loadPersistedState() ?? EMPTY_STATE));
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist every change; mirror to the URL on web only (debounced).
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
  useEffect(() => () => {
    if (urlTimer.current) clearTimeout(urlTimer.current);
  }, []);

  // If the reader clicks into an event while a debounced URL replace is
  // pending, cancel it: a replace landing mid-navigation can collapse the
  // timeline's history entry into the event page's, breaking browser Back.
  const cancelPendingUrlWrite = useCallback((e: React.MouseEvent) => {
    if (
      urlTimer.current &&
      (e.target as HTMLElement).closest("a")
    ) {
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

  // ----- scroll spy + restoration ------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const saved = scroll.loadPosition();
    if (saved) {
      const el = document.getElementById(`event-${saved.anchorSlug}`);
      if (el) {
        // Put the anchor card exactly where the spy last saw it: at the
        // 120px reference line plus its recorded offset. Computing from the
        // live rect keeps this exact regardless of sticky headers or
        // scroll-margin.
        const r = el.getBoundingClientRect();
        window.scrollBy({
          top: r.top - (120 + saved.offsetPx),
          behavior: "auto",
        });
      }
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let ticking = false;
    const record = () => {
      ticking = false;
      const cards = document.querySelectorAll<HTMLElement>("[data-event-slug]");
      let top: HTMLElement | null = null;
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        if (r.bottom > 120) {
          top = card;
          break;
        }
      }
      if (top) {
        const r = top.getBoundingClientRect();
        scroll.savePosition(top.dataset.eventSlug!, Math.round(r.top - 120));
        const meta = ALL_EVENTS.find((e) => e.slug === top!.dataset.eventSlug);
        if (meta) setActiveEra(meta.era);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(record);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    record();
    return () => window.removeEventListener("scroll", onScroll);
  }, [hydrated, filtered]);

  // ----- jumps --------------------------------------------------------------
  const jumpToEra = useCallback((era: Era) => {
    document.getElementById(`era-${era}`)?.scrollIntoView({ block: "start" });
    setErasOpen(false);
  }, []);

  const jumpToCentury = useCallback(
    (century: number) => {
      const target =
        filtered.find(
          (e) =>
            centuryOf(e.yearEnd ?? e.yearStart) >= century &&
            centuryOf(e.yearStart) <= century,
        ) ?? filtered.find((e) => centuryOf(e.yearStart) >= century);
      if (target) {
        document
          .getElementById(`event-${target.slug}`)
          ?.scrollIntoView({ block: "start" });
      }
    },
    [filtered],
  );

  const activeCentury = useMemo(() => {
    if (!activeEra) return undefined;
    const first = filtered.find((e) => e.era === activeEra);
    return first ? centuryOf(first.yearStart) : undefined;
  }, [activeEra, filtered]);

  // Selection only means something where a context rail exists (lg+). On
  // phones a card tap just expands the preview — recording it would only
  // dirty the URL and the persisted state.
  const select = useCallback(
    (slug: string) => {
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      update({ ...state, selected: slug });
    },
    [state, update],
  );

  const filterCount =
    (state.era ? 1 : 0) +
    state.categories.length +
    (state.certainty ? 1 : 0) +
    (state.century ? 1 : 0);

  const controlButtons = (
    <>
      <button
        type="button"
        onClick={() => setErasOpen(true)}
        className="tap-press min-h-[44px] shrink-0 rounded-md border border-paper/15 px-3.5 font-sans text-ui font-semibold text-paper/75"
      >
        Eras
      </button>
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="tap-press min-h-[44px] shrink-0 rounded-md border border-paper/15 px-3.5 font-sans text-ui font-semibold text-paper/75"
      >
        Filter{filterCount ? ` · ${filterCount}` : ""}
      </button>
    </>
  );

  // ----- render -------------------------------------------------------------
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-5 md:px-8"
      onClickCapture={cancelPendingUrlWrite}
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 xl:grid-cols-[250px_minmax(0,1fr)_330px]">
        {/* Left research column — desktop (xl) only. */}
        <aside className="hidden xl:block">
          <div className="sticky top-[88px] max-h-[calc(100vh-110px)] space-y-8 overflow-y-auto pr-2 scrollbar-thin">
            <HistorySearchInline />
            <div>
              <p className="mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
                Eras
              </p>
              <EraJumpList activeEra={activeEra} counts={eraCounts} onJump={jumpToEra} />
            </div>
            <CenturyScrubber
              centuries={CENTURIES}
              active={activeCentury}
              onJump={jumpToCentury}
            />
            <TimelineFilters value={state} onChange={update} />
          </div>
        </aside>

        {/* Center column — the ONE timeline instance. */}
        <div className="min-w-0">
          {/* Control row for every width below xl (sticky on phones). */}
          <div className="history-controls sticky z-20 -mx-5 bg-night/95 px-5 py-2.5 backdrop-blur-sm md:-mx-8 md:px-8 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-2 lg:backdrop-blur-none xl:hidden">
            <div className="flex items-center gap-2">
              {isNative ? (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="tap-press min-h-[44px] flex-1 rounded-md border border-paper/15 bg-night-soft px-4 text-left font-sans text-ui text-paper/55"
                >
                  Search Church history…
                </button>
              ) : (
                <HistorySearchInline className="min-w-0 flex-1" />
              )}
              {controlButtons}
            </div>
          </div>

          <CenturyScrubber
            centuries={CENTURIES}
            active={activeCentury}
            onJump={jumpToCentury}
            className="mt-4 xl:hidden"
          />
          <ActiveFilterChips value={state} onChange={update} className="mt-4" />

          <div className="mt-6">
            <TimelineCore groups={groups} selected={state.selected} onSelect={select} />
          </div>
        </div>

        {/* Right context column — tablet landscape and desktop. */}
        <aside className="hidden lg:block">
          <div className="sticky top-[88px]">
            <EventContextRail selected={state.selected} />
            {hasActiveFilters(state) ? (
              <p className="mt-4 text-center font-sans text-caption text-paper/55">
                {filtered.length} of {ALL_EVENTS.length} events shown
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Overlays (phones + lg tablets; xl uses the sidebar instead). */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter the timeline">
        <TimelineFilters value={state} onChange={update} />
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() =>
              update({
                ...state,
                era: undefined,
                categories: [],
                certainty: undefined,
                century: undefined,
              })
            }
            className="tap-press min-h-[48px] flex-1 rounded-md border border-paper/20 font-sans text-ui font-semibold text-paper/70"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="tap-press min-h-[48px] flex-1 rounded-md bg-paper font-sans text-ui font-semibold text-night"
          >
            Apply
          </button>
        </div>
      </Sheet>

      <Sheet open={erasOpen} onClose={() => setErasOpen(false)} title="Eras of Church history">
        <EraJumpList activeEra={activeEra} counts={eraCounts} onJump={jumpToEra} />
      </Sheet>

      <HistorySearchOverlay
        key={String(searchOpen)}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
