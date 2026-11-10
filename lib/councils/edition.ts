/**
 * The edition a document's words are from, as its book's page names it under
 * the byline: its source without the publisher, the year and the notes on
 * where the text was read ("Schaff & Wace, Nicene and Post-Nicene Fathers,
 * Series II, Vol. 14"). The whole source stays at the foot of the text.
 *
 * Its own module (1.9) because the device names it too, for a document read in
 * another language from its own file (components/councils/CouncilTextHere.tsx),
 * and lib/councils/page.ts brings the history's events with it.
 */
export function editionOf(source: string): string {
  const cut = [source.indexOf(":"), source.indexOf(" (")].filter((i) => i > 0);
  return (cut.length ? source.slice(0, Math.min(...cut)) : source).replace(/[,.\s]+$/, "").trim();
}
