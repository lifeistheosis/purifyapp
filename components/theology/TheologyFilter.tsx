"use client";

// The hub's shared search across all four modes. Quiet by default, it shows
// nothing until the reader types, then surfaces a flat, sectioned result list
// drawn from every mode, so one query reaches doctrine, topics, heresies, and
// apologetics at once. The hub's curated browse sits below it untouched.

import { useMemo, useState } from "react";
import Link from "next/link";

export type StudyItem = {
  slug: string;
  title: string;
  href: string;
  section: "Doctrine" | "Topics" | "Heresies" | "Apologetics";
  summary?: string;
};

export function TheologyFilter({ items }: { items: StudyItem[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];
    return items.filter((it) =>
      `${it.title} ${it.summary ?? ""} ${it.section}`.toLowerCase().includes(query),
    );
  }, [query, items]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search all studies, a doctrine, a heresy, a question…"
        aria-label="Search theology studies"
        className="w-full rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:border-paper/40 focus:outline-none transition-colors"
      />

      {query ? (
        <ul className="mt-5 divide-y divide-paper/[0.06] border-y border-paper/[0.06]">
          {results.length === 0 ? (
            <li className="py-4 font-serif italic text-ui text-paper/55">
              Nothing matches &ldquo;{q}&rdquo; yet.
            </li>
          ) : (
            results.map((it) => (
              <li key={it.href}>
                <Link href={it.href} className="group block py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sans text-ui font-semibold text-paper group-hover:text-gold transition-colors">
                      {it.title}
                    </span>
                    <span className="shrink-0 font-sans text-caption uppercase tracking-[1.2px] text-paper/40">
                      {it.section}
                    </span>
                  </div>
                  {it.summary ? (
                    <p className="mt-1 font-serif text-detail text-paper/60 leading-[1.5] line-clamp-2">
                      {it.summary}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
