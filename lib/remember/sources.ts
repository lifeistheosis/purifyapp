import type { ShownCite } from "@/lib/citations/cite";
import type { Florilegium } from "@/lib/florilegium/florilegium";
import { allSayings } from "@/lib/today/saying";
import { SAINT_WORDS_SLUGS, saintWordsFor } from "@/lib/today/saintWords";

import { QUOTE_MAX, quoteKey, type QuotePlace } from "./items";

/**
 * The quotes a reader may take up to learn by heart (build 93 note 11), and
 * the only three doors a quote comes through. Each is a text the app carries
 * with the place it stands at:
 *
 *   the app's own  Today's sayings of the Desert Fathers and its saints'
 *                  words, every one traced to its paragraph already
 *                  (lib/today/saying.ts, lib/today/saintWords.ts).
 *   gathered       a Father's line the reader gathered into the Florilegium
 *                  from one of the app's pages, which wrote its author, its
 *                  work and its address; a reader cannot type one.
 *   found          a line the reader pastes, when "Who said it" finds it in a
 *                  book (lib/quotes/find.ts): the book's own words, never the
 *                  paste.
 *
 * No list of "popular quotes" of ours: a line is offered under a Father's
 * name because a book the app carries prints it, and for no other reason.
 */

export type QuoteOffer = { key: string; text: string; by: string; cite: QuotePlace };

type FatherCite = Extract<ShownCite, { kind: "father" }>;

function place(c: FatherCite): QuotePlace {
  const out: QuotePlace = { href: c.href, author: c.author, work: c.work, place: c.place };
  if (c.mark) out.mark = c.mark;
  if (c.edition) out.edition = c.edition;
  return out;
}

function offer(text: string, by: string, cite: QuotePlace): QuoteOffer | null {
  const words = text.trim();
  if (!words || words.length > QUOTE_MAX || !by.trim() || !cite.href || !cite.work) return null;
  return { key: quoteKey(cite.href, words), text: words, by: by.trim(), cite };
}

const firstName = (name: string) => name.replace(/^St\.?\s+/i, "").split(/\s+/)[0]?.toLowerCase() ?? "";

/**
 * The app's own cited quotes: the sayings, each under the Father Today names
 * on it, then the saints' words that stand in a work of their own (a saint
 * whose words another wrote down, or whose work has no author's name on its
 * cover, is left to the sayings, which name the speaker by hand).
 */
export function carriedQuotes(): QuoteOffer[] {
  const out: QuoteOffer[] = [];
  const seen = new Set<string>();
  const add = (o: QuoteOffer | null) => {
    if (!o || seen.has(o.key)) return;
    seen.add(o.key);
    out.push(o);
  };
  for (const s of allSayings()) {
    if (s.shown?.kind === "father") add(offer(s.text, s.attribution, place(s.shown)));
  }
  for (const slug of SAINT_WORDS_SLUGS) {
    const w = saintWordsFor(slug);
    if (!w || w.shown.kind !== "father" || !w.shown.author) continue;
    // His own work: the author on the cover is the saint whose page the words are on.
    if (firstName(w.shown.author) !== slug.split("-")[0]) continue;
    add(offer(w.text, w.shown.author, place(w.shown)));
  }
  return out;
}

/** The Fathers' lines the reader gathered from the app's pages, newest first, each once. */
export function gatheredQuotes(florilegia: readonly Florilegium[]): QuoteOffer[] {
  const out: QuoteOffer[] = [];
  const seen = new Set<string>();
  const items = florilegia.flatMap((f) => f.items).sort((a, b) => b.addedAt - a.addedAt);
  for (const item of items) {
    if (item.kind !== "father" || !item.href || !item.work) continue;
    const o = offer(item.text, item.author, { href: item.href, author: item.author, work: item.work, place: "" });
    if (!o || seen.has(o.key)) continue;
    seen.add(o.key);
    out.push(o);
  }
  return out;
}

/** What "Who said it" answers (app/api/quotes/find), as the sheet reads it. `words` came with 1.9; an answer cached from before has only the excerpt. */
export type FoundAnswer = { match: "exact" | "close"; cite: FatherCite; excerpt: string; words?: string };

/** The excerpt without the marks that say it was cut from a longer paragraph. */
const uncut = (excerpt: string) => excerpt.replace(/^…\s*/, "").replace(/\s*…$/, "").trim();

/** A found line as a quote to learn: the book's own words, under the author on the cover, or the work's name where no one signed it. */
export function foundQuote(f: FoundAnswer): QuoteOffer | null {
  return offer(f.words || uncut(f.excerpt), f.cite.author || f.cite.work, place(f.cite));
}
