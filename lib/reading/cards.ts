import "server-only";

import stats from "@/data/reading/stats.json";
import { SAINTS, type Saint } from "@/lib/saints/saints";

import { THEME_IDS, type EraId, type ThemeId, type TraditionId } from "./catalog";
import { PASSAGES } from "./collections";
import { coverArtFor, coverSrc } from "./coverArt";
import { AUTHOR_META, BEGIN_ORDER, ENTRIES, SUBJECTS, bylineOf, coverSubject, type ReadingEntry, type ThemeTag, type WorkKey } from "./entries";
import { COLLECTION_SLUGS } from "./feelings";
import { moreLikeThis, tileOf, type AuthorInfo, type Card, type FeaturedCandidate, type HeaderCard, type Room, type ThemePick } from "./select";
import { workHref } from "./workHref";

/**
 * The reading room's cards, built on the server from the saints' registry,
 * the room's entries (lib/reading/entries.ts), the counted lengths
 * (data/reading/stats.json) and the cover pictures (lib/reading/coverArt.ts),
 * and handed to the room as a page's props: about 130 small cards, so the
 * room's script carries no registry and reads no text. `native` is
 * IS_STATIC_EXPORT, which decides each cover's address (coverSrc).
 */

type Stat = { words: number; minutes: number; sections: [number, number][] };
const STATS = stats as unknown as Record<string, Stat>;

const SAINT_BY_SLUG = new Map(SAINTS.map((s) => [s.slug, s]));

export function statFor(key: string): Stat | null {
  return STATS[key] ?? null;
}

/** Minutes for a part of a work: its sections' words at the house's pace. */
export function minutesOf(key: string, sections?: ThemeTag["sections"]): number {
  const stat = statFor(key);
  if (!stat) return 1;
  if (!sections?.length) return stat.minutes;
  const words = stat.sections
    .filter(([n]) => sections.some(([from, to]) => n >= from && n <= to))
    .reduce((sum, [, w]) => sum + w, 0);
  return Math.max(1, Math.round(words / 180));
}

/** A saint's or a Life's subject's name, as the cover and the search say it. */
export function nameOf(slug: string): string | null {
  return SAINT_BY_SLUG.get(slug)?.name ?? SUBJECTS[slug]?.name ?? null;
}

function metaOf(slug: string | null | undefined) {
  if (!slug) return undefined;
  return AUTHOR_META[slug] ?? SUBJECTS[slug];
}

/** The work's traditions: its author's and its subject's together, unless it names its own. */
export function traditionsOf(entry: ReadingEntry): TraditionId[] {
  if (entry.traditions) return [...entry.traditions];
  const out = new Set<TraditionId>();
  for (const t of metaOf(entry.by)?.traditions ?? []) out.add(t);
  for (const t of metaOf(entry.about)?.traditions ?? []) out.add(t);
  return [...out];
}

/** The work's era: its own, else its author's, else its subject's. */
export function eraOf(entry: ReadingEntry): EraId | undefined {
  return entry.era ?? metaOf(entry.by)?.era ?? metaOf(entry.about)?.era;
}

/** Each theme's first section, for a theme the work treats only in part. */
function firstSections(themes: readonly ThemeTag[]): Card["at"] {
  const at: Partial<Record<ThemeId, number>> = {};
  for (const tag of themes) if (tag.sections?.length) at[tag.theme] = Math.min(...tag.sections.map(([from]) => from));
  return Object.keys(at).length ? at : undefined;
}

