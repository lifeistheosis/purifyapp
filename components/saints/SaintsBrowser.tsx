"use client";

import { useMemo, useState } from "react";
import {
  type Saint,
  centuryFor,
  centuryLabel,
} from "@/lib/saints/saints";
import {
  SAINT_GROUPS,
  SAINT_GROUP_LABELS,
  type SaintGroupId,
  groupsForSlug,
} from "@/lib/saints/groups";
import { cn } from "@/lib/cn";
import { SaintCard } from "./SaintCard";
import { FeaturedSaintCard } from "./FeaturedSaintCard";
import { FilterPill } from "./FilterPill";

export function SaintsBrowser({ saints }: { saints: Saint[] }) {
  const [activeGroup, setActiveGroup] = useState<SaintGroupId | null>(null);
  const [activeCentury, setActiveCentury] = useState<number | null>(null);
  const [kindOpen, setKindOpen] = useState(false);
  const [centuryOpen, setCenturyOpen] = useState(false);

  const featured = useMemo(() => saints.filter((s) => s.featured), [saints]);
  const rest = useMemo(() => saints.filter((s) => !s.featured), [saints]);

  const isFiltering = activeGroup != null || activeCentury != null;

  // Predicates for the two independent filter dimensions.
  const inGroup = (s: Saint) =>
    activeGroup == null || groupsForSlug(s.slug).includes(activeGroup);
  const inCentury = (s: Saint) =>
    activeCentury == null || centuryFor(s) === activeCentury;

  // "By kind" pills: each count reflects the *other* active filter (century)
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

  // "By century" pills: counts reflect the active group filter.
  const centuryPills = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of saints) {
      if (!inGroup(s)) continue;
      const c = centuryFor(s);
      if (c == null) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
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
  const centuryAllCount = saints.filter(inGroup).length;

  return (
    <>
      {!isFiltering &&
        featured.map((s) => (
          <div key={s.slug} className="mt-10">
            <FeaturedSaintCard saint={s} />
          </div>
        ))}

      {/* By kind (collapsible) */}
      <div className="mt-10">
        <button
          type="button"
          onClick={() => setKindOpen((o) => !o)}
          aria-expanded={kindOpen}
          className="group flex items-center gap-1.5 mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 hover:text-paper/70 transition-colors focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-[3px] rounded-sm"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            className={cn(
              "transition-transform duration-150",
              kindOpen ? "rotate-90" : "rotate-0",
            )}
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>By kind</span>
          {activeGroup != null && !kindOpen && (
            <span className="text-paper/70 normal-case tracking-normal">
              · {SAINT_GROUP_LABELS[activeGroup]}
            </span>
          )}
        </button>
        {kindOpen && (
          <div className="flex flex-wrap gap-2.5">
            <FilterPill
              label="All"
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
                onClick={() =>
                  setActiveGroup((cur) => (cur === g.id ? null : g.id))
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* By century (collapsible) */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setCenturyOpen((o) => !o)}
          aria-expanded={centuryOpen}
          className="group flex items-center gap-1.5 mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 hover:text-paper/70 transition-colors focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-[3px] rounded-sm"
        >
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            className={cn(
              "transition-transform duration-150",
              centuryOpen ? "rotate-90" : "rotate-0",
            )}
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>By century</span>
          {activeCentury != null && !centuryOpen && (
            <span className="text-paper/70 normal-case tracking-normal">
              · {centuryLabel(activeCentury)}
            </span>
          )}
        </button>
        {centuryOpen && (
        <div className="flex flex-wrap gap-2.5">
          <FilterPill
            label="All"
            count={activeGroup == null ? totalAll : centuryAllCount}
            active={activeCentury == null}
            onClick={() => setActiveCentury(null)}
          />
          {centuryPills.map(([c, n]) => (
            <FilterPill
              key={c}
              label={centuryLabel(c)}
              count={n}
              active={activeCentury === c}
              onClick={() =>
                setActiveCentury((cur) => (cur === c ? null : c))
              }
            />
          ))}
        </div>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((s) => (
          <div key={s.slug} className="cv-card">
            <SaintCard saint={s} />
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-12 font-sans text-ui text-paper/55 text-center">
          No saints in the current filter.
        </p>
      )}
    </>
  );
}
