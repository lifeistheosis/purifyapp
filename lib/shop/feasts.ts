import { orthodoxPascha } from "@/lib/calendar/pascha";
import { ICON_CATEGORIES } from "@/lib/shop/format";
import type { ShopClassification, ShopProductFull } from "@/lib/shop/types";

/**
 * Feast drops (the owner, 2026-09-30: "an email to the new-pieces list plus a
 * shop banner with the matching icon before each great feast").
 *
 * The names are the calendar's own, copied verbatim from
 * data/calendar/daily-saints.json and data/calendar/movable-readings.json so
 * the shop never words a feast differently from the calendar;
 * lib/shop/__tests__/feasts.test.ts holds them to those files. They are copied
 * rather than imported because the shop home is a client page and the daily
 * file is the whole year's commemorations. New calendar dates, like the rest
 * of the shop's mail (lib/email/campaignDrafts.ts).
 *
 * ── Which piece "matches" a feast ─────────────────────────────────────────
 *
 * First a piece tagged with the feast itself (a product subject of type
 * "feast" whose slug is the feast's key, e.g. "dormition"). Then a piece of
 * the feast's person: an icon of the Theotokos for her feasts, of Christ for
 * the Lord's, a cross for the Exaltation. A piece is "of" a person when it is
 * tagged so, filed under that person's category, or is an icon whose title
 * names them. Only what can be bought: nothing sold out or still coming.
 *
 * Nothing matches, nothing is shown or sent. There is no generic stand-in.
 */

export type FeastPerson = "theotokos" | "christ" | "cross";

export type GreatFeast = {
  /** Subject slug for a tagged piece, and the stem of the email's period key. */
  key: string;
  /** The calendar's name, verbatim. */
  name: string;
  person: FeastPerson;
  /** Month (1 to 12) and day on the new calendar, or days from Pascha. */
  on: { month: number; day: number } | { fromPascha: number };
};

export const GREAT_FEASTS: readonly GreatFeast[] = [
  { key: "nativity-of-the-theotokos", name: "Nativity of Our Most Holy Lady the Theotokos", person: "theotokos", on: { month: 9, day: 8 } },
  { key: "exaltation-of-the-cross", name: "Universal Exaltation of the Honorable and Life-Giving Cross", person: "cross", on: { month: 9, day: 14 } },
  { key: "entry-of-the-theotokos", name: "Entrance of the Most Holy Theotokos into the Temple", person: "theotokos", on: { month: 11, day: 21 } },
  { key: "nativity-of-christ", name: "Nativity According to the Flesh of Our Lord, God, and Savior Jesus Christ", person: "christ", on: { month: 12, day: 25 } },
  { key: "theophany", name: "Holy Theophany of Our Lord", person: "christ", on: { month: 1, day: 6 } },
  { key: "meeting-of-the-lord", name: "Meeting of Our Lord in the Temple", person: "christ", on: { month: 2, day: 2 } },
  { key: "annunciation", name: "The Annunciation of the Most Holy Theotokos", person: "theotokos", on: { month: 3, day: 25 } },
  { key: "entry-into-jerusalem", name: "Palm Sunday, the Entry of the Lord into Jerusalem", person: "christ", on: { fromPascha: -7 } },
  { key: "pascha", name: "Pascha, the Feast of Feasts", person: "christ", on: { fromPascha: 0 } },
  { key: "ascension", name: "The Ascension of the Lord", person: "christ", on: { fromPascha: 39 } },
  { key: "pentecost", name: "Pentecost, the Descent of the Holy Spirit", person: "christ", on: { fromPascha: 49 } },
  { key: "transfiguration", name: "Holy Transfiguration of Our Lord on Mount Tabor", person: "christ", on: { month: 8, day: 6 } },
  { key: "dormition", name: "Dormition of the Most Holy Theotokos", person: "theotokos", on: { month: 8, day: 15 } },
];

const DAY = 86_400_000;

