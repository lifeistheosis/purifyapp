// "Those I pray for", in the prayers themselves (1.7.1). The owner, 2026-10-18:
// "you should be able to choose, you know, when they get commemorated. But
// also integrate that with the diptychs. So like ... your family ... the
// fallen ones in your family. So integrate all that with the praying for
// other people also."
//
// One section, one list: the reader's own diptychs (the living and the
// departed, lib/prayers/storage.ts, the lists under Your rule) and the names
// they bring from the prayer wall with what each asked prayers for
// (lib/prayers/wallNames.ts). The reader chooses which prayers carry it
// (PRAY_PLACES); a name from the wall can be given prayers of its own when it
// is added. In a rule it stands where the prayer books commemorate the living
// and the departed: before the dismissal, or where the reader set "Those I
// pray for" in their own rule.
//
// The words. For the departed, the Church's own prayer, "O God of spirits,
// and of all flesh", verbatim from Hapgood's Service Book (DEPARTED_PRAYER).
// For the living, a line of our own in the first person
// (`prayers.commemorate.living`): the owner set aside the priest's words at
// the Office of Oblation ("that's for like the priest ... fix it so it's
// tweaked as if it's first person"), and no public-domain lay prayer for the
// living is in the app. Ours are marked COMMEMORATION_REVIEW for a future
// clergy review (docs/editorial-standards.md, Clergy item 17).
//
// Pure and safe on the server. The reader's choice of prayers is kept on the
// device by lib/prayers/useCommemoration.ts.

import type { Prayer } from "@/lib/prayers/types";

/** The prayers that can carry "Those I pray for". */
export type PrayPlace = "morning" | "midday" | "evening" | "hours" | "compline" | "mine";

/** In the order the choices are offered. */
export const PRAY_PLACES: readonly PrayPlace[] = ["morning", "midday", "evening", "hours", "compline", "mine"];

/**
 * Where the list stands until the reader chooses: the morning and evening
 * prayers, where the prayer books keep the commemoration, and their own rule.
 */
export const DEFAULT_PLACES: readonly PrayPlace[] = ["morning", "evening", "mine"];

/** The rules each choice is. */
export const PLACE_RULES: Readonly<Record<PrayPlace, readonly string[]>> = {
  morning: ["morning"],
  midday: ["midday"],
  evening: ["evening"],
  hours: ["first-hour", "third-hour", "sixth-hour", "ninth-hour"],
  compline: ["compline"],
  mine: ["mine-morning", "mine-evening"],
};

/** Each choice's name, as the app already names it. */
export const PLACE_LABEL: Readonly<Record<PrayPlace, string>> = {
  morning: "prayers.rule.morning.title",
  midday: "prayers.rule.midday.title",
  evening: "prayers.rule.evening.title",
  hours: "prayers.hours",
  compline: "prayers.rule.compline.title",
  mine: "prayers.mine.title",
};

/** Which choice a rule belongs to, or null for a prayer that never carries the list. */
export function placeOf(ruleId: string): PrayPlace | null {
  for (const place of PRAY_PLACES) if (PLACE_RULES[place].includes(ruleId)) return place;
  return null;
}

const KNOWN = new Set<string>(PRAY_PLACES);

/** Known choices, each once, in the offered order; null when `v` is not a list at all. */
export function cleanPlaces(v: unknown): PrayPlace[] | null {
  if (!Array.isArray(v)) return null;
  const chosen = new Set(v.filter((x): x is PrayPlace => typeof x === "string" && KNOWN.has(x)));
  return PRAY_PLACES.filter((p) => chosen.has(p));
}

/** Turn one choice on or off. */
export function togglePlace(places: readonly PrayPlace[], place: PrayPlace): PrayPlace[] {
  const set = new Set(places);
  if (set.has(place)) set.delete(place);
  else set.add(place);
  return PRAY_PLACES.filter((p) => set.has(p));
}

// ── The reader's choice, as kept ──────────────────────────────────────────

export const PLACES_KEY = "purify.prayers.remembered";
export const PLACES_EVENT = "purify:prayers-remembered";

