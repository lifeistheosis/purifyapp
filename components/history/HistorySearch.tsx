"use client";

// History's search field: the door to the one search, turned to History
// (1.8, the owner's pick of r3-12, "C, with the mix of B").
//
// It was a field with its results under it on a tablet and a computer, and a
// sheet of its own on a phone. Both are the one search now, opened on
// History's door, where the events are found by name, place, year or era as
// before (each event's row carries its region, its year and its other names,
// lib/search/buildCorpus.ts), with History's own line on what can be typed.
//
// On a phone the field shares its row with Filter, which leaves it about
// 140px for its line at 360px, and a computer's column is 250px wide:
// "Search Church history" was cut in both, in English too, so those two say
// "Search" (`short`). A tablet's row has room for the whole line.

import { SearchDoor } from "@/components/search/SearchField";

export function HistorySearchInline({ className, short = false }: { className?: string; short?: boolean }) {
  return (
    <SearchDoor
      place="history"
      placeholderKey={short ? "search.open" : "study.history.searchChurchHistory"}
      className={className}
    />
  );
}
