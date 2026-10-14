import type { BoardMessage } from "@/lib/whatsNew/board";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";

/**
 * Content packs: what the apps can learn from the website without a store
 * build.
 *
 * The apps are a static export. Everything a screen shows was written into
 * the bundle when the build was made, so a new chosen verse, a corrected one,
 * or this week's board message reached a phone only with the next store
 * build, a week or more of review later. A pack is that same content, served
 * by the website (/api/packs) and kept on the device, so a website deploy or
 * a message published from the admin panel reaches the apps the next time
 * they are online.
 *
 * DATA ONLY. A pack carries words and references, never markup, code or a
 * link to anywhere but a Bible chapter inside the app, and each one is read
 * through a check below that throws away anything it does not recognise. A
 * pack that fails its check is not used at all, and the screen shows what the
 * build carries, which is exactly what it showed before packs existed.
 *
 * Client-safe: no server imports. The website's half is lib/packs/server.ts.
 */

/** The shape of the whole answer. A different number is a format this build does not read. */
export const PACKS_FORMAT = 1;

/** Each pack's own shape number. A pack at another number is skipped, the rest still used. */
export const PACK_SCHEMAS = { "verse-of-day": 1, board: 1 } as const;

export type PackName = keyof typeof PACK_SCHEMAS;

/** At most this many characters are read from the network before giving up. */
export const PACKS_MAX_CHARS = 300_000;

export type VerseOfDayPack = {
  schema: number;
  /** Civil date (YYYY-MM-DD, UTC frame like the bundled table) to the card's entry. */
  days: Record<string, VerseOfDayEntry>;
};

export type BoardPack = {
  schema: number;
  /** The published message, or null when none is published. */
  message: BoardMessage | null;
};

export type Packs = {
  format: number;
  /** The release the website was serving when it made these packs ("1.6"). */
  release: string;
  /** When the website made them (ISO). */
  made: string;
  packs: {
    "verse-of-day"?: VerseOfDayPack;
    board?: BoardPack;
  };
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9-]{1,40}$/;
// The only link a pack may carry: a chapter of the app's own Bible, with an
// optional verse anchor. Anything else (another site, a javascript: URL, a
// page that is not the Bible) fails the whole entry.
const BIBLE_HREF = /^\/bible\/[a-z0-9-]{1,40}\/\d{1,3}(#v\d{1,3})?$/;
const SOURCES = new Set<VerseOfDayEntry["source"]>(["gospel", "epistle", "ot", "rotation", "related"]);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isText = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;

const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 200;

/** A real calendar day, not only the right number of digits. */
export function isDayKey(v: unknown): v is string {
  if (typeof v !== "string" || !DAY.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
}

/** One Verse of the Day entry, rebuilt field by field so nothing extra rides along. */
export function readVerseEntry(v: unknown): VerseOfDayEntry | null {
  if (!isRecord(v)) return null;
  const { label, text, href, source, book, bookName, chapter, verse } = v;
  if (!isText(label, 80) || !isText(bookName, 60)) return null;
  if (!(text === null || isText(text, 1200))) return null;
  if (typeof href !== "string" || !BIBLE_HREF.test(href)) return null;
  if (typeof source !== "string" || !SOURCES.has(source as VerseOfDayEntry["source"])) return null;
  if (typeof book !== "string" || !SLUG.test(book)) return null;
  if (!isCount(chapter) || !isCount(verse)) return null;
  // The link has to lead where the entry says it does.
  if (!href.startsWith(`/bible/${book}/${chapter}`)) return null;
  return {
    label,
    text,
    href,
    source: source as VerseOfDayEntry["source"],
    book,
    bookName,
    chapter,
    verse,
  };
}

function readVersePack(v: unknown): VerseOfDayPack | null {
  if (!isRecord(v) || v.schema !== PACK_SCHEMAS["verse-of-day"] || !isRecord(v.days)) return null;
  const keys = Object.keys(v.days);
  if (keys.length === 0 || keys.length > 120) return null;
  const days: Record<string, VerseOfDayEntry> = {};
  for (const key of keys) {
    const entry = readVerseEntry(v.days[key]);
    // One bad day spoils the pack: a half-read table is a sign the answer is
    // not what this build expects, and the bundled table is still whole.
    if (!isDayKey(key) || !entry) return null;
    days[key] = entry;
  }
  return { schema: PACK_SCHEMAS["verse-of-day"], days };
}

/** The board message, rebuilt field by field. */
export function readBoardMessage(v: unknown): BoardMessage | null {
  if (!isRecord(v)) return null;
  const { week, date, eyebrow, headline, body } = v;
  if (!isText(week, 20) || !isDayKey(date) || !isText(eyebrow, 80) || !isText(headline, 200)) return null;
  if (!Array.isArray(body) || body.length > 40) return null;
  if (!body.every((p) => typeof p === "string" && p.length <= 2000)) return null;
  return { week, date, eyebrow, headline, body: body.slice() };
}

function readBoardPack(v: unknown): BoardPack | null {
  if (!isRecord(v) || v.schema !== PACK_SCHEMAS.board) return null;
  if (v.message === null) return { schema: PACK_SCHEMAS.board, message: null };
  const message = readBoardMessage(v.message);
  return message ? { schema: PACK_SCHEMAS.board, message } : null;
}

/**
 * The website's answer, read: null when it is not a packs answer this build
 * understands, and otherwise only the packs that passed their own check.
 */
export function readPacks(v: unknown): Packs | null {
  if (!isRecord(v) || v.format !== PACKS_FORMAT) return null;
  if (!isText(v.release, 20) || !/^\d+(\.\d+){0,3}$/.test(v.release)) return null;
  if (!isText(v.made, 40) || Number.isNaN(Date.parse(v.made))) return null;
  if (!isRecord(v.packs)) return null;
  const out: Packs = { format: PACKS_FORMAT, release: v.release, made: v.made, packs: {} };
  const verses = readVersePack(v.packs["verse-of-day"]);
  if (verses) out.packs["verse-of-day"] = verses;
  const board = readBoardPack(v.packs.board);
  if (board) out.packs.board = board;
  return out;
}

/** "1.6" against "1.5.2", by number and part by part: 1, 0 or -1. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Whether packs may stand in front of what this build carries.
 *
 * The website is normally ahead of every store build, because store builds
 * are made from main after the push that deployed it. Two things can turn
 * that around, and each check below covers one:
 *
 * - The website is serving an older release than the app (a deploy that
 *   failed after the store builds were made, as 1.3's did on Render, or a
 *   website that was rolled back). Its packs would then put older content
 *   in front of newer, so a pack from a lower release is not used.
 * - Packs were saved on the phone before this build was installed, and the
 *   phone has not been online since. The build's own content is newer, so a
 *   pack made before the build was built is not used either.
 *
 * `builtAt` is unknown outside a native export (the website and the tests);
 * then only the release is compared.
 */
export function packsTrusted(p: Packs, appRelease: string, builtAt: string | undefined): boolean {
  if (compareVersions(p.release, appRelease) < 0) return false;
  if (!builtAt) return true;
  const built = Date.parse(builtAt);
  return Number.isNaN(built) || Date.parse(p.made) > built;
}

/**
 * The verse table a card shows: the build's window, with the pack's days in
 * front of it. Days the pack does not cover keep the build's entry, so a
 * pack of two months leaves the rest of a long window untouched.
 */
export function mergeVerseTable(
  bundled: Record<string, VerseOfDayEntry>,
  pack: VerseOfDayPack | undefined | null,
): Record<string, VerseOfDayEntry> {
  if (!pack) return bundled;
  return { ...bundled, ...pack.days };
}
