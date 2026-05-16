"use client";

import { useMemo, useState } from "react";
import {
  type Saint,
  centuryFor,
  centuryLabel,
} from "@/lib/saints/saints";
import { SaintCard } from "./SaintCard";
import { FilterPill } from "./FilterPill";

export function SaintsBrowser({ saints }: { saints: Saint[] }) {
  const [activeCentury, setActiveCentury] = useState<number | null>(null);

  // Per-century counts (sorted by century ascending).
  const buckets = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of saints) {
      const c = centuryFor(s);
      if (c == null) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [saints]);

  const visible = useMemo(() => {
    if (activeCentury == null) return saints;
    return saints.filter((s) => centuryFor(s) === activeCentury);
  }, [saints, activeCentury]);

  return (
    <>
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
