"use client";

import { useMemo, useState } from "react";
import {
  type Saint,
  centuryFor,
  centuryLabel,
} from "@/lib/saints/saints";
import {
  SAINT_GROUPS,
  type SaintGroupId,
  groupsForSlug,
} from "@/lib/saints/groups";
import { SaintCard } from "./SaintCard";
import { FeaturedSaintCard } from "./FeaturedSaintCard";
import { FilterPill } from "./FilterPill";
import { CenturyTimeline } from "./CenturyTimeline";
import { ChipScroller } from "@/components/ui/ChipScroller";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/*
 * The two filters, redrawn 2026-09-28 at the owner's request ("optimize the
 * by kind and by century filters"). They were two collapsed toggles that
 * opened into thirty-eight wrapped chips, five rows on an iPad, with the
 * first saint below them. Now they are always open and take a line each:
 * the kinds as one row that scrolls sideways (components/ui/ChipScroller),
 * the centuries as a timeline whose bars show how many saints each holds
 * (./CenturyTimeline). Counts still follow the other filter, as before.
 */
const LABEL = "font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45";

export function SaintsBrowser({ saints }: { saints: Saint[] }) {
  const { t, tn } = useTranslate();
  const [activeGroup, setActiveGroup] = useState<SaintGroupId | null>(null);
  const [activeCentury, setActiveCentury] = useState<number | null>(null);

  const featured = useMemo(() => saints.filter((s) => s.featured), [saints]);
  const rest = useMemo(() => saints.filter((s) => !s.featured), [saints]);

  const isFiltering = activeGroup != null || activeCentury != null;

  // Predicates for the two independent filter dimensions.
  const inGroup = (s: Saint) =>
    activeGroup == null || groupsForSlug(s.slug).includes(activeGroup);
  const inCentury = (s: Saint) =>
    activeCentury == null || centuryFor(s) === activeCentury;

  // "{t("saints.byKind")}" pills: each count reflects the *other* active filter (century)
  // so the numbers stay truthful as the user narrows down. Only groups with at
  // least one matching saint are shown.
  const groupPills = useMemo(() => {
    return SAINT_GROUPS.map((g) => ({
      ...g,
      count: saints.filter(
        (s) => inCentury(s) && groupsForSlug(s.slug).includes(g.id),
      ).length,
    })).filter((g) => g.count > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saints, activeCentury]);

  // Saints per century under the active group filter, for the timeline.
  const centuryCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of saints) {
      if (!inGroup(s)) continue;
      const c = centuryFor(s);
      if (c == null) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saints, activeGroup]);

  // The grid. With no filter we show the non-featured corpus (the Theotokos is
  // pinned above as the most perfect of the saints). Once any filter is active
  // we fold featured saints back into the grid so they appear where they match.
  const visible = useMemo(() => {
    const pool = isFiltering ? saints : rest;
    return pool.filter((s) => inGroup(s) && inCentury(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saints, rest, isFiltering, activeGroup, activeCentury]);

  const totalAll = saints.length;
  const groupAllCount = saints.filter(inCentury).length;

  return (
    <>
      {!isFiltering &&
        featured.map((s) => (
          <div key={s.slug} className="mt-10">
            <FeaturedSaintCard saint={s} />
          </div>
        ))}

      <div className="mt-10">
        {/* The label row keeps to the label's own height; the clear button
            reaches 44px by its negative margin rather than pushing the chips
            down. */}
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className={LABEL}>{t("saints.byKind")}</p>
          {isFiltering ? (
            <button
              type="button"
              onClick={() => {
                setActiveGroup(null);
                setActiveCentury(null);
              }}
              className="-my-3 -mr-3 inline-flex min-h-11 items-center rounded-pill px-3 font-sans text-detail font-medium text-paper/60 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              {t("saints.clearFilters")}
            </button>
          ) : null}
        </div>
        <ChipScroller label={t("saints.byKind")}>
          <FilterPill
            label={t("common.all")}
            count={activeCentury == null ? totalAll : groupAllCount}
            active={activeGroup == null}
            onClick={() => setActiveGroup(null)}
          />
          {groupPills.map((g) => (
            <FilterPill
              key={g.id}
              label={g.label}
              count={g.count}
              active={activeGroup === g.id}
              onClick={() => setActiveGroup((cur) => (cur === g.id ? null : g.id))}
            />
          ))}
        </ChipScroller>
      </div>

      <div className="mt-8">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className={LABEL}>{t("saints.byCentury")}</p>
          <p className="font-sans text-detail tabular-nums text-paper/55" aria-live="polite">
            {activeCentury != null
              ? `${centuryLabel(activeCentury)} · ${tn("saints.saintCount", centuryCounts.get(activeCentury) ?? 0)}`
              : t("saints.allCenturies")}
          </p>
        </div>
        <CenturyTimeline
          counts={centuryCounts}
          active={activeCentury}
          onSelect={setActiveCentury}
          label={t("saints.byCentury")}
        />
      </div>

      {isFiltering ? (
        <p className="mt-10 font-sans text-detail tabular-nums text-paper/55">
          {tn("saints.saintCount", visible.length)}
        </p>
      ) : null}

      {/* Deliberately NOT `cascade`. This grid renders the full filtered set
          (107 cards unfiltered), and the cascade clamps its stagger at the
          13th child — so cards 14 and up would all hold at opacity 0 for
          910ms and then appear at once, which is worse than no animation.
          A stagger is only worth it where the user can actually see it
          arrive; here about three cards are above the fold and the masthead
          cascade above already covers the entrance. */}
      <div className={isFiltering ? "mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"}>
        {visible.map((s) => (
          <div key={s.slug} className="cv-card">
            <SaintCard saint={s} />
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-12 font-sans text-ui text-paper/55 text-center">
          {t("saints.noSaintsFilter")}
        </p>
      )}
    </>
  );
}
