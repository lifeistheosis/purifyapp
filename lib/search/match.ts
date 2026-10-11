// How the one search decides what a query finds. Pure, and apart from the
// palette (components/search/CommandPalette.tsx) so the rule can be tested
// against the real corpus: "does 'dark mode' find the setting" is a question
// about this file and ./buildCorpus.ts, not about a dialog.

import type { SearchItem } from "./types";

/** Lower case, accents folded: "Chrysóstomos" and "chrysostomos" are one query. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * How well a row answers a query that `normalize` has already been through.
 * Lower is better; -1 means it does not answer it.
 */
export function score(item: SearchItem, q: string): number {
  const hay = normalize(`${item.label} ${item.sublabel ?? ""} ${item.keywords ?? ""}`);
  const label = normalize(item.label);
  if (label.startsWith(q)) return 0;
  const wordStart = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (wordStart.test(label)) return 1;
  if (label.includes(q)) return 2;
  if (hay.includes(q)) return 3;
  return -1;
}

/** The rows a query finds, best first, then by name. */
export function matches(items: readonly SearchItem[], query: string, limit = 40): SearchItem[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const scored: { item: SearchItem; s: number }[] = [];
  for (const item of items) {
    const s = score(item, q);
    if (s >= 0) scored.push({ item, s });
  }
  scored.sort((a, b) => a.s - b.s || a.item.label.localeCompare(b.item.label));
  return scored.slice(0, Math.max(0, limit)).map((x) => x.item);
}
