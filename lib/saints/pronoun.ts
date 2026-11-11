/**
 * Whose a saint's page is, for the words that name the saint (1.9): "his",
 * "her", or "their" for a page of two or more, a pair or a company of martyrs
 * (Sts. Cosmas and Damian, the Seven Sleepers of Ephesus). Pairs and groups
 * read as one man before: "Open his page", "his web, year by year".
 *
 * Each form is its own key in every catalog, never a word swapped into a
 * sentence: languages do not make "their" from "his" alike (Russian "их",
 * French "leur", German "ihr", which is also "her"). A line that names a
 * saint so asks `byPronoun` for its form, with all three keys written out, so
 * lib/i18n/__tests__/keysExist.test.ts reads each of them.
 *
 * Its own small file, so a client screen can ask it without carrying the
 * library's saints (lib/saints/saints.ts).
 */
export type Pronoun = "his" | "her" | "their";

/** The form for this page: "his" when the saint's entry says none. */
export function byPronoun<T>(pronoun: Pronoun | null | undefined, forms: Record<Pronoun, T>): T {
  return forms[pronoun ?? "his"];
}

/**
 * Pages of exactly two saints (Sts. Cosmas and Damian, Sts. Adrian and
 * Natalia), for the one catalog whose prayer tells two apart from more:
 * Arabic says a pair in the dual ("أيها القدّيسان ... اطلبا"), a company in
 * the plural. Every other catalog's pair form is its their form. Each of
 * these is also "their"; the test holds every page named "Sts. A and B" here
 * or among its named exceptions (lib/saints/__tests__/intercession.test.ts).
 */
export const PAIRS: ReadonlySet<string> = new Set([
  "cyril-and-methodius",
  "theodore-and-vasily-of-the-caves",
  "photius-and-anicetus",
  "floros-and-lauros",
  "adrian-and-natalia",
  "cosmas-and-damian-of-asia",
  "nicander-and-hermas",
  "galaction-and-episteme",
  "onesiphorus-and-porphyrius",
  "plato-and-romanus",
  "zacchaeus-and-alphaeus",
  "barlaam-and-josaphat",
  "philemon-and-apphia",
  "hermylas-and-stratonicus",
  "cyrus-and-john",
]);
