// The names a reader carries from the prayer wall into their own prayers
// (1.7.1). The owner, 2026-10-18: "when you click add to prayer, add to
// today's prayer list or add to our next prayer list, whenever they do their
// ... prayers, right? Midday prayers, evening prayers, you should be able to
// add them into it. So a ... little tiny section in there commemorated for
// them. And then a section that's like, I also pray for blank and whatever
// issue that they have listed."
//
// What is kept is only what the reader saw on the wall: the name as it was
// shown and the words of the request. Never a handle, never an account. The
// id is a one-way digest of the request (its @handle and the moment it was
// asked), so the same request is added once on every device, and nothing can
// be read back out of it.
//
//   purify.prayers.wall    JSON WallName[]    on this device, and in the
//                                             reader's own account when they
//                                             sign in (lib/prayers/sync.ts)
//
// A name waits for the prayers it was added to, morning, midday or evening
// (the prayer book's rule or the reader's own), or for whichever of them comes
// next ("my prayers today"). It leaves once it is marked prayed there, or
// after WALL_DAYS days. A name that has left is kept, marked, until its days
// are out, so a sync from another device cannot bring it back.
//
// In the rule it stands where the prayer books set the commemoration of the
// living, before the dismissal (after the reader's own names in their own
// rule), under the Church's words for it (WALL_COMMEMORATION) and a line of
// our own for each name. Ours are marked for a future clergy review
// (WALL_NAMES_REVIEW, docs/editorial-standards.md).
//
// This file is the model, pure and safe on the server. Reading and keeping it
// on the device is lib/prayers/useWallNames.ts.

import type { Prayer } from "@/lib/prayers/types";

/** Which prayers a name waits for. "today" is whichever of them comes next. */
export type WallFor = "today" | "morning" | "midday" | "evening";

/** In the order the add sheet offers them. */
export const WALL_FOR: readonly WallFor[] = ["today", "morning", "midday", "evening"];

/**
 * Each choice's name in the add sheet (components/community/AddToPrayersSheet.tsx).
 * The three rules are named as the prayer book names them. The note under the
 * choices says WALL_DAYS as "a week" in every language, and
 * lib/prayers/__tests__/wallNames.test.ts holds the two together.
 */
export const WALL_FOR_LABEL: Readonly<Record<WallFor, string>> = {
  today: "community.wallForToday",
  morning: "prayers.rule.morning.title",
  midday: "prayers.rule.midday.title",
  evening: "prayers.rule.evening.title",
};

export type WallName = {
  /** A one-way digest of the request (wallId), shaped as a uuid. */
  id: string;
  /** The name as the wall showed it. */
  name: string;
  /** What they asked prayers for, as the wall showed it, or null. */
  intention: string | null;
  for: WallFor;
  addedAt: string;
  /** When it leaves on its own: WALL_DAYS after it was added. */
  until: string;
  /** When it was marked prayed, or taken out; null while it waits. */
  doneAt: string | null;
  /** The last change, so the latest wins when two devices disagree. */
  changedAt: string;
};

export const WALL_KEY = "purify.prayers.wall";
export const WALL_EVENT = "purify:prayer-wall";

/** How long a name stays in the reader's prayers, said in the add sheet. */
export const WALL_DAYS = 7;
/** At most this many at once: a few names, not a second wall. */
export const WALL_CAP = 40;
export const WALL_NAME_MAX = 80;
/** As long as a request's words may be (lib/profile/server.ts PRAYER_INTENTION_MAX). */
export const WALL_INTENTION_MAX = 120;

const DAY = 86_400_000;

/** The rules a name can wait for, by the part of the day each is prayed at. */
export const WALL_RULE_PART: Readonly<Record<string, Exclude<WallFor, "today">>> = {
  morning: "morning",
  "mine-morning": "morning",
  midday: "midday",
  evening: "evening",
  "mine-evening": "evening",
};

/**
 * The Church's own words for commemorating the living by name. The priest
 * says them at each name in the Office of Oblation, the first part of the
 * Divine Liturgy, as Isabel Florence Hapgood prints it in her Service Book of
 * the Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (Houghton
 * Mifflin, Boston and New York, 1906; public domain), page 74, after the
 * rubric "Then he maketh mention, by name, of the living who are to be
 * prayed for, if any such there be; and at each name he taketh out a
 * particle, saying:". Read from the Cornell University Library scan
 * (cu31924029363128) in docs/editorial/ingest-review/hapgood-divine-liturgy.md,
 * page 113 of the scan. The prayer book carries no commemoration of the
 * living of its own (data/prayers), so this is the one the app uses, in
 * Hapgood's English in every language, as the app keeps every quotation.
 */
export const WALL_COMMEMORATION = {
  text: "Call to remembrance, O Lord, N.",
  source: "Hapgood, Service Book (1906), the Divine Liturgy, the Office of Oblation, p. 74",
} as const;

