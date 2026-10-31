// What the one search finds, and how it is laid out (1.8, the owner's pick of
// r3-12: "C, with the mix of B"). Pure, and apart from the screen
// (components/search/CommandPalette.tsx), so every rule here is tested
// against the real lists in lib/search/__tests__/engine.test.ts.
//
// ONE INDEX. The app had two lists: search-corpus.json, everything in the
// library by name, and theology-search.json, the theology library with a
// line under each study. The pill on Theology read one and the bar's
// magnifier the other, so the same word gave two answers on one screen.
// mergeIndex lays the second over the first by address: a study the corpus
// already lists gains its line and its kind in the theology library; one it
// does not (the apologetics) is added. Both files ship in the apps' export,
// so the search answers with no signal at all.
//
// DOORS AND KINDS (./places.ts). A door is a part of the library; a row can
// stand behind two (a heresy is in Theology and in the Councils). A kind is
// the row's place on its door's strip, and the same row can be a different
// kind behind different doors (St Athanasius is one of the Saints, and one of
// the Fathers in Theology).
//
// WHAT IS SHOWN. Before anything is typed, the doors and the reader's recent
// words. While typing, the doors count what each holds for the words, the
// top result is drawn as a band with its picture, and the words that finish
// the last one typed sit over the field. After the Search key, the results:
// in Everything grouped by the list's own groups, three of each; behind a
// door grouped by its kinds. When nothing answers, a near spelling.

import { normalize } from "./match";
import {
  DOOR_KINDS,
  DOORS,
  GROUP_DOOR,
  doorOf,
  type DoorId,
  type KindId,
} from "./places";
import { GROUP_ORDER, type SearchGroup, type SearchItem } from "./types";

/** The theology library's own kinds, as app/theology-search.json writes them. */
export type TheologySectionName = "Doctrine" | "Topics" | "Heresies" | "Apologetics" | "Councils" | "Fathers";

/** A row of app/theology-search.json (lib/theology/searchKinds.ts, TheologySearchItem). */
export type TheologyEntry = {
  slug: string;
  title: string;
  href: string;
  section: TheologySectionName;
  summary?: string;
};

/** A row of the one index: a corpus row, with its kind in the theology library when it has one. */
export type SearchRow = SearchItem & { section?: TheologySectionName };

const SECTION_KIND: Readonly<Record<TheologySectionName, KindId>> = {
  Doctrine: "doctrine",
  Topics: "topics",
  Heresies: "heresies",
  Apologetics: "apologetics",
  Councils: "councils",
  Fathers: "fathers",
};

/**
 * The theology library laid over the corpus, by address. A study the corpus
 * lists keeps its name there and gains its line and its kind; one it does not
 * list is added under Topics, where the corpus files the theology library.
 */
export function mergeIndex(corpus: readonly SearchItem[], theology: readonly TheologyEntry[]): SearchRow[] {
  const rows: SearchRow[] = corpus.map((item) => ({ ...item }));
  const at = new Map<string, number>();
  rows.forEach((row, i) => {
    if (!at.has(row.href)) at.set(row.href, i);
  });
  const ids = new Set(rows.map((r) => r.id));
  for (const entry of theology) {
    if (!entry || typeof entry.href !== "string" || typeof entry.title !== "string") continue;
    const i = at.get(entry.href);
    if (i !== undefined) {
      const row = rows[i];
      // The library's own name for it stays findable when it differs ("First
      // Council of Nicaea" for "The First Ecumenical Council").
      const also = normalize(entry.title) !== normalize(row.label) ? entry.title : "";
      rows[i] = {
        ...row,
        section: row.section ?? entry.section,
        line: row.line ?? entry.summary,
        keywords: [row.keywords, also].filter(Boolean).join(" ") || undefined,
      };
      continue;
    }
    let id = `${entry.section.toLowerCase()}-${entry.slug}`;
    while (ids.has(id)) id = `${id}-x`;
    ids.add(id);
    at.set(entry.href, rows.length);
    rows.push({
      id,
      label: entry.title,
      href: entry.href,
      group: "Topics",
      section: entry.section,
      ...(entry.summary ? { line: entry.summary } : {}),
    });
  }
  return rows;
}

