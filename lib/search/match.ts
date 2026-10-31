// How the one search decides what a query finds. Pure, and apart from the
// palette (components/search/CommandPalette.tsx) so the rule can be tested
// against the real corpus: "does 'dark mode' find the setting" is a question
// about this file and ./buildCorpus.ts, not about a dialog.

import type { SearchItem } from "./types";

/** Lower case, accents folded: "Chrysóstomos" and "chrysostomos" are one query. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * How well a row answers a query that `normalize` has already been through.
 * Lower is better; -1 means it does not answer it.
 */
export function score(item: SearchItem, q: string): number {
  // The line under a theology study or a dictionary word is searched after
  // the name, as the theology library's own search always searched it.
  const hay = normalize(`${item.label} ${item.sublabel ?? ""} ${item.keywords ?? ""} ${item.line ?? ""}`);
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

/** The catalog's line for a key, or null when it has none (it answers a miss with the key). */
function line(t: (key: string) => string, key: string | undefined): string | null {
  if (!key) return null;
  const said = t(key);
  return said && said !== key ? said : null;
}

/** A counted line ("21 chapters"), or null when the catalog cannot say it. */
function counted(
  tn: ((keyBase: string, count: number) => string) | undefined,
  keyBase: string | undefined,
  count: number,
): string | null {
  if (!tn || !keyBase) return null;
  const said = tn(keyBase, count);
  // A miss comes back as the key, or with its {count} never filled in.
  return said && !said.startsWith(keyBase) && !said.includes("{") ? said : null;
}

/**
 * The list in the reader's own language, wherever the catalog has the words.
 *
 * The list is one file, written in English, for every language. But many of
 * its rows are named by a catalog key that all 21 languages carry: the 78
 * books, the settings, the passages known by name, the reading plans, some
 * screens. Those are shown as the reader's catalog says them, so a Greek
 * reader sees and can type "Ψαλμοί" and "Ρυθμίσεις". The English name stays
 * findable, since plenty of readers know a book by it. Rows with no key
 * (saints, the Fathers' works, prayers) stay as they are: that text is not
 * translated anywhere in the app yet.
 *
 * For an English reader this returns the rows untouched.
 */
export function inReadersLanguage(
  items: readonly SearchItem[],
  t: (key: string) => string,
  tn?: (keyBase: string, count: number) => string,
): SearchItem[] {
  return items.map((item) => {
    const label = line(t, item.labelKey);
    const sublabel =
      item.sublabelCount === undefined ? line(t, item.sublabelKey) : counted(tn, item.sublabelKey, item.sublabelCount);
    const newLabel = label !== null && label !== item.label;
    const newSublabel = sublabel !== null && sublabel !== item.sublabel;
    if (!newLabel && !newSublabel) return item;
    return {
      ...item,
      label: newLabel ? label : item.label,
      sublabel: newSublabel ? sublabel : item.sublabel,
      keywords: newLabel ? `${item.keywords ?? ""} ${item.label}`.trim() : item.keywords,
    };
  });
}
