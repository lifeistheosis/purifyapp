import {
  ERAS,
  THEMES,
  TRADITIONS,
  lengthBucket,
  themesIn,
  type EraId,
  type LengthId,
  type PartKind,
  type SeasonId,
  type ThemeGroup,
  type ThemeId,
  type TraditionId,
} from "./catalog";
import { orthodoxPascha } from "@/lib/calendar/pascha";

import type { FeelingDoor } from "./feelings";
import { readingSeason, type CalendarStyle } from "./seasons";
import { workHref } from "./workHref";

/**
 * What the reading room draws, worked out from the cards the server hands it
 * (lib/reading/cards.ts). Pure and client-safe: no registry is imported, so
 * the room's script carries only what its page was given.
 */

/** One work as the room knows it: what its cover, its rows and the search need. */
export type Card = {
  /** "<saint>/<work>": its page is /saints/<key> (cardHref). */
  key: string;
  title: string;
  subtitle?: string;
  /** The name on the cover: the author, or the saint it is about; null when anonymous. */
  author: string | null;
  /** That saint's slug, for the author filter and "the same author". */
  authorSlug: string | null;
  /** The saint a Life is about, when the byline names its author: kept on his feast too. */
  about?: string;
  byline: "by" | "about" | "anonymous";
  minutes: number;
  era?: EraId;
  traditions: TraditionId[];
  themes: ThemeId[];
  /** The first section a theme is treated in, when only part of the work treats it. */
  at?: Partial<Record<ThemeId, number>>;
  selections?: true;
  retelling?: true;
  begin?: true;
  cover?: { src: string; focusY: number };
  /** The registry's own topics, for the search. */
  topics: string[];
};

/** What a cover on a row needs, and no more: a work's page hands its foot row only this. */
export type TileCard = Pick<Card, "key" | "title" | "author" | "minutes" | "selections" | "cover">;

/** What a book's header needs. */
export type HeaderCard = Pick<Card, "key" | "title" | "subtitle" | "author" | "byline" | "minutes" | "era" | "traditions" | "selections" | "cover">;

export function tileOf(c: Card): TileCard {
  return {
    key: c.key,
    title: c.title,
    author: c.author,
    minutes: c.minutes,
    ...(c.selections ? { selections: c.selections } : {}),
    ...(c.cover ? { cover: c.cover } : {}),
  };
}

/** A part of a work a theme row opens: the passions, the virtues, daily life, the seasons. */
export type ThemePick = {
  theme: ThemeId;
  key: string;
  /** Straight to the part: the work's page at its first section. */
  href: string;
  minutes: number;
  part?: { kind: PartKind; from: number; to?: number };
  best?: true;
};

export type AuthorInfo = {
  name: string;
  byname?: string;
  /** Fixed feasts as "MM-DD". */
  feasts: string[];
  /** Feasts that move with Pascha, as days from it. */
  movable: number[];
};

export type FeaturedCandidate = {
  key: string;
  blurb: string;
  /** The work's first section, where Start reading opens. */
  first: number;
  seasons?: SeasonId[];
};

export type Room = {
  cards: Card[];
  picks: ThemePick[];
  authors: Record<string, AuthorInfo>;
  featured: FeaturedCandidate[];
  begin: string[];
  /** The row by feeling (1.8): each feeling's Purify collection and how many passages it holds. */
  feelings: FeelingDoor[];
};

export type Filters = {
  theme?: ThemeId;
  author?: string;
  era?: EraId;
  length?: LengthId;
  tradition?: TraditionId;
};

/** The words the search reads besides a work's own: labels in the reader's language. */
export type SearchLabels = {
  theme: (id: ThemeId) => string;
  tradition: (id: TraditionId) => string;
  era: (id: EraId) => string;
};

const byKey = (cards: Card[]) => new Map(cards.map((c) => [c.key, c]));

/** At most `perAuthor` of one author before the next author's turn, so a row is not one saint. */
export function varied(cards: Card[], perAuthor = 2, max = 16): Card[] {
  const ranked = [...cards].sort((a, b) => rank(b) - rank(a) || a.title.localeCompare(b.title));
  const out: Card[] = [];
  const taken = new Map<string, number>();
  const rest: Card[] = [];
  for (const c of ranked) {
    const who = c.authorSlug ?? c.key;
    const n = taken.get(who) ?? 0;
    if (n < perAuthor) {
      out.push(c);
      taken.set(who, n + 1);
    } else rest.push(c);
  }
  return [...out, ...rest].slice(0, max);
}

