"use client";

import { moveWritingSectionBookmarks } from "@/lib/bookmarks";
import { movePosition } from "@/lib/reader/position";
import { moveProgress } from "@/lib/reading/progress";

import { moveAnnotations } from "./layoutMoves";
import { WORK_MOVES } from "./workMoves";

/**
 * Carry what this device keeps under the old address of a part that became a
 * work of its own (lib/saints/workMoves.ts): highlights and notes, bookmarks,
 * the kept place and the reading room's progress. Idempotent: run as the app
 * opens, after the sync's pull, and as either work opens. Returns how many
 * things moved.
 */
export function carryMovedPlaces(): number {
  if (typeof window === "undefined") return 0;
  let moved = 0;
  for (const m of WORK_MOVES) {
    moved += moveAnnotations(m.from, m.to, m.move);
    moved += moveWritingSectionBookmarks(m.from.saintSlug, m.from.workSlug, (b) => {
      const n = m.moveSection(b.sectionN);
      if (n === null) return null;
      const sectionTitle = m.retitle(b.sectionN, b.sectionTitle);
      return { ...b, workSlug: m.to.workSlug, workTitle: m.to.title, sectionN: n, sectionTitle, label: `${b.saintName}, ${m.to.title}, ${sectionTitle}` };
    });
    if (movePosition(m.from, m.to, m.moveSection)) moved += 1;
    const fromKey = `${m.from.saintSlug}/${m.from.workSlug}`;
    const toKey = `${m.to.saintSlug}/${m.to.workSlug}`;
    if (moveProgress({ key: fromKey, of: m.from.sections }, { key: toKey, of: m.to.sections }, m.moveSection)) moved += 1;
  }
  return moved;
}