/** The kept choice: the defaults until the reader chooses; an empty choice is kept as empty. */
export function parsePlacesSetting(raw: string | null): PrayPlace[] {
  if (!raw) return [...DEFAULT_PLACES];
  try {
    const o = JSON.parse(raw) as { places?: unknown } | null;
    return cleanPlaces(o?.places) ?? [...DEFAULT_PLACES];
  } catch {
    return [...DEFAULT_PLACES];
  }
}

// ── Where it stands in a rule ─────────────────────────────────────────────

/**
 * The index of the step the section stands at. In the reader's own rule,
 * at their "Those I pray for" (`replaces`: it is drawn in that step's place);
 * otherwise just before the dismissal, as the prayer books set the
 * commemoration, or at the end of a rule that has none.
 */
export function commemorationPlacement(prayers: readonly Pick<Prayer, "id" | "origin">[]): { index: number; replaces: boolean } {
  const names = prayers.findIndex((p) => p.id === "names");
  if (names >= 0) return { index: names, replaces: true };
  const dismissal = prayers.findIndex((p) => p.id === "dismissal" || p.origin?.prayerId === "dismissal");
  return { index: dismissal >= 0 ? dismissal : prayers.length, replaces: false };
}

// ── The words ─────────────────────────────────────────────────────────────

/** Our first-person words over the living, in every language (marked below). */
export const LIVING_KEY = "prayers.commemorate.living";

/**
 * The Church's prayer for the departed, verbatim, as Isabel Florence Hapgood
 * prints it in her Service Book of the Holy Orthodox-Catholic Apostolic
 * (Greco-Russian) Church (Houghton Mifflin, Boston and New York, 1906; public
 * domain), in the Divine Liturgy, at the litany "if there be offerings on
 * behalf of the dead", page 91. Read from the Cornell University Library scan
 * (cu31924029363128) in docs/editorial/ingest-review/hapgood-divine-liturgy.md,
 * page 130 of the scan, where the litany's response marks (the scan's "t&gt;)"
 * and "v^") fall between its lines and are no part of it. It is addressed to
 * God, not to the people; Hapgood gives it to the priest, said secretly. Its
 * "NN." takes the names of the reader's departed. In Hapgood's English in
 * every language, as the app keeps every quotation.
 */
export const DEPARTED_PRAYER = {
  lines: [
    "O God of spirits, and of all flesh, who hast trampled down death, and overthrown the Devil, and given life unto thy world:",
    "Do thou, the same Lord, give rest to the souls of thy departed servants, NN., in a place of brightness, a place of verdure, a place of repose, whence all sickness, sorrow and sighing have fled away.",
    "Pardon every transgression which they have committed, whether by word, or deed, or thought.",
    "For thou art a good God, and lovest mankind; because there is no man who liveth and sinneth not; for thou only art without sin, and thy righteousness is to all eternity, and thy word is true.",
  ],
  source: "Hapgood, Service Book (1906), the Divine Liturgy, the litany for the departed, p. 91",
} as const;

/** The prayer at the reader's departed: the edition's NN. given their names, as written. */
export function departedPrayer(names: readonly string[]): string[] {
  const named = names.map((n) => n.trim()).filter(Boolean).join(", ");
  return DEPARTED_PRAYER.lines.map((line) => line.replace("NN.", () => named));
}

/**
 * Our line under a name from the prayer wall ("I also pray for N., for their
 * intention"): the catalog's words with the name and the request's words set
 * in once each, exactly as written. The catalogs' own interpolation reads a
 * "$&" or a "{intention}" inside a value as a pattern, and these values are a
 * stranger's words.
 */
export function wallLine(template: string, name: string, intention: string | null): string {
  const values: Record<"name" | "intention", string> = { name, intention: intention ?? "" };
  return template.replace(/\{(name|intention)\}/g, (_whole, key: "name" | "intention") => values[key]);
}

/** The mark the queue finds our part by. */
export const COMMEMORATION_REVIEW = {
  status: "awaiting-clergy-review",
  drafted: "2026-10-18",
  basis:
    "Ours: the first-person line over the living (\"Remember, O Lord, Thy servants for whom I pray, and have mercy on them\"), the line under each name from the prayer wall (\"I also pray for N., for their intention\"), the choice of prayers that carry the list, and its place before the dismissal. The Church's: Hapgood's \"O God of spirits, and of all flesh\" over the departed, verbatim (the Divine Liturgy, the litany for the departed, p. 91).",
} as const;