/** The mark the queue finds our part by: the placing, the title and the line under each name. */
export const WALL_NAMES_REVIEW = {
  status: "awaiting-clergy-review",
  drafted: "2026-10-18",
  basis:
    "The Church's words are Hapgood's, verbatim (the Office of Oblation, p. 74). Ours are the section's title, the line under each name (\"I also pray for N., for their intention\") and its place in the rule: before the dismissal, as the prayer books set the commemoration of the living, and after the reader's own names in their own rule.",
} as const;

/** The commemoration at one name: the edition's N. given the name the reader carries. */
export function commemorate(name: string): string {
  const n = name.trim();
  return WALL_COMMEMORATION.text.replace(/N\.$/, () => (/[.!?]$/.test(n) ? n : `${n}.`));
}

/**
 * Our line under a name ("I also pray for N., for their intention"): the
 * catalog's words with the name and the request's words set in once each,
 * exactly as written. The catalogs' own interpolation reads a "$&" or a
 * "{intention}" inside a value as a pattern, and these values are a
 * stranger's words.
 */
export function wallLine(template: string, name: string, intention: string | null): string {
  const values: Record<"name" | "intention", string> = { name, intention: intention ?? "" };
  return template.replace(/\{(name|intention)\}/g, (_whole, key: "name" | "intention") => values[key]);
}

/** FNV-1a over a string from a given start, 32 bits. */
function fnv(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * A request's id on the reader's side: the same for the same request on
 * every device, and different for every other. It cannot be turned back into
 * the handle. Shaped as a version-4 uuid, which the account's list requires.
 */
export function wallId(handle: string, since: string): string {
  const at = Date.parse(since);
  const key = `${handle.trim().toLowerCase()}|${Number.isFinite(at) ? at : since}`;
  const hex = [0x811c9dc5, 0x2545f491, 0x9e3779b9, 0x6c8e9cf5].map((seed) => fnv(key, seed).toString(16).padStart(8, "0")).join("");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOR = new Set<string>(WALL_FOR);

/** Whitespace run together, cut to `max` characters, null when nothing is left. */
function clip(s: string, max: number): string | null {
  const one = s.replace(/\s+/g, " ").trim();
  return one ? [...one].slice(0, max).join("").trim() : null;
}

function iso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function parseOne(x: unknown): WallName | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const id = typeof o.id === "string" && UUID.test(o.id) ? o.id.toLowerCase() : null;
  const name = typeof o.name === "string" ? clip(o.name, WALL_NAME_MAX) : null;
  const part = typeof o.for === "string" && FOR.has(o.for) ? (o.for as WallFor) : null;
  const addedAt = iso(o.addedAt);
  const until = iso(o.until);
  if (!id || !name || !part || !addedAt || !until) return null;
  return {
    id,
    name,
    intention: typeof o.intention === "string" ? clip(o.intention, WALL_INTENTION_MAX) : null,
    for: part,
    addedAt,
    until,
    doneAt: o.doneAt == null ? null : iso(o.doneAt),
    changedAt: iso(o.changedAt) ?? addedAt,
  };
}

/**
 * Well formed, each once (the latest change winning), none past its days,
 * those still waiting before those that have left, newest first, at most the
 * cap.
 */
export function cleanWallNames(list: readonly unknown[], now: number = Date.now()): WallName[] {
  const byId = new Map<string, WallName>();
  for (const x of list) {
    const n = parseOne(x);
    if (!n || Date.parse(n.until) <= now) continue;
    const had = byId.get(n.id);
    if (!had || Date.parse(n.changedAt) > Date.parse(had.changedAt)) byId.set(n.id, n);
  }
  return [...byId.values()]
    .sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt)) || Date.parse(b.addedAt) - Date.parse(a.addedAt))
    .slice(0, WALL_CAP);
}

/** The stored list, as cleanWallNames keeps it. */
export function parseWallNames(raw: string | null, now: number = Date.now()): WallName[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return cleanWallNames(Array.isArray(parsed) ? parsed : [], now);
}

/**
 * Add a request to the reader's prayers, or add it again: it waits from now
 * for WALL_DAYS days, for the prayers chosen.
 */
export function addWallName(
  list: readonly WallName[],
  entry: { id: string; name: string; intention?: string | null },
  part: WallFor,
  now: Date = new Date(),
): WallName[] {
  const name = clip(entry.name, WALL_NAME_MAX);
  if (!name || !UUID.test(entry.id)) return [...list];
  const at = now.toISOString();
  const next: WallName = {
    id: entry.id.toLowerCase(),
    name,
    intention: entry.intention ? clip(entry.intention, WALL_INTENTION_MAX) : null,
    for: part,
    addedAt: at,
    until: new Date(now.getTime() + WALL_DAYS * DAY).toISOString(),
    doneAt: null,
    changedAt: at,
  };
  return cleanWallNames([next, ...list.filter((n) => n.id !== next.id)], now.getTime());
}