/** The feast's day in a given year, at noon UTC like orthodoxPascha. */
export function feastDate(feast: GreatFeast, year: number): Date {
  if ("fromPascha" in feast.on) {
    return new Date(orthodoxPascha(year).getTime() + feast.on.fromPascha * DAY);
  }
  return new Date(Date.UTC(year, feast.on.month - 1, feast.on.day, 12));
}

/** Midnight UTC of a day, so day arithmetic ignores the hour. */
function dayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from `now` to `date` (0 = today). */
export function daysUntil(date: Date, now: Date): number {
  return Math.round((dayStart(date) - dayStart(now)) / DAY);
}

const ICON_CLASSIFICATIONS: ReadonlySet<ShopClassification> = new Set([
  "printed_mounted",
  "standard_reproduction",
  "laminated",
  "wooden",
  "hand_finished_reproduction",
]);

const NAMES: Record<Exclude<FeastPerson, "cross">, RegExp> = {
  theotokos: /\b(theotokos|virgin|mother of god|panagia|madonna)\b/i,
  christ: /\b(christ|pantocrator|saviou?r|jesus)\b/i,
};

function buyable(p: ShopProductFull): boolean {
  return p.inventory_status === "ready_to_ship" || p.inventory_status === "special_order";
}

function isIcon(p: ShopProductFull): boolean {
  return ICON_CLASSIFICATIONS.has(p.classification) && ICON_CATEGORIES.includes(p.category);
}

function ofPerson(p: ShopProductFull, person: FeastPerson): boolean {
  if (person === "cross") {
    return p.category === "crosses" && !["textile", "apparel", "jewelry"].includes(p.classification);
  }
  if (p.subjects.some((s) => s.subject_type === person)) return true;
  if (p.category === person) return true;
  return isIcon(p) && NAMES[person].test(p.title);
}

/**
 * The pieces for a feast, best first: tagged with the feast, then of its
 * person; in hand before made to order. Empty when nothing honest matches.
 */
export function feastPieces(feast: GreatFeast, products: readonly ShopProductFull[]): ShopProductFull[] {
  const order = (p: ShopProductFull) => (p.inventory_status === "ready_to_ship" ? 0 : 1);
  const pool = products.filter(buyable);
  const tagged = pool.filter((p) => p.subjects.some((s) => s.subject_type === "feast" && s.subject_slug === feast.key));
  const taggedIds = new Set(tagged.map((p) => p.id));
  const person = pool.filter((p) => !taggedIds.has(p.id) && ofPerson(p, feast.person));
  return [...tagged.sort((a, b) => order(a) - order(b)), ...person.sort((a, b) => order(a) - order(b))];
}

/** True when the first piece is the feast's own icon, not one of its person. */
export function isFeastIcon(feast: GreatFeast, piece: ShopProductFull): boolean {
  return piece.subjects.some((s) => s.subject_type === "feast" && s.subject_slug === feast.key);
}

// ── The shop banner ──────────────────────────────────────────────────────

/** How long before a feast the shop home carries it. */
export const BANNER_DAYS = 21;

export type BannerFeast = { feast: GreatFeast; date: Date; days: number; pieces: ShopProductFull[] };

/**
 * The feast the shop home shows: the nearest great feast (Pascha included)
 * from today to three weeks out that the shop has a piece for. Null when there
 * is none, which is most of the year.
 */
export function bannerFeast(now: Date, products: readonly ShopProductFull[]): BannerFeast | null {
  const year = now.getUTCFullYear();
  const found: BannerFeast[] = [];
  for (const feast of GREAT_FEASTS) {
    for (const y of [year, year + 1]) {
      const date = feastDate(feast, y);
      const days = daysUntil(date, now);
      if (days < 0 || days > BANNER_DAYS) continue;
      const pieces = feastPieces(feast, products);
      if (pieces.length > 0) found.push({ feast, date, days, pieces });
    }
  }
  found.sort((a, b) => a.days - b.days);
  return found[0] ?? null;
}

// ── The emails ───────────────────────────────────────────────────────────

