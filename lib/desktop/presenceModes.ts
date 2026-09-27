// The four Discord modes, as designed and approved on 26 September 2026
// (canvas: https://claude.ai/artifact/CkaiDdRjsmebHZRMQxLtDh, revisable in
// 1.5). Pure: the reader's choices, the page and a few facts in; the request
// desktop/src-tauri/src/presence.rs validates out. Every string comes through
// `t`, so the Settings preview and the real status are built by the same code
// and cannot disagree.
//
//   Patron saint    the patron's portrait, name and name day
//   Favorite saint  the saint's portrait, name and a line of their own words,
//                   a different one each day
//   Reading         what is open, Scripture or a saint's work: the portrait of
//                   whoever wrote it, where the reader is, and a live bar
//   Plus custom     any of the three, framed in the church season's color,
//                   with an optional gold rule
//
// What never changes from the first version (activity.ts): prayer shows only
// as "At prayer", private pages only as "In Purify", no clock is ever sent
// (C3), and a button opens only a public page.

import { activityFor } from "@/lib/desktop/activity";

export type PresenceMode = "off" | "patron" | "favorite" | "reading" | "plus";
export type PlusBase = "patron" | "favorite" | "reading";

export const SEASON_COLORS = ["gold", "purple", "crimson", "green", "blue", "white"] as const;
export type SeasonColor = (typeof SEASON_COLORS)[number];

export type PresencePrefs = {
  mode: PresenceMode;
  /** What Plus custom dresses up. */
  plusBase: PlusBase;
  /** Plus custom: take the color from the church calendar. */
  followSeason: boolean;
  /** Plus custom: the color when not following the calendar. */
  season: SeasonColor;
  /** Plus custom: a thin gold rule inside the frame. */
  gilded: boolean;
  /** Reading: say the chapter or section, not only the book or work. */
  showPlace: boolean;
  /** Reading: the progress bar on the portrait and the percent. */
  liveBar: boolean;
  /** Favorite saint, a registry slug. */
  favorite: string | null;
};

export const DEFAULT_PREFS: PresencePrefs = {
  mode: "off",
  plusBase: "reading",
  followSeason: true,
  season: "gold",
  gilded: true,
  showPlace: true,
  liveBar: true,
  favorite: null,
};

const MODES: readonly PresenceMode[] = ["off", "patron", "favorite", "reading", "plus"];
const BASES: readonly PlusBase[] = ["patron", "favorite", "reading"];
const SLUG = /^[a-z0-9-]{1,80}$/;

export function isSeasonColor(v: unknown): v is SeasonColor {
  return typeof v === "string" && (SEASON_COLORS as readonly string[]).includes(v);
}

/** Whatever was stored, as prefs. Anything unrecognised takes its default. */
export function parsePrefs(raw: unknown): PresencePrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    mode: MODES.includes(o.mode as PresenceMode) ? (o.mode as PresenceMode) : DEFAULT_PREFS.mode,
    plusBase: BASES.includes(o.plusBase as PlusBase) ? (o.plusBase as PlusBase) : DEFAULT_PREFS.plusBase,
    followSeason: bool(o.followSeason, DEFAULT_PREFS.followSeason),
    season: isSeasonColor(o.season) ? o.season : DEFAULT_PREFS.season,
    gilded: bool(o.gilded, DEFAULT_PREFS.gilded),
    showPlace: bool(o.showPlace, DEFAULT_PREFS.showPlace),
    liveBar: bool(o.liveBar, DEFAULT_PREFS.liveBar),
    favorite: typeof o.favorite === "string" && SLUG.test(o.favorite) ? o.favorite : null,
  };
}

/**
 * The mode actually in effect. Plus custom without Plus shows its base mode
 * plainly: the reader keeps a status, just not the frame.
 */
export function effectiveMode(prefs: PresencePrefs, plusAllowed: boolean): { base: PresenceMode; plus: boolean } {
  if (prefs.mode === "plus") return { base: prefs.plusBase, plus: plusAllowed };
  return { base: prefs.mode, plus: false };
}

// ── Facts the bridge looks up ────────────────────────────────────────────────

