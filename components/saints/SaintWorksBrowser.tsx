"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Saint, Work } from "@/lib/saints/saints";
import { FilterPill } from "./FilterPill";

// How many topic pills to show before collapsing the rest behind "More".
const PRIMARY_MAX = 10;

export function SaintWorksBrowser({ saint }: { saint: Saint }) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Topics across this saint's works, ranked by how many works share them
  // (most-shared first, then alphabetical). Single-work topics are the long
  // tail and are hidden by default to keep the filter clean.
  const buckets = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of saint.works) {
      for (const t of w.topics ?? []) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [saint]);

  // Shared topics (count >= 2) make the useful filters; cap them so the row
  // stays one or two lines. The rest live behind the "More" toggle.
  const primary = useMemo(
    () => buckets.filter(([, n]) => n >= 2).slice(0, PRIMARY_MAX),
    [buckets],
  );
  const hasOverflow = primary.length < buckets.length;

  // What to render: all topics when expanded, otherwise the primary set plus
  // the active topic if the user picked one from the collapsed long tail.
  const shownTopics = useMemo(() => {
    if (showAll) return buckets;
    const list = [...primary];
    if (activeTopic && !list.some(([t]) => t === activeTopic)) {
      const found = buckets.find(([t]) => t === activeTopic);
      if (found) list.push(found);
    }
    return list;
  }, [showAll, buckets, primary, activeTopic]);

  const visible = useMemo(() => {
    if (!activeTopic) return saint.works;
    return saint.works.filter((w) => w.topics?.includes(activeTopic));
  }, [saint.works, activeTopic]);

  return (
    <section className="py-14">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            Writings
          </p>
          <h2 className="font-sans text-title md:text-display-sm font-bold text-paper tracking-[-0.02em]">
            Read {saint.pronoun ?? "his"} works
          </h2>
        </div>
        <span className="font-sans text-detail text-paper/45">
          {visible.length} of {saint.works.length}{" "}
          {saint.works.length === 1 ? "work" : "works"}
        </span>
      </div>

      {buckets.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          <FilterPill
            label="All topics"
            count={saint.works.length}
            active={activeTopic === null}
            onClick={() => setActiveTopic(null)}
          />
          {shownTopics.map(([topic, n]) => (
            <FilterPill
              key={topic}
              label={topic}
              count={n}
              active={activeTopic === topic}
              onClick={() =>
                setActiveTopic((cur) => (cur === topic ? null : topic))
              }
            />
          ))}
          {hasOverflow && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="font-sans text-detail font-medium text-paper/55 hover:text-paper underline underline-offset-4 decoration-paper/25 hover:decoration-paper/60 transition-colors px-1.5 py-2"
            >
              {showAll
                ? "Show fewer"
                : `More topics (${buckets.length - primary.length})`}
            </button>
          )}
        </div>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visible.map((w) => (
          <WorkTile key={w.slug} saintSlug={saint.slug} work={w} />
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="mt-8 font-sans text-ui text-paper/55">
          No works tagged with that topic yet.
        </p>
      )}
    </section>
  );
}

function WorkTile({ saintSlug, work }: { saintSlug: string; work: Work }) {
  return (
    <li>
      <Link
        href={`/saints/${saintSlug}/${work.slug}`}
        className="group block h-full rounded-lg bg-night border border-paper/8 p-6 hover:border-paper/25 transition-all duration-200"
      >
        {work.year && (
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/45 mb-3">
            {work.year}
          </p>
        )}
        <h3 className="font-serif text-title-sm text-paper leading-[1.2]">
          {work.title}
        </h3>
        {work.subtitle && (
          <p className="font-sans text-detail text-paper/60 mt-1.5 italic">
            {work.subtitle}
          </p>
        )}
        <p className="mt-4 font-sans text-ui text-paper/70 leading-relaxed">
          {work.blurb}
        </p>
        {work.topics?.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {work.topics.slice(0, 4).map((t) => (
              <li
                key={t}
                className="text-eyebrow font-sans uppercase tracking-[1px] text-paper/55 border border-paper/15 rounded-pill px-2 py-0.5"
              >
                {t}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-6 font-sans text-ui font-medium text-paper/75 group-hover:text-paper transition-colors duration-150">
          Open work →
        </p>
      </Link>
    </li>
  );
}
