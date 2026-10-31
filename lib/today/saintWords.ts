import file from "@/data/today/saint-words.json";

import type { ShownCite } from "@/lib/citations/cite";
import type { QuoteFace, QuoteSubject } from "@/lib/share/verseCard";

/**
 * Today's saint in their own words (1.8, the owner's word of 2026-10-24): on
 * a day whose saint has a page, a line of theirs, with the source line every
 * quotation wears. Only words traced to where they stand: the saint's traced
 * quotation, or a sentence picked by hand from a work of theirs the reading
 * room checked word for word (data/today/saint-words.json; its test holds
 * each to its paragraph). A saint with none shows nothing new.
 *
 * Since round 12 (his pick B, "Bands", with St John Chrysostom himself) the
 * words open on the saint's band in The Church today, and a tap on him opens
 * his window: his face, his name and years, the words large, where they come
 * from, and two actions, Share as a picture and Read where it's from
 * (components/today/SaintWindow.tsx). `reposed` is the year of his repose as
 * the registry gives it (lib/saints/web.ts, dateYear), kept here so Today
 * need not read the registry for one number; the test holds the two together.
 *
 * `lit` is the one word lit on the picture of his words (round 3 r3-11),
 * chosen by hand where one word plainly carries the line, and absent where
 * none does: an emphasis the Father did not give, so it is used sparingly.
 */
export type SaintWords = { text: string; shown: ShownCite; reposed?: string; lit?: string };

const WORDS = (file as unknown as { words: Record<string, SaintWords> }).words;

export function saintWordsFor(slug: string | null | undefined): SaintWords | null {
  return slug ? (WORDS[slug] ?? null) : null;
}

export const SAINT_WORDS_SLUGS: readonly string[] = Object.keys(WORDS);

/**
 * The line under his name in the window: the first of his titles and the
 * year he reposed, as the calendar writes a repose ("†407"). The registry's
 * epithet runs "Archbishop of Constantinople · Golden-Mouth".
 */
export function saintByline(epithet: string | undefined, reposed: string | undefined): string {
  const title = (epithet ?? "").split(" · ")[0].trim();
  const year = reposed ? `†${reposed}` : "";
  return [title, year].filter(Boolean).join(", ");
}

/** Words set as his, in quotation marks, as round 12 drew them on the band and in the window. */
export function quoted(text: string): string {
  return `“${text}”`;
}

/** The shortest and the longest a phrase may be to stand for the words on the band. */
const OPENING = { min: 18, max: 44 } as const;

/**
 * The words as they open on the band, "Let no one fear death…": the first
 * phrase when it stands on its own and fits, else as many whole words as fit.
 * Never more than the band can carry; the window has them whole.
 */
export function wordsOpening(text: string, max: number = OPENING.max): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const phrase = /^(.+?)[,;:.!?](\s|$)/.exec(clean)?.[1];
  if (phrase && phrase.length >= OPENING.min && phrase.length <= max) return `${phrase}…`;
  const cut = clean.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  const head = (at > OPENING.min ? cut.slice(0, at) : clean.slice(0, max)).replace(/[\s,;:.!?]+$/, "");
  return `${head}…`;
}

/**
 * Where "Read where it's from" opens: the words where they stand in a work
 * the app carries (the source line's own link). A text the library does not
 * carry has nowhere to open, so the window offers no such action for it.
 */
export function readWhereFrom(shown: ShownCite): string | null {
  if (shown.kind === "father" || shown.kind === "scripture") return shown.href;
  if (shown.kind === "inexact") return shown.of.href;
  return null;
}

/**
 * The picture the window shares (lib/share/drawVerseCard.ts, the verse's
 * drawing): his words, and his name where a verse has its reference. The
 * words are English, as the app has them.
 */
export function saintPictureInput(words: SaintWords, name: string): { text: string; reference: string; lang: string } {
  return { text: words.text, reference: name, lang: "en" };
}

/**
 * The work the words are from, as a quote's picture prints it under his name:
 * its title to the first full stop ("The First Theological Oration"), then
 * its place where that is short ("Chapter 3"), not a translator's long note
 * or a run of pages.
 */
export function quoteSource(shown: ShownCite): string | undefined {
  if (shown.kind !== "father" && shown.kind !== "text") return undefined;
  const work = shown.work.split(". ")[0].trim();
  const place = shown.place?.trim() ?? "";
  const short = place && place.length <= 28 && !/[()]/.test(place) && !/^pages?\b/i.test(place);
  return short ? `${work}, ${place}` : work;
}

/** The second of his titles, the name the Church knows him by ("Golden-Mouth", "The Theologian"), for the head of his picture. */
export function saintByname(epithet: string | undefined): string | undefined {
  return (epithet ?? "").split(" · ")[1]?.trim() || undefined;
}

/**
 * His words as a quote's picture (lib/share/verseCard.ts, QuoteSubject, the
 * owner's pick of all three of r3-11): his byname over the cross, his name,
 * his first title and his repose, the work; the Page's running head (`pageHead`,
 * "In his own words" in the reader's language) with his feast; round the seal
 * his name and his repose; the lit word; his face.
 */
export function saintQuote({
  saint,
  words,
  face,
  pageHead,
  feast,
  lang,
}: {
  saint: { name: string; epithet?: string };
  words: SaintWords;
  face: QuoteFace | null;
  pageHead: string;
  feast?: string;
  lang?: string;
}): QuoteSubject {
  const head = saintByname(saint.epithet);
  const byline = saintByline(saint.epithet, words.reposed);
  const source = quoteSource(words.shown);
  return {
    name: saint.name,
    ...(head ? { head } : {}),
    ...(byline ? { byline } : {}),
    ...(source ? { source } : {}),
    pageHead,
    ...(feast ? { pageRight: feast } : {}),
    ring: words.reposed ? `${saint.name} · †${words.reposed}` : saint.name,
    ...(words.lit ? { lit: words.lit } : {}),
    face,
    ...(lang ? { lang } : {}),
  };
}
