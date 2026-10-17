// The words History shows for its eras, categories and certainty levels, in
// the reader's language (1.7).
//
// Until 1.7 these were English strings in lib/history/events.ts, so a reader
// in Greek met "Age of Persecution" and "Historically Attested" on a
// translated page. The registry keeps its English (the website's structured
// data and the search's aliases read it); every screen asks the catalogs,
// through the keys below. lib/history/__tests__/calmHistory.test.ts holds
// the English catalog to the registry, word for word, so the two cannot
// drift.

import { centuryLabelOf, type Certainty, type Era, type EventCategory } from "./events";

type Translate = (key: string, replacements?: Record<string, string | number>) => string;

export const eraKey = (id: Era, part: "label" | "short" | "blurb") => `study.history.era.${id}.${part}`;
export const categoryKey = (id: EventCategory, part: "label" | "description") =>
  `study.history.category.${id}.${part}`;
export const certaintyKey = (id: Certainty, part: "label" | "gloss") => `study.history.certainty.${id}.${part}`;

export function eraLabel(t: Translate, id: Era): string {
  return t(eraKey(id, "label"));
}
export function eraShort(t: Translate, id: Era): string {
  return t(eraKey(id, "short"));
}
export function categoryLabel(t: Translate, id: EventCategory): string {
  return t(categoryKey(id, "label"));
}
export function categoryDescription(t: Translate, id: EventCategory): string {
  return t(categoryKey(id, "description"));
}
export function certaintyLabel(t: Translate, id: Certainty): string {
  return t(certaintyKey(id, "label"));
}
export function certaintyGloss(t: Translate, id: Certainty): string {
  return t(certaintyKey(id, "gloss"));
}

/**
 * A century, as the century slider and its filter chip name it. English says
 * "4th c."; every other language gets the century's years, 301–400, which
 * need no ordinal and read the same everywhere (an ordinal is a different
 * word, case or numeral in each of the 21 languages).
 */
export function centuryName(century: number, locale: string): string {
  if (locale === "en") return centuryLabelOf(century);
  return `${(century - 1) * 100 + 1}–${century * 100}`;
}