/** The dictionary's definitions as the lines under its words, once its list is loaded. */
export function withDefinitions(rows: readonly SearchRow[], terms: readonly { id: string; definition: string }[]): SearchRow[] {
  const by = new Map(terms.map((t) => [`/dictionary#${t.id}`, t.definition]));
  return rows.map((row) => {
    const definition = by.get(row.href);
    return definition && !row.line ? { ...row, line: definition } : row;
  });
}

/** Whether a row stands behind a door. */
export function inDoor(row: SearchRow, door: DoorId): boolean {
  switch (door) {
    case "all":
      return true;
    case "bible":
      return row.group === "Bible";
    case "saints":
      // The Saints page's own search found the saints and what they wrote.
      return row.group === "Saints" || row.id.startsWith("work-");
    case "prayers":
      return row.group === "Prayers";
    case "reading":
      return row.group === "Reading";
    case "theology":
      // The theology library's own list, and what the corpus files with it
      // (the dictionary, the Fathers on everyday struggles).
      return row.section !== undefined || row.group === "Topics";
    case "councils":
      return row.group === "Councils & Heresies";
    case "history":
      return row.group === "History";
    case "shop":
      return row.href === "/shop" || row.href.startsWith("/shop/");
  }
}

const PREFIX_KIND: readonly [string, KindId][] = [
  ["saint-", "saints"],
  ["work-", "writings"],
  ["rule-", "rules"],
  ["akathist-", "akathists"],
  ["chant-", "chants"],
  ["lesson-", "lessons"],
  ["plan-", "plans"],
  ["walkthrough-", "walkthroughs"],
  ["council-", "councils"],
  ["heresy-", "heresies"],
  ["dictionary-", "dictionary"],
];

/** A row's kind on a door's strip, or null where the door has no strip or the row no kind on it. */
export function kindIn(row: SearchRow, door: DoorId): KindId | null {
  const kinds = DOOR_KINDS[door];
  if (!kinds) return null;
  let kind: KindId | null = null;
  if (door === "theology" && row.section) kind = SECTION_KIND[row.section];
  else kind = PREFIX_KIND.find(([prefix]) => row.id.startsWith(prefix))?.[1] ?? null;
  return kind && kinds.includes(kind) ? kind : null;
}

/** The rows behind a door, narrowed to a kind on its strip when one is chosen. */
export function behind(rows: readonly SearchRow[], door: DoorId, kind: KindId | null = null): SearchRow[] {
  return rows.filter((r) => inDoor(r, door) && (!kind || kindIn(r, door) === kind));
}

/** A row ready to be searched: its name and everything findable in it, folded once. */
export type Prepared = { row: SearchRow; name: string; hay: string };

export function prepare(rows: readonly SearchRow[]): Prepared[] {
  return rows.map((row) => ({
    row,
    name: normalize(row.label),
    hay: normalize(`${row.label} ${row.sublabel ?? ""} ${row.keywords ?? ""} ${row.line ?? ""}`),
  }));
}

/**
 * Every row the words find, best first, then by name: the name beginning
 * with them, then a word of the name beginning with them (in any script),
 * then the name holding them, then anything else on the row holding them.
 * The same order lib/search/match.ts gives, without its limit, since the
 * doors count everything found.
 */