export function cardFor(saint: Saint, workSlug: string, native: boolean): Card | null {
  const key = `${saint.slug}/${workSlug}` as WorkKey;
  const entry = ENTRIES[key];
  const work = saint.works.find((w) => w.slug === workSlug);
  if (!entry || !work) return null;
  const line = bylineOf(entry);
  const subject = coverSubject(entry);
  // Only a settled picture: the subject's, else the author's.
  const art = coverArtFor(subject) ?? (entry.by && entry.by !== subject ? coverArtFor(entry.by) : null);
  return {
    key,
    title: work.title,
    ...(work.subtitle ? { subtitle: work.subtitle } : {}),
    author: line.slug ? nameOf(line.slug) : null,
    authorSlug: line.slug,
    ...(entry.about && entry.about !== line.slug ? { about: entry.about } : {}),
    byline: line.kind,
    minutes: minutesOf(key),
    ...(eraOf(entry) ? { era: eraOf(entry) } : {}),
    traditions: traditionsOf(entry),
    themes: [...new Set(entry.themes.map((t) => t.theme))].sort((a, b) => THEME_IDS.indexOf(a) - THEME_IDS.indexOf(b)),
    ...(firstSections(entry.themes) ? { at: firstSections(entry.themes) } : {}),
    ...(entry.scope === "selections" ? { selections: true as const } : {}),
    ...(entry.form === "retelling" ? { retelling: true as const } : {}),
    ...(entry.begin ? { begin: true as const } : {}),
    ...(art ? { cover: { src: coverSrc(art, native), focusY: art.focusY } } : {}),
    topics: work.topics ?? [],
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** The days from Pascha of the feasts that move with it, as the registry names them. */
const MOVABLE: Record<string, number> = {
  "Second Sunday of Great Lent": -42,
  "Fifth Sunday of Great Lent": -21,
  "Antipascha (Thomas Sunday)": 7,
  "Third Sunday of Pascha": 14,
};

export function feastsOf(days: readonly string[]): { feasts: string[]; movable: number[] } {
  const feasts: string[] = [];
  const movable: number[] = [];
  for (const d of days) {
    if (d in MOVABLE) {
      movable.push(MOVABLE[d]);
      continue;
    }
    const m = /^([A-Z][a-z]+) (\d{1,2})\b/.exec(d);
    const month = m ? MONTHS.indexOf(m[1]) : -1;
    if (m && month >= 0) feasts.push(`${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`);
  }
  return { feasts, movable };
}

function authorInfo(slug: string): AuthorInfo | null {
  const saint = SAINT_BY_SLUG.get(slug);
  if (saint) return { name: saint.name, ...(saint.byname ? { byname: saint.byname } : {}), ...feastsOf(saint.feastDays) };
  const subject = SUBJECTS[slug];
  return subject ? { name: subject.name, ...feastsOf(subject.feasts) } : null;
}

/** Every work the room shows, once: a work registered twice is shown as its twin. */
export function allCards(native: boolean): Card[] {
  const out: Card[] = [];
  for (const saint of SAINTS) {
    for (const work of saint.works) {
      const entry = ENTRIES[`${saint.slug}/${work.slug}` as WorkKey];
      if (!entry || entry.sameAs) continue;
      const card = cardFor(saint, work.slug, native);
      if (card) out.push(card);
    }
  }
  return out;
}

/** The parts of works the theme rows open: each theme's best reading, and every season's readings. */
function themePicks(): ThemePick[] {
  const picks: ThemePick[] = [];
  for (const saint of SAINTS) {
    for (const work of saint.works) {
      const key = `${saint.slug}/${work.slug}` as WorkKey;
      const entry = ENTRIES[key];
      if (!entry || entry.sameAs) continue;
      for (const tag of entry.themes) {
        const season = ["lent", "holyWeek", "pascha", "nativityFast", "nativity", "theophany", "transfiguration", "dormition"].includes(tag.theme);
        if (!tag.best && !season) continue;
        const first = tag.sections?.length ? Math.min(...tag.sections.map(([from]) => from)) : null;
        picks.push({
          theme: tag.theme,
          key,
          href: first !== null ? `${workHref(saint.slug, work.slug)}#s${first}` : workHref(saint.slug, work.slug),
          minutes: minutesOf(key, tag.sections),
          ...(tag.part ? { part: tag.part } : {}),
          ...(tag.best ? { best: true as const } : {}),
        });
      }
    }
  }
  return picks;
}

/** What the room is handed: the cards, the theme rows' parts, the authors, and the books that may stand at the top. */
export function buildRoom(native: boolean): Room {
  const cards = allCards(native);
  const slugs = new Set(cards.flatMap((c) => [c.authorSlug, c.about]).filter((s): s is string => Boolean(s)));
  const authors: Record<string, AuthorInfo> = {};
  for (const slug of slugs) {
    const info = authorInfo(slug);
    if (info) authors[slug] = info;
  }
  const featured: FeaturedCandidate[] = [];
  for (const card of cards) {
    const entry = ENTRIES[card.key as WorkKey];
    if (!entry?.featured) continue;
    const [saintSlug, workSlug] = card.key.split("/");
    const blurb = SAINT_BY_SLUG.get(saintSlug)?.works.find((w) => w.slug === workSlug)?.blurb ?? "";
    const first = statFor(card.key)?.sections[0]?.[0] ?? 1;
    featured.push({ key: card.key, blurb, first, ...(entry.featured.seasons?.length ? { seasons: [...entry.featured.seasons] } : {}) });
  }
  // The row by feeling (1.8): each door carries only its count, never a passage.
  const feelings = COLLECTION_SLUGS.map((slug) => ({ slug, count: PASSAGES[slug].length }));
  return { cards, picks: themePicks(), authors, featured, begin: [...BEGIN_ORDER], feelings };
}

const rooms = new Map<boolean, Room>();
/** The room, built once per build target: every work's page asks it for more like itself. */
function roomFor(native: boolean): Room {
  let room = rooms.get(native);
  if (!room) {
    room = buildRoom(native);
    rooms.set(native, room);
  }
  return room;
}

/** How many theme chips a book's page shows: its best readings first. */
const CHIPS = 6;

/**
 * What a work's page draws above and below its text (components/reading/
 * BookHeader.tsx, MoreLikeThis.tsx). A work registered twice is shown as its
 * twin at the foot, so More like this never offers the same book again.
 */
export function bookPage(saint: Saint, workSlug: string, native: boolean) {
  const key = `${saint.slug}/${workSlug}` as WorkKey;
  const entry = ENTRIES[key];
  const work = saint.works.find((w) => w.slug === workSlug);
  const card = cardFor(saint, workSlug, native);
  if (!entry || !work || !card) return null;
  const twin = entry.sameAs ?? key;
  const stat = statFor(key);
  const line = bylineOf(entry);
  const themes = [...entry.themes]
    .sort((a, b) => Number(Boolean(b.best)) - Number(Boolean(a.best)) || THEME_IDS.indexOf(a.theme) - THEME_IDS.indexOf(b.theme))
    .map((t) => t.theme)
    .filter((id, i, all) => all.indexOf(id) === i)
    .slice(0, CHIPS);
  // Only what the header and the foot row draw: every work's page carries it.
  const head: HeaderCard = {
    key: card.key,
    title: card.title,
    ...(card.subtitle ? { subtitle: card.subtitle } : {}),
    author: card.author,
    byline: card.byline,
    minutes: card.minutes,
    ...(card.era ? { era: card.era } : {}),
    traditions: card.traditions,
    ...(card.selections ? { selections: card.selections } : {}),
    ...(card.cover ? { cover: card.cover } : {}),
  };
  return {
    key: twin,
    like: moreLikeThis(roomFor(native), twin, 8).map(tileOf),
    header: {
      card: head,
      blurb: work.blurb,
      authorHref: line.slug && SAINT_BY_SLUG.has(line.slug) ? `/saints/${line.slug}` : null,
      themes,
      saint: { slug: saint.slug, name: saint.name },
      first: stat?.sections[0]?.[0] ?? 1,
      total: stat?.sections.length ?? 1,
    },
  };
}