export type SaintFacts = { slug: string; name: string; pronoun: "his" | "her" };
export type NameDay = { today: boolean; date: string };
export type Quote = { text: string; source: string; href?: string };

export const POSITION_UNITS = ["chapter", "book", "homily", "part", "discourse", "letter", "section"] as const;
export type PositionUnit = (typeof POSITION_UNITS)[number];

/** Where the reader is in what they have open. `fraction` is how far through
 *  the current chapter or section, 0 to 1. */
export type ReadingPlace =
  | { kind: "scripture"; book: string; chapter: number; chapters: number; fraction: number; authorName?: string }
  | {
      kind: "work";
      saint: SaintFacts;
      path: string;
      title: string;
      unit: PositionUnit;
      section: number;
      sections: number;
      fraction: number;
    };

// ── What presence.rs receives ────────────────────────────────────────────────

/** presence.rs turns this into an image URL on purifyapp.net itself. */
export type PresenceArt = { saint?: string; progress?: number; season?: SeasonColor; gilded?: boolean };

/** What presence.rs accepts. Unknown fields are refused there. */
export type PresenceRequest = {
  details: string;
  state?: string;
  path?: string;
  buttonLabel?: string;
  /** The second button, always to the front page. */
  homeLabel?: string;
  largeText?: string;
  smallText?: string;
  art?: PresenceArt;
  badge?: SeasonColor;
};

type T = (key: string, vars?: Record<string, string | number>) => string;

// ── Small pure pieces ────────────────────────────────────────────────────────

/** Percent through a book or work: chapter `index` of `total`, `fraction` of
 *  the way through it. */
export function progressPercent(index: number, total: number, fraction: number): number {
  if (!(total > 0)) return 0;
  const i = Math.min(Math.max(Math.round(index), 1), total);
  const f = Math.min(Math.max(Number.isFinite(fraction) ? fraction : 0, 0), 1);
  return Math.max(0, Math.min(100, Math.round(((i - 1 + f) / total) * 100)));
}

/**
 * Whose portrait stands for a book of Scripture: its writer, where the
 * library has an icon of them. Anything else shows Purify's own mark.
 */
const SCRIPTURE_AUTHORS: Record<string, string> = {
  matthew: "apostle-matthew",
  john: "apostle-john",
  "1-john": "apostle-john",
  "2-john": "apostle-john",
  "3-john": "apostle-john",
  revelation: "apostle-john",
  romans: "apostle-paul",
  "1-corinthians": "apostle-paul",
  "2-corinthians": "apostle-paul",
  galatians: "apostle-paul",
  ephesians: "apostle-paul",
  philippians: "apostle-paul",
  colossians: "apostle-paul",
  "1-thessalonians": "apostle-paul",
  "2-thessalonians": "apostle-paul",
  "1-timothy": "apostle-paul",
  "2-timothy": "apostle-paul",
  titus: "apostle-paul",
  philemon: "apostle-paul",
  hebrews: "apostle-paul",
  "1-peter": "apostle-peter",
  "2-peter": "apostle-peter",
  jude: "apostle-jude",
  micah: "prophet-micah",
};

export function scriptureAuthor(book: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(SCRIPTURE_AUTHORS, book) ? SCRIPTURE_AUTHORS[book] : undefined;
}

/** The word a work uses for its parts, read off its first section's title. */
export function unitFor(firstSectionTitle: string | undefined): PositionUnit {
  const word = firstSectionTitle?.trim().split(/[\s.,:;]/)[0]?.toLowerCase();
  switch (word) {
    case "chapter":
      return "chapter";
    case "book":
      return "book";
    case "homily":
    case "sermon":
      return "homily";
    case "part":
      return "part";
    case "discourse":
      return "discourse";
    case "letter":
    case "epistle":
      return "letter";
    default:
      return "section";
  }
}

/** Discord holds a line to 128 bytes; the quote also needs its marks. */
export const QUOTE_MAX = 100;

/** The day's line from a saint's own words, the same all day, a different
 *  one tomorrow. Only lines short enough to show whole are used. */