export function rank(prepared: readonly Prepared[], query: string): SearchRow[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordStart = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}`, "u");
  const scored: { row: SearchRow; s: number }[] = [];
  for (const p of prepared) {
    let s = -1;
    if (p.name.startsWith(q)) s = 0;
    else if (wordStart.test(p.name)) s = 1;
    else if (p.name.includes(q)) s = 2;
    else if (p.hay.includes(q)) s = 3;
    if (s >= 0) scored.push({ row: p.row, s });
  }
  scored.sort((a, b) => a.s - b.s || a.row.label.localeCompare(b.row.label));
  return scored.map((x) => x.row);
}

/**
 * The results: rows worked out from the words themselves first (a typed Bible
 * reference), then rows only the Bible's own parser names (a book by its
 * abbreviation, "mt", which no name in the list begins with), then the
 * index's own, each address once.
 */
export function results(
  prepared: readonly Prepared[],
  query: string,
  extra: { lead?: readonly SearchRow[]; boost?: readonly string[] } = {},
): SearchRow[] {
  const ranked = rank(prepared, query);
  if (!query.trim()) return ranked;
  const seen = new Set<string>();
  const out: SearchRow[] = [];
  const take = (row: SearchRow | undefined) => {
    if (!row || seen.has(row.href)) return;
    seen.add(row.href);
    out.push(row);
  };
  for (const row of extra.lead ?? []) take(row);
  if (extra.boost?.length) {
    const found = new Set(ranked.map((r) => r.id));
    const byId = new Map(prepared.map((p) => [p.row.id, p.row]));
    for (const id of extra.boost) if (!found.has(id)) take(byId.get(id));
  }
  for (const row of ranked) take(row);
  return out;
}

/** How many of the found rows stand behind each door; Everything counts them all. */
export function doorCounts(found: readonly SearchRow[]): Map<DoorId, number> {
  const counts = new Map<DoorId, number>();
  for (const door of DOORS) {
    counts.set(door.id, door.id === "all" ? found.length : found.filter((r) => inDoor(r, door.id)).length);
  }
  return counts;
}

/** How many rows of each kind stand behind a door (its strip's counts). */
export function kindCounts(rows: readonly SearchRow[], door: DoorId): Map<KindId, number> {
  const counts = new Map<KindId, number>();
  for (const kind of DOOR_KINDS[door] ?? []) counts.set(kind, 0);
  for (const row of rows) {
    if (!inDoor(row, door)) continue;
    const kind = kindIn(row, door);
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return counts;
}

/**
 * The doors to show once something is typed: Everything first, then each
 * door that found something, most first, and the door the search is turned
 * to even when it found nothing, so the reader sees where they are.
 */
export function doorsFound(counts: ReadonlyMap<DoorId, number>, current: DoorId): DoorId[] {
  const rest = DOORS.filter((d) => d.id !== "all")
    .map((d, i) => ({ id: d.id, n: counts.get(d.id) ?? 0, i }))
    .filter((d) => d.n > 0 || d.id === current)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((d) => d.id);
  return ["all", ...rest];
}

export type Section = {
  /** A group of the list (in Everything) or a kind on the door's strip. */
  key: string;
  group?: SearchGroup;
  kind?: KindId;
  rows: SearchRow[];
};

/** Everything's results, under the list's own groups, in the groups' order. */
export function groupSections(rows: readonly SearchRow[]): Section[] {
  const by = new Map<SearchGroup, SearchRow[]>();
  for (const row of rows) by.set(row.group, [...(by.get(row.group) ?? []), row]);
  return GROUP_ORDER.flatMap((group) => {
    const list = by.get(group);
    return list?.length ? [{ key: group, group, rows: list }] : [];
  });
}

/**
 * A door's results, under its kinds in the strip's order; rows with no kind
 * on the strip (a door's own screens) close the list under Other.
 */
export function kindSections(rows: readonly SearchRow[], door: DoorId): Section[] {
  const kinds = DOOR_KINDS[door];
  if (!kinds) return rows.length ? [{ key: door, rows: [...rows] }] : [];
  const by = new Map<KindId, SearchRow[]>();
  const other: SearchRow[] = [];
  for (const row of rows) {
    const kind = kindIn(row, door);
    if (kind) by.set(kind, [...(by.get(kind) ?? []), row]);
    else other.push(row);
  }
  const sections: Section[] = kinds.flatMap((kind) => {
    const list = by.get(kind);
    return list?.length ? [{ key: kind, kind, rows: list }] : [];
  });
  if (other.length) sections.push({ key: "other", group: "Other", rows: other });
  return sections;
}

/** The picture a row is drawn over as the top result: its own, or its door's. */
export function pictureFor(row: SearchRow): { src: string; focus?: string } | null {
  if (row.picture) return { src: row.picture, focus: row.group === "Saints" ? "50% 18%" : undefined };
  const door = row.href === "/shop" || row.href.startsWith("/shop/") ? "shop" : GROUP_DOOR[row.group];
  if (!door) return null;
  const d = doorOf(door);
  return d.picture ? { src: d.picture, focus: d.focus } : null;
}

/**
 * A name cut where the typed words are in it, to light them: case and
 * accents aside, so "nicaea" lights "Nicaea" and "chrysostomos" lights
 * "Chrysóstomos". Every place they are found, as the old prayer search lit
 * them; the pieces join back into the name unchanged.
 */
export function hitParts(text: string, query: string): { text: string; hit: boolean }[] {
  const q = normalize(query.trim());
  if (!q || !text) return [{ text, hit: false }];
  // Fold the name a character at a time, remembering where each folded
  // letter came from, so a match in the folded name maps back to the name.
  let folded = "";
  const from: number[] = [];
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i) ?? 0;
    const ch = String.fromCodePoint(cp);
    const f = normalize(ch);
    for (let k = 0; k < f.length; k++) from.push(i);
    folded += f;
    i += ch.length;
  }
  const parts: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  let at = folded.indexOf(q);
  while (at >= 0) {
    const start = from[at];
    const lastFolded = at + q.length - 1;
    const lastStart = from[lastFolded];
    const lastCp = text.codePointAt(lastStart) ?? 0;
    const end = lastStart + String.fromCodePoint(lastCp).length;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false });
    if (end > start) parts.push({ text: text.slice(start, end), hit: true });
    cursor = Math.max(cursor, end);
    at = folded.indexOf(q, at + q.length);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return parts.length ? parts : [{ text, hit: false }];
}

/* ── Words: what finishes the one being typed, and a near spelling ─────────── */

/** Each word the rows are named and described in, folded, with the form shown and how often it occurs. */
export type Vocabulary = Map<string, { word: string; n: number }>;

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu;

export function vocabulary(rows: readonly SearchRow[]): Vocabulary {
  const vocab: Vocabulary = new Map();
  for (const row of rows) {
    const text = `${row.label} ${row.line ?? ""}`;
    for (const match of text.matchAll(WORD)) {
      const shown = match[0].toLocaleLowerCase();
      if (shown.length < 3 || /^\d+$/.test(shown)) continue;
      const key = normalize(shown);
      const had = vocab.get(key);
      if (had) had.n += 1;
      else vocab.set(key, { word: shown, n: 1 });
    }
  }
  return vocab;
}

/** The last word of what is typed, and where it begins. */
function lastWord(query: string): { at: number; word: string } {
  const m = /([\p{L}\p{N}'’]+)$/u.exec(query);
  return m ? { at: m.index, word: m[1] } : { at: query.length, word: "" };
}

export type Completion = {
  /** What the field holds once it is chosen. */
  full: string;
  /** The part the reader typed, drawn quiet. */
  typed: string;
  /** The part that finishes it, drawn bright. */
  rest: string;
};

/**
 * The words that finish the last one typed (two letters or more), the most
 * used first, three at most. A word typed whole is not offered back, and
 * neither is a word of three letters ("the" would finish every "th").
 */
export function completions(vocab: Vocabulary, query: string, limit = 3): Completion[] {
  const { at, word } = lastWord(query);
  const typed = normalize(word);
  if (typed.length < 2) return [];
  const found: { word: string; n: number }[] = [];
  for (const [key, v] of vocab) {
    if (key.length >= 4 && key.length > typed.length && key.startsWith(typed)) found.push(v);
  }
  found.sort((a, b) => b.n - a.n || a.word.length - b.word.length || a.word.localeCompare(b.word));
  const head = query.slice(0, at);
  return found.slice(0, limit).map((v) => ({
    full: `${head}${v.word}`,
    typed: `${head}${word}`,
    rest: v.word.slice(word.length),
  }));
}

/**
 * How many single changes (a letter added, dropped, changed, or two side by
 * side swapped) turn one word into the other, or `max + 1` once it is past
 * `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array<number>(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, rows[i - 2][j - 2] + 1);
      rows[i][j] = d;
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/**
 * The words as the library spells them, when one is a letter or two off
 * ("chrystostom" gives "chrysostom"), or null when every word is the
 * library's own or none is near. One change for a word of five letters or
 * fewer, two for a longer one; the nearest wins, then the most used.
 */
export function nearSpelling(vocab: Vocabulary, query: string): string | null {
  let changed = false;
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const fixed = words.map((word) => {
    const key = normalize(word);
    if (key.length < 4 || vocab.has(key) || /\d/.test(key)) return word;
    const max = key.length <= 5 ? 1 : 2;
    let best: { word: string; d: number; n: number } | null = null;
    for (const [candidate, v] of vocab) {
      if (Math.abs(candidate.length - key.length) > max) continue;
      const d = editDistance(key, candidate, max);
      if (d > max) continue;
      if (!best || d < best.d || (d === best.d && v.n > best.n)) best = { word: v.word, d, n: v.n };
    }
    if (!best) return word;
    changed = true;
    return best.word;
  });
  return changed ? fixed.join(" ") : null;
}