/** Wait for other prayers instead; its days are unchanged. */
export function moveWallName(list: readonly WallName[], id: string, part: WallFor, now: Date = new Date()): WallName[] {
  const at = now.toISOString();
  return list.map((n) => (n.id === id && n.for !== part ? { ...n, for: part, changedAt: at } : n));
}

/** Mark names prayed (or taken out): they leave the reader's prayers. */
export function markWallPrayed(list: readonly WallName[], ids: readonly string[], now: Date = new Date()): WallName[] {
  const at = now.toISOString();
  const set = new Set(ids);
  return list.map((n) => (set.has(n.id) && !n.doneAt ? { ...n, doneAt: at, changedAt: at } : n));
}

/** Undo a mark: they wait again, until their days are out. */
export function unmarkWallPrayed(list: readonly WallName[], ids: readonly string[], now: Date = new Date()): WallName[] {
  const at = now.toISOString();
  const set = new Set(ids);
  return list.map((n) => (set.has(n.id) && n.doneAt ? { ...n, doneAt: null, changedAt: at } : n));
}

/** The request as it waits in the reader's prayers, or null when it does not. */
export function activeWallName(list: readonly WallName[], id: string, now: number = Date.now()): WallName | null {
  const n = list.find((x) => x.id === id);
  return n && !n.doneAt && Date.parse(n.until) > now ? n : null;
}

/** The part of the day a rule is prayed at, for the names kept for it; null for every other rule. */
export function wallPartOf(ruleId: string): Exclude<WallFor, "today"> | null {
  return Object.prototype.hasOwnProperty.call(WALL_RULE_PART, ruleId) ? WALL_RULE_PART[ruleId] : null;
}

/**
 * The names a rule's section shows: those waiting for it, and those marked
 * prayed since the page opened (`openedAt`), so a mark does not make them
 * vanish under the reader's hand. Oldest first, as they were added.
 */
export function wallNamesFor(list: readonly WallName[], ruleId: string, openedAt: number, now: number = Date.now()): WallName[] {
  const part = wallPartOf(ruleId);
  if (!part) return [];
  return list
    .filter((n) => (n.for === part || n.for === "today") && Date.parse(n.until) > now && (!n.doneAt || Date.parse(n.doneAt) >= openedAt))
    .sort((a, b) => Date.parse(a.addedAt) - Date.parse(b.addedAt));
}

/**
 * Where the section stands in a rule, as the index of the step it goes
 * before: after the reader's own names in their own rule, else before the
 * dismissal, as the prayer books set the commemoration of the living, else
 * at the end.
 */
export function wallPlacement(prayers: readonly Pick<Prayer, "id" | "origin">[]): number {
  const names = prayers.findIndex((p) => p.id === "names");
  if (names >= 0) return names + 1;
  const dismissal = prayers.findIndex((p) => p.id === "dismissal" || p.origin?.prayerId === "dismissal");
  return dismissal >= 0 ? dismissal : prayers.length;
}

// ── In the reader's own account ─────────────────────────────────────────────
//
// Signed in, the names ride in the reader's own list of the living
// (intentions_living, self-only under RLS; 20260530000000_prayer_features.sql),
// marked as the wall's so the diptychs never show them: /api/prayer/sync keeps
// them out of the diptychs it hands any app, older ones included, and hands
// them over on their own. No new table and no migration.

export const WALL_TAG = "purify-wall";

/** Whether a row of the reader's list of the living is one of these names. */
export function isWallRow(tags: unknown): boolean {
  return Array.isArray(tags) && tags.includes(WALL_TAG);
}

/** A name as a row of that list: the name, the words as its note, and the rest as tags. */
export function wallToRow(n: WallName): { id: string; name: string; note: string | null; tags: string[]; addedAt: string } {
  return {
    id: n.id,
    name: n.name,
    note: n.intention,
    tags: [WALL_TAG, `for:${n.for}`, `until:${n.until}`, `changed:${n.changedAt}`, ...(n.doneAt ? [`done:${n.doneAt}`] : [])],
    addedAt: n.addedAt,
  };
}

/** A row of that list as a name, or null when it is not one of these (or not well formed). */
export function wallFromRow(r: { id?: unknown; name?: unknown; note?: unknown; tags?: unknown; added_at?: unknown; addedAt?: unknown }): WallName | null {
  if (!isWallRow(r.tags)) return null;
  const tags = r.tags as unknown[];
  const tag = (k: string): string | null => {
    const t = tags.find((x): x is string => typeof x === "string" && x.startsWith(`${k}:`));
    return t ? t.slice(k.length + 1) : null;
  };
  return parseOne({
    id: r.id,
    name: r.name,
    intention: r.note,
    for: tag("for"),
    until: tag("until"),
    changedAt: tag("changed"),
    doneAt: tag("done"),
    addedAt: r.added_at ?? r.addedAt,
  });
}

/** This device's names and the account's, each once, the later change winning. */
export function mergeWallNames(local: readonly WallName[], remote: readonly WallName[], now: number = Date.now()): WallName[] {
  return cleanWallNames([...local, ...remote], now);
}
