"use client";

// The hub's search across the whole library. A prominent field plus a row of
// scope chips: pick a mode (or Councils / Fathers) to browse it, or type to
// search across everything at once. Quiet until the reader acts — no results
// list until there is a query or an active scope.

import { useMemo, useState } from "react";
import Link from "next/link";

export type FilterSection =
  | "Doctrine"
  | "Topics"
  | "Heresies"
  | "Apologetics"
  | "Councils"
  | "Fathers";

export type StudyItem = {
  slug: string;
  title: string;
  href: string;
  section: FilterSection;
  summary?: string;
};

const ALL = "All" as const;
type Scope = typeof ALL | FilterSection;

const ORDER: FilterSection[] = [
  "Doctrine",
  "Topics",
  "Heresies",
  "Apologetics",
  "Councils",
  "Fathers",
];

export function TheologyFilter({ items }: { items: StudyItem[] }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>(ALL);
  const query = q.trim().toLowerCase();

  // Only offer chips for sections actually present.
  const sections = useMemo(() => {
    const present = new Set(items.map((i) => i.section));
    return ORDER.filter((s) => present.has(s));
  }, [items]);

  const active = query.length > 0 || scope !== ALL;

  const results = useMemo(() => {
    if (!active) return [];
    return items.filter((it) => {
      if (scope !== ALL && it.section !== scope) return false;
      if (!query) return true;
      return `${it.title} ${it.summary ?? ""} ${it.section}`
        .toLowerCase()
        .includes(query);
    });
  }, [active, items, scope, query]);

  return (
    <div>
      <div className="relative">
        <SearchGlyph />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the library — a doctrine, a heresy, a question…"
          aria-label="Search theology studies"
          className="w-full rounded-xl border border-paper/15 bg-paper/[0.04] py-3.5 pl-11 pr-4 font-sans text-lede text-paper placeholder:text-paper/40 focus:border-gold/45 focus:bg-paper/[0.06] focus:outline-none transition-colors"
        />
      </div>

      {/* Scope chips: browse a mode, or narrow a search. */}
      <div className="mt-3 -mx-1 flex flex-wrap gap-1.5 px-1">
        {[ALL, ...sections].map((s) => {
          const on = scope === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => setScope(s as Scope)}
              className={
                "rounded-full px-3 py-1 font-sans text-caption font-medium transition-colors " +
                (on
                  ? "bg-paper text-night"
                  : "border border-paper/12 text-paper/55 hover:text-paper hover:border-paper/30")
              }
            >
              {s}
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="mt-5">
          {results.length === 0 ? (
            <p className="rounded-lg border border-paper/[0.08] bg-paper/[0.02] px-5 py-6 text-center font-serif italic text-ui text-paper/55">
              {query
                ? `Nothing in the library matches “${q}” yet.`
                : "Nothing here yet."}
            </p>
          ) : (
            <ul className="divide-y divide-paper/[0.07] border-y border-paper/[0.07]">
              {results.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="group block py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-ui font-semibold text-paper group-hover:text-gold transition-colors">
                        {it.title}
                      </span>
                      <span className="shrink-0 font-sans text-caption uppercase tracking-[1.2px] text-paper/40">
                        {it.section}
                      </span>
                    </div>
                    {it.summary ? (
                      <p className="mt-1 font-serif text-detail text-paper/60 leading-[1.55] line-clamp-2">
                        {it.summary}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper/40"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