export function quoteOfTheDay(quotes: readonly Quote[] | undefined, day: number): Quote | null {
  const short = (quotes ?? []).filter((q) => q.text.trim().length > 0 && q.text.length <= QUOTE_MAX);
  if (short.length === 0) return null;
  return short[((day % short.length) + short.length) % short.length];
}

/** A calendar day as a whole number, from the reader's own date. */
export function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "December 6" as month (0-based) and day. The registry's feasts are English. */
export function parseFeastDay(s: string | undefined): { month: number; day: number } | null {
  const m = s?.trim().match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  const day = Number(m[2]);
  return month >= 0 && day >= 1 && day <= 31 ? { month, day } : null;
}

/**
 * The next name day: the saint's principal feast, the first in their list,
 * as the date on the reader's own wall calendar. On the Old Calendar a feast
 * falls thirteen days later by the civil date.
 *
 * `today` is the reader's calendar day at UTC noon (startOfDayLocal).
 */
export function nextNameDay(
  feastDays: readonly string[] | undefined,
  today: Date,
  style: "new" | "old",
  format: (civil: Date) => string,
): NameDay | null {
  const feast = parseFeastDay(feastDays?.[0]);
  if (!feast) return null;
  const civilIn = (year: number) => {
    const d = new Date(Date.UTC(year, feast.month, feast.day, 12));
    if (style === "old") d.setUTCDate(d.getUTCDate() + 13);
    return d;
  };
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12);
  // The feast of the year before can land in this January on the Old
  // Calendar (a late-December feast plus thirteen days).
  for (const year of [today.getUTCFullYear() - 1, today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
    const d = civilIn(year);
    if (d.getTime() === t0) return { today: true, date: format(d) };
    if (d.getTime() > t0) return { today: false, date: format(d) };
  }
  return null;
}

/** A public page of the site a button may open (mirrors presence.rs). */
function isPublicPath(path: string): boolean {
  return /^\/(bible|saints|prayers|calendar|councils|theology|apologetics|heresies|topics|history|reading|discover|florilegium|catechism|fasting)(\/[a-z0-9._/-]*)?$/.test(
    path,
  );
}

/** "Chapter 9 of 30", in the reader's language. */
export function positionLabel(t: T, unit: PositionUnit, n: number, total: number): string {
  return t(`desktop.presence.pos.${unit}`, { n, total });
}

/** The query presence.rs puts after https://purifyapp.net/api/discord/art.
 *  Same names, same order; the Settings preview loads the very same image. */
export function artQuery(art: PresenceArt): string {
  const parts: string[] = [];
  if (art.saint && SLUG.test(art.saint)) parts.push(`saint=${art.saint}`);
  if (typeof art.progress === "number" && art.progress >= 0 && art.progress <= 100) parts.push(`p=${Math.round(art.progress)}`);
  if (art.season && isSeasonColor(art.season)) parts.push(`season=${art.season}`);
  if (art.gilded && art.season) parts.push("gilded=1");
  return parts.join("&");
}

// ── The builder ──────────────────────────────────────────────────────────────

export type BuildInput = {
  prefs: PresencePrefs;
  plusAllowed: boolean;
  t: T;
  pathname: string;
  title?: string | null;
  patron?: { saint: SaintFacts; nameDay: NameDay | null } | null;
  favorite?: { saint: SaintFacts; quote: Quote | null; byname?: string } | null;
  place?: ReadingPlace | null;
  /** The church season's color today, and why, for Plus custom. */
  today?: { color: SeasonColor; reason: string } | null;
};

function inPurify(t: T): PresenceRequest {
  return { details: t("desktop.presence.app"), path: "/", buttonLabel: t("desktop.presence.buttonHome") };
}

function patronRequest(t: T, patron: BuildInput["patron"]): PresenceRequest {
  if (!patron) return inPurify(t);
  const { saint, nameDay } = patron;
  return {
    details: saint.name,
    state: nameDay
      ? nameDay.today
        ? t("desktop.presence.nameDayToday")
        : t("desktop.presence.nameDay", { date: nameDay.date })
      : undefined,
    largeText: t("desktop.presence.patronHover"),
    art: { saint: saint.slug },
    path: `/saints/${saint.slug}`,
    buttonLabel: t(saint.pronoun === "her" ? "desktop.presence.readHerLife" : "desktop.presence.readHisLife"),
    homeLabel: t("desktop.presence.buttonHome"),
  };
}

