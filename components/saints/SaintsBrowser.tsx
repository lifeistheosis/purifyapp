"use client";

import { useMemo, useState } from "react";
import {
  type Saint,
  centuryFor,
  centuryLabel,
} from "@/lib/saints/saints";
import { SaintCard } from "./SaintCard";
import { FeaturedSaintCard } from "./FeaturedSaintCard";
import { FilterPill } from "./FilterPill";

export function SaintsBrowser({ saints }: { saints: Saint[] }) {
  const [activeCentury, setActiveCentury] = useState<number | null>(null);

  // Featured saints (the Theotokos) are pinned above the grid; the century
  // filter and grid operate on the rest.
  const featured = useMemo(() => saints.filter((s) => s.featured), [saints]);
  const rest = useMemo(() => saints.filter((s) => !s.featured), [saints]);

  // Per-century counts (sorted by century ascending).
  const buckets = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of rest) {
      const c = centuryFor(s);
      if (c == null) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [rest]);

  const visible = useMemo(() => {
    if (activeCentury == null) return rest;
    return rest.filter((s) => centuryFor(s) === activeCentury);
  }, [rest, activeCentury]);

  return (
    <>
      {activeCentury == null &&
        featured.map((s) => (
          <div key={s.slug} className="mt-10">
            <FeaturedSaintCard saint={s} />
          </div>
        ))}

      <div className="mt-10 flex flex-wrap gap-2.5">
        <FilterPill
          label="All"
          count={saints.length}
          active={activeCentury == null}
          onClick={() => setActiveCentury(null)}
        />
        {buckets.map(([c, n]) => (
          <FilterPill
            key={c}
            label={centuryLabel(c)}
            count={n}
            active={activeCentury === c}
            onClick={() => setActiveCentury(c)}
          />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((s) => (
          <SaintCard key={s.slug} saint={s} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-12 font-sans text-[15px] text-paper/55 text-center">
          No saints in the current filter.
        </p>
      )}
    </>
  );
}