/** The Fathers' own words first, whole works before excerpts, a picture before a plate. */
function rank(c: Card): number {
  return (c.begin ? 4 : 0) + (c.retelling ? 0 : 3) + (c.selections ? 0 : 2) + (c.cover ? 1 : 0);
}

export function beginRow(room: Room): Card[] {
  const map = byKey(room.cards);
  return room.begin.map((k) => map.get(k)).filter((c): c is Card => Boolean(c));
}

/** The passions, the virtues or daily life: the one best reading of each theme, in order. */
export function themeRow(room: Room, group: Exclude<ThemeGroup, "seasons">): ThemePick[] {
  return themesIn(group)
    .map((theme) => room.picks.find((p) => p.theme === theme && p.best))
    .filter((p): p is ThemePick => Boolean(p));
}

/** A season's readings: its parts of works first, then whole works. */
export function seasonRow(room: Room, season: SeasonId): ThemePick[] {
  return room.picks
    .filter((p) => p.theme === season)
    .sort((a, b) => Number(Boolean(b.part)) - Number(Boolean(a.part)));
}

/** A row per tradition with at least `min` works; the empty ones wait for their works. */
export function traditionRows(room: Room, min = 4): { id: TraditionId; cards: Card[]; total: number }[] {
  return TRADITIONS.map(({ id }) => {
    const all = room.cards.filter((c) => c.traditions.includes(id));
    return { id, cards: varied(all), total: all.length };
  }).filter((r) => r.total >= min);
}

/** Short reads: whole works of twenty minutes or less, in the Fathers' own words. */
export function shortRow(room: Room): Card[] {
  return varied(
    room.cards.filter((c) => c.minutes <= 20 && !c.selections && !c.retelling),
    2,
    16,
  );
}

/**
 * More like this: the works that share most with this one. A shared theme
 * weighs most, then the same author, then a shared tradition and era. Never
 * the work itself.
 */
export function moreLikeThis(room: Room, key: string, n = 8): Card[] {
  const self = room.cards.find((c) => c.key === key);
  if (!self) return [];
  const scored = room.cards
    .filter((c) => c.key !== key)
    .map((c) => {
      const themes = c.themes.filter((t) => self.themes.includes(t)).length;
      const author = self.authorSlug && c.authorSlug === self.authorSlug ? 1 : 0;
      const traditions = c.traditions.filter((t) => self.traditions.includes(t)).length;
      const era = self.era && c.era === self.era ? 1 : 0;
      const score = themes * 3 + author * 2 + Math.min(traditions, 1) + era + (c.retelling ? 0 : 0.5);
      return { c, score };
    })
    .filter((s) => s.score >= 1.5)
    .sort((a, b) => b.score - a.score || a.c.title.localeCompare(b.c.title));
  // Two of one author at most, as on every row, in the order of the score.
  const out: Card[] = [];
  const taken = new Map<string, number>();
  for (const { c } of scored) {
    const who = c.authorSlug ?? c.key;
    const k = taken.get(who) ?? 0;
    if (k >= 2) continue;
    out.push(c);
    taken.set(who, k + 1);
    if (out.length >= n) break;
  }
  return out;
}

/** Folded for matching: no case, no accents ("Ephrem" finds "Ephrém"). */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function matchesFilters(c: Card, f: Filters): boolean {
  if (f.theme && !c.themes.includes(f.theme)) return false;
  if (f.author && c.authorSlug !== f.author) return false;
  if (f.era && c.era !== f.era) return false;
  if (f.tradition && !c.traditions.includes(f.tradition)) return false;
  if (f.length && lengthBucket(c.minutes) !== f.length) return false;
  return true;
}

/**
 * The search: every word of the query must be found somewhere in a work, its
 * title and subtitle, its author's name and byname, its topics, or the names
 * of its themes, traditions and era in the reader's language. Then the
 * filters. Titles that match come first.
 */