function favoriteRequest(t: T, favorite: BuildInput["favorite"]): PresenceRequest {
  if (!favorite) return inPurify(t);
  const { saint, quote, byname } = favorite;
  const own = quote?.href && quote.href.startsWith(`/saints/${saint.slug}/`) && isPublicPath(quote.href);
  return {
    details: saint.name,
    state: quote ? `“${quote.text}”` : byname,
    largeText: quote ? quote.source : saint.name,
    art: { saint: saint.slug },
    path: own ? quote!.href : `/saints/${saint.slug}`,
    buttonLabel: t(saint.pronoun === "her" ? "desktop.presence.readHerWords" : "desktop.presence.readHisWords"),
    homeLabel: t("desktop.presence.buttonHome"),
  };
}

function readingRequest(input: BuildInput): PresenceRequest | null {
  const { t, prefs, place } = input;
  if (place?.kind === "scripture") {
    const bookName = t(`bible.books.${place.book}`);
    const author = scriptureAuthor(place.book);
    const p = progressPercent(place.chapter, place.chapters, place.fraction);
    const bar = prefs.showPlace && prefs.liveBar;
    const where = positionLabel(t, "chapter", place.chapter, place.chapters);
    return {
      details: prefs.showPlace ? t("desktop.presence.readingTitle", { title: bookName }) : t("desktop.presence.scripture"),
      state: prefs.showPlace ? (bar ? `${where} · ${p}%` : where) : bookName,
      largeText: place.authorName ?? bookName,
      art: author || bar ? { saint: author, progress: bar ? p : undefined } : undefined,
      path: prefs.showPlace ? `/bible/${place.book}/${place.chapter}` : `/bible/${place.book}`,
      buttonLabel: t("desktop.presence.readAlong"),
      homeLabel: t("desktop.presence.buttonHome"),
    };
  }
  if (place?.kind === "work") {
    const p = progressPercent(place.section, place.sections, place.fraction);
    const bar = prefs.showPlace && prefs.liveBar;
    const where = positionLabel(t, place.unit, place.section, place.sections);
    return {
      details: t("desktop.presence.readingTitle", { title: place.title }),
      state: prefs.showPlace ? (bar ? `${where} · ${p}%` : where) : place.saint.name,
      largeText: place.saint.name,
      art: { saint: place.saint.slug, progress: bar ? p : undefined },
      path: place.path,
      buttonLabel: t("desktop.presence.readAlong"),
      homeLabel: t("desktop.presence.buttonHome"),
    };
  }
  // Not a text: the first version's words for the page (prayer, the
  // calendar, the library, a saint's life), with the saint's portrait on
  // their own page.
  const a = activityFor(input.pathname, "reading", input.title);
  if (!a) return null;
  const seg = input.pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  const saint = a.kind === "saints" && seg.length >= 2 ? seg[1] : undefined;
  return {
    details: t(`desktop.presence.${a.kind}`),
    state: a.subject,
    path: a.path,
    buttonLabel: t(a.path === "/" ? "desktop.presence.buttonHome" : "desktop.presence.button"),
    art: saint && SLUG.test(saint) ? { saint } : undefined,
  };
}

/** The status to show, or null for none at all. */
export function buildPresence(input: BuildInput): PresenceRequest | null {
  const { base, plus } = effectiveMode(input.prefs, input.plusAllowed);
  let req: PresenceRequest | null;
  switch (base) {
    case "patron":
      req = patronRequest(input.t, input.patron);
      break;
    case "favorite":
      req = favoriteRequest(input.t, input.favorite);
      break;
    case "reading":
      req = readingRequest(input);
      break;
    default:
      return null;
  }
  if (!req || !plus) return req;
  const color = input.prefs.followSeason && input.today ? input.today.color : input.prefs.season;
  return {
    ...req,
    art: req.art ? { ...req.art, season: color, gilded: input.prefs.gilded } : undefined,
    badge: color,
    smallText: input.prefs.followSeason && input.today ? input.today.reason : undefined,
  };
}
