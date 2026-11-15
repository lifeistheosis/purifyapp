// The editor's own Quote searches Purify's library (build 98 note 5, his
// words, 2026-11-15 about 21:14 UTC: "still wanted you to be able to quote
// from here by linking real works from purify"; the plan of 8 November,
// docs/1.9-build/JOURNAL.md: "In the editor: the Quote block searches the same
// library: Scripture, the Fathers, the saints' lives, the prayers, the
// chants").
//
// Until build 98 the editor's Quote was a quote of one's own only, the words
// and who said them typed by hand, and the library could be quoted only from
// the library's side (Quote in journal, ./quoteInJournal.ts). Now Quote opens
// a search: the reader finds a page with the app's own search (its corpus,
// app/search-corpus.json, and its matcher, lib/search/match.ts), picks the
// passage, and it lands as Quote in journal lays one: verbatim, its source
// named, "Quoted from Purify's library", not editable as the source's words,
// Open leading back to its page inside the app (./page.ts, libraryBlock).
// Scripture lands as a verse card, as a verse's Quote in journal lays it. A
// quote of one's own stays the second choice and never wears the library's
// mark (docs/editorial-standards.md).
//
// The corpus names pages, not passages, so the passages come from where each
// page keeps its words: a Father's work from its own file (app/saints-data/,
// lib/saints/writingClient.ts), which the apps carry; every other page from
// the page itself, as the website serves it and the apps carry it (the words
// it shows, read from its <main>).
//
// Scripture and one's own words are everyone's; the rest of the library is
// Plus's, shown with the Plus mark (docs/1.9-build/JOURNAL.md). Nothing here
// grants or checks Plus.
import { matches } from "@/lib/search/match";
import type { SearchGroup, SearchItem } from "@/lib/search/types";

import { isLibraryPlace } from "./libraryPlaces";
import { libraryBlock, type PageBlock } from "./page";

/** The kinds of page the Quote searches beside Scripture: the Fathers' works, the saints' lives, the prayers and chants, the councils. */
export const QUOTE_GROUPS: ReadonlySet<SearchGroup> = new Set<SearchGroup>(["Reading", "Saints", "Prayers", "Councils & Heresies"]);

/** The fewest letters a search starts at, as the Verse tool's. */
export const QUOTE_MIN_QUERY = 2;

/** A passage shorter than this is a heading or a line of the page's own furniture, not words to quote. */
export const PASSAGE_MIN = 40;

/** The most passages offered from one page. */
export const PASSAGES_MAX = 120;

/** Pages of the library the Quote can take words from, best first. Scripture is found apart (the Verse tool's search). */
export function libraryPages(corpus: readonly SearchItem[], query: string, limit = 8): SearchItem[] {
  if (query.trim().length < QUOTE_MIN_QUERY) return [];
  const library = corpus.filter((i) => QUOTE_GROUPS.has(i.group) && isLibraryPlace(i.href) && !i.href.startsWith("/bible"));
  return matches(library, query, limit);
}

/** A Father's work, from its address (/saints/<saint>/<work>), or null for any other page. */
export function workAt(href: string): { saint: string; work: string } | null {
  const m = /^\/saints\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/.exec(href.split("#")[0]);
  if (!m || m[2] === "web") return null;
  return { saint: m[1], work: m[2] };
}

/** A passage: its words, and the place on its page Open leads to. */
export type Passage = { text: string; anchor?: string };

const words = (s: string) => s.replace(/\s+/g, " ").trim();

/** A work's passages, as its file holds them: each paragraph, and its section (`#s<n>`, the work page's own anchors). */
export function workPassages(work: { sections?: readonly { n: number; paragraphs?: readonly string[] }[] } | null): Passage[] {
  const out: Passage[] = [];
  for (const s of work?.sections ?? []) {
    for (const p of s.paragraphs ?? []) {
      const text = words(p ?? "");
      if (text.length >= PASSAGE_MIN) out.push({ text, anchor: `s${s.n}` });
    }
  }
  return out;
}

type Found = { textContent: string | null; closest: (selector: string) => { id?: string } | null };

/**
 * A page's passages, from the page itself: its paragraphs and quoted blocks
 * in <main>, never its bars, buttons, links or source lines, each with the
 * nearest place on the page that has an id.
 */
export function pagePassages(doc: { querySelector: (s: string) => { querySelectorAll: (s: string) => ArrayLike<Found> } | null }): Passage[] {
  const main = doc.querySelector("main");
  if (!main) return [];
  const out: Passage[] = [];
  const seen = new Set<string>();
  for (const el of Array.from(main.querySelectorAll("p, blockquote"))) {
    if (el.closest("nav, header, footer, aside, button, a, [role='dialog'], [data-cite], [aria-hidden='true']")) continue;
    const text = words(el.textContent ?? "");
    if (text.length < PASSAGE_MIN || seen.has(text)) continue;
    seen.add(text);
    const id = el.closest("[id]")?.id;
    out.push({ text, anchor: id && /^[A-Za-z0-9\-_]{1,80}$/.test(id) ? id : undefined });
    if (out.length === PASSAGES_MAX) break;
  }
  return out;
}

/** Passages that hold every word of `query`, in the page's order; all of them for no query. */
export function passagesWith(passages: readonly Passage[], query: string): Passage[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return passages.slice();
  return passages.filter((p) => {
    const t = p.text.toLowerCase();
    return terms.every((w) => t.includes(w));
  });
}

/**
 * The passage, laid as Quote in journal lays a library quote: the words as the
 * page has them, the page named (a work with its Father: "St John Chrysostom,
 * Homilies on Matthew"), and the way back to the place on it.
 */
export function passageQuote(page: Pick<SearchItem, "label" | "sublabel" | "href">, passage: Passage): PageBlock | null {
  const cite = workAt(page.href) && page.sublabel ? `${page.sublabel}, ${page.label}` : page.label;
  const base = page.href.split("#")[0];
  return libraryBlock(passage.text, cite, passage.anchor ? `${base}#${passage.anchor}` : base);
}

/** Is quoting from this page Plus's? Scripture is everyone's; every other page of the library is Plus's. */
export function quoteNeedsPlus(href: string): boolean {
  return !href.startsWith("/bible");
}