export function searchCards(room: Room, query: string, filters: Filters, labels: SearchLabels): Card[] {
  const words = fold(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const hits: { c: Card; score: number }[] = [];
  for (const c of room.cards) {
    if (!matchesFilters(c, filters)) continue;
    if (words.length === 0) {
      hits.push({ c, score: 0 });
      continue;
    }
    const author = c.authorSlug ? room.authors[c.authorSlug] : undefined;
    const title = fold(`${c.title} ${c.subtitle ?? ""}`);
    const rest = fold(
      [
        author?.name,
        author?.byname,
        ...c.topics,
        ...c.themes.map(labels.theme),
        ...c.traditions.map(labels.tradition),
        c.era ? labels.era(c.era) : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    let score = 0;
    let all = true;
    for (const w of words) {
      if (title.includes(w)) score += 2;
      else if (rest.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) hits.push({ c, score });
  }
  return hits.sort((a, b) => b.score - a.score || rank(b.c) - rank(a.c) || a.c.title.localeCompare(b.c.title)).map((h) => h.c);
}

/** A work's page (lib/reading/workHref.ts), from its key: the cards do not carry it. */
export function cardHref(c: Pick<Card, "key">): string {
  const [saint, work] = c.key.split("/");
  return workHref(saint, work);
}

/** Where a card opens when a theme filter is on: at that theme's part, if it has one. */
export function hrefFor(c: Card, theme?: ThemeId): string {
  const n = theme ? c.at?.[theme] : undefined;
  return n !== undefined ? `${cardHref(c)}#s${n}` : cardHref(c);
}

/**
 * How many works each choice of a filter would leave: the search's words and
 * the other filters as they are, this one set to each choice in turn.
 */
export function optionCounts<K extends keyof Filters>(
  room: Room,
  query: string,
  filters: Filters,
  labels: SearchLabels,
  which: K,
  values: readonly NonNullable<Filters[K]>[],
): Map<NonNullable<Filters[K]>, number> {
  const others = { ...filters, [which]: undefined };
  const pool = searchCards(room, query, others, labels);
  return new Map(values.map((v) => [v, pool.filter((c) => matchesFilters(c, { [which]: v } as Filters)).length]));
}

const DAY = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The book at the top of the room, for the reader's own day (lib/calendar/
 * useToday.ts) and calendar: a work by or about the saint the Church keeps
 * today, else one kept for the season, else one for the week, in turn.
 */
export function featuredFor(room: Room, day: Date, style: CalendarStyle): { key: string; reason: "feast" | "season" | "week" } | null {
  const pool = room.featured.filter((f) => room.cards.some((c) => c.key === f.key));
  if (pool.length === 0) return null;
  // On the Old Calendar a fixed feast falls thirteen civil days later: read
  // the day back into its own calendar.
  const own = style === "old" ? new Date(day.getTime() - 13 * DAY) : day;
  const mmdd = `${pad(own.getUTCMonth() + 1)}-${pad(own.getUTCDate())}`;
  const fromPascha = Math.round((Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12) - orthodoxPascha(day.getUTCFullYear()).getTime()) / DAY);
  const cards = byKey(room.cards);
  const feast = pool.find((f) => {
    const c = cards.get(f.key);
    return [c?.about, c?.authorSlug].some((slug) => {
      const a = slug ? room.authors[slug] : undefined;
      return Boolean(a && (a.feasts.includes(mmdd) || a.movable.includes(fromPascha)));
    });
  });
  if (feast) return { key: feast.key, reason: "feast" };
  const { current } = readingSeason(day, style);
  if (current) {
    const kept = pool.filter((f) => f.seasons?.includes(current));
    if (kept.length) return { key: kept[Math.floor(day.getTime() / DAY) % kept.length].key, reason: "season" };
  }
  const weekly = pool.filter((f) => !f.seasons?.length);
  const list = weekly.length ? weekly : pool;
  const week = Math.floor(day.getTime() / (7 * DAY));
  return { key: list[week % list.length].key, reason: "week" };
}

/** The theme labels in their catalog order, for the theme sheet. */
export const THEME_ORDER: readonly ThemeId[] = THEMES.map((t) => t.id);
export const ERA_ORDER: readonly EraId[] = ERAS.map((e) => e.id);