/**
 * One feast email the shop list is owed, and the day to send it by.
 *
 *   window  the two sends the list always had: a week before the Nativity
 *           Fast begins (November 15) and a week before Pascha, showing what
 *           the shop has. Keys "nativity" and "pascha", unchanged, so the
 *           planner's past tasks and the sent campaigns still line up.
 *   feast   a great feast the shop has a piece for, two weeks before it.
 *
 * At most one feast email in any three weeks: a great feast whose send day
 * falls within 21 days of a window's, or of an earlier great feast's, is left
 * out. So the Entrance of the Theotokos (November 21) never follows the
 * Nativity Fast email by a day, and Pentecost never follows the Ascension.
 */
export type FeastDrop = {
  kind: "window" | "feast";
  /** "nativity", "pascha", or a great feast's key. */
  key: string;
  /** The period key the campaign and the planner share: `${key}-${year}`. */
  periodKey: string;
  name: string;
  /** The feast's day, or the day the Nativity Fast begins. */
  date: Date;
  /** The day the email should be sent by. */
  sendBy: Date;
  feast: GreatFeast | null;
  /** The matching pieces, for a great feast. Empty for a window. */
  pieces: ShopProductFull[];
};

export const DROP_SPACING_DAYS = 21;
const FEAST_LEAD_DAYS = 14;
const WINDOW_LEAD_DAYS = 7;

const PASCHA = GREAT_FEASTS.find((f) => f.key === "pascha")!;

function windowsOf(year: number): FeastDrop[] {
  const nativityFast = new Date(Date.UTC(year, 10, 15, 12));
  const pascha = feastDate(PASCHA, year);
  return [
    {
      kind: "window",
      key: "nativity",
      periodKey: `nativity-${year}`,
      name: "the Nativity Fast",
      date: nativityFast,
      sendBy: new Date(nativityFast.getTime() - WINDOW_LEAD_DAYS * DAY),
      feast: null,
      pieces: [],
    },
    {
      kind: "window",
      key: "pascha",
      periodKey: `pascha-${year}`,
      name: "Pascha",
      date: pascha,
      sendBy: new Date(pascha.getTime() - WINDOW_LEAD_DAYS * DAY),
      feast: PASCHA,
      pieces: [],
    },
  ];
}

/**
 * Every feast email due in the given years, in date order. Pascha is only ever
 * a window: it has always had its own email.
 */
export function feastDrops(years: readonly number[], products: readonly ShopProductFull[]): FeastDrop[] {
  const span = [...new Set(years)].sort();
  // Each year's drops, plus the neighbouring years', so the spacing rule sees a
  // window just across the new year.
  const all = [...new Set([span[0] - 1, ...span, span[span.length - 1] + 1])];
  const windows = all.flatMap(windowsOf);
  const feasts: FeastDrop[] = [];
  for (const year of all) {
    for (const feast of GREAT_FEASTS) {
      if (feast.key === "pascha") continue;
      const pieces = feastPieces(feast, products);
      if (pieces.length === 0) continue;
      const date = feastDate(feast, year);
      feasts.push({
        kind: "feast",
        key: feast.key,
        periodKey: `${feast.key}-${year}`,
        name: feast.name,
        date,
        sendBy: new Date(date.getTime() - FEAST_LEAD_DAYS * DAY),
        feast,
        pieces,
      });
    }
  }
  feasts.sort((a, b) => a.sendBy.getTime() - b.sendBy.getTime());

  const kept: FeastDrop[] = [...windows];
  const apart = (a: FeastDrop, b: FeastDrop) =>
    Math.abs(dayStart(a.sendBy) - dayStart(b.sendBy)) >= DROP_SPACING_DAYS * DAY;
  for (const drop of feasts) {
    if (kept.every((k) => apart(k, drop))) kept.push(drop);
  }
  const wanted = new Set(span);
  return kept
    .filter((d) => wanted.has(d.date.getUTCFullYear()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** The next feast email to write: the first whose day has not passed. */
export function nextFeastDrop(now: Date, products: readonly ShopProductFull[]): FeastDrop {
  const year = now.getUTCFullYear();
  const drops = feastDrops([year, year + 1], products);
  return drops.find((d) => daysUntil(d.date, now) >= 0) ?? drops[drops.length - 1];
}
