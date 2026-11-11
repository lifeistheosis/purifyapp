import "server-only";
import fs from "node:fs";
import path from "node:path";

import type { ShownCite } from "@/lib/citations/cite";
import { shownCouncil, shownWork } from "@/lib/citations/shown";
import { COUNCILS } from "@/lib/councils/councils";
import { ENTRIES } from "@/lib/reading/entries";

/**
 * "Who said it" (1.8, the owner's word of 2026-10-24). A reader pastes a
 * line that goes round under a Father's name; this finds it in the texts the
 * app carries word for word (the reading room's works and the councils'
 * documents), and says where: the author, the work and the place, opening
 * it. Or it says plainly that no public-domain text we carry has it.
 *
 * Only the words of the books are searched. A section in our own voice (a
 * retelling, an introduction) is never searched, so a match is always the
 * book's words, and a "not found" never hides behind our paraphrase.
 *
 *   exact  the words, in order, inside one paragraph (spelling, case and
 *          punctuation aside)
 *   close  half or more of the line's three-word runs in one paragraph: another
 *          translation, a word changed, two sentences joined. The page says
 *          "not word for word" and shows the book's own.
 *
 * The texts are read once per server and held as plain lowercased words.
 */

export type Found = {
  match: "exact" | "close";
  /** The share of the line's three-word runs the paragraph holds, 0 to 1. */
  share: number;
  /** The line under it, as every quotation in the app shows its source. */
  cite: Extract<ShownCite, { kind: "father" }>;
  /** The paragraph's own words around the match, at most about 320 letters. */
  excerpt: string;
  /**
   * The book's own words for the line itself (1.9, build 93 note 11, Learn by
   * heart): for a line found word for word, exactly the words it matched, as
   * the edition prints them; for a close one, the part of the paragraph that
   * holds most of it. Whole words in the book's order, never ours, and never
   * the line as it was pasted. What a reader learns when they take the quote.
   */
  words: string;
};

type Para = { at: { saint: string; work: string } | { council: string; document: string }; section: number; paragraph: number; norm: string; text: string };

// British spellings and the old verbs, read as the modern ones: a line going
// round says "Savior" and "has" where the 1906 page says "Saviour" and "hath".
const SAME: Record<string, string> = {
  hath: "has", doth: "does", saith: "says",
  saviour: "savior", saviours: "saviors", honour: "honor", honoured: "honored", honours: "honors", labour: "labor",
  labours: "labors", laboured: "labored", favour: "favor", colour: "color", neighbour: "neighbor", neighbours: "neighbors",
  splendour: "splendor", fervour: "fervor", odour: "odor", odours: "odors", ardour: "ardor", vigour: "vigor",
  behaviour: "behavior", harbour: "harbor", valour: "valor", clamour: "clamor", endeavour: "endeavor",
};

/** Lowercase words only, so spelling marks, quotation marks and case never decide. */
export function normWords(s: string): string[] {
  return (s
    .toLowerCase()
    .replace(/[’‘']/g, "")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-z0-9]+/g) ?? []).map((w) => SAME[w] ?? w);
}

const ROOT = process.cwd();
let CORPUS: Para[] | null = null;

type Sec = { n: number; voice?: string; paragraphs: string[] };

function corpus(): Para[] {
  if (CORPUS) return CORPUS;
  const out: Para[] = [];
  for (const [key, entry] of Object.entries(ENTRIES)) {
    if (entry.form === "retelling") continue;
    const [saint, work] = key.split("/");
    let file: { sections: Sec[] };
    try {
      file = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8"));
    } catch {
      continue;
    }
    for (const s of file.sections) {
      if (s.voice === "editorial") continue;
      s.paragraphs.forEach((p, i) => {
        if (p.trim()) out.push({ at: { saint, work }, section: s.n, paragraph: i, norm: ` ${normWords(p).join(" ")} `, text: p });
      });
    }
  }
  for (const c of COUNCILS) {
    for (const d of c.documents) {
      let file: { sections: Sec[] };
      try {
        file = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "councils", c.slug, `${d.slug}.json`), "utf8"));
      } catch {
        continue;
      }
      for (const s of file.sections) {
        s.paragraphs.forEach((p, i) => {
          if (p.trim()) out.push({ at: { council: c.slug, document: d.slug }, section: s.n, paragraph: i, norm: ` ${normWords(p).join(" ")} `, text: p });
        });
      }
    }
  }
  CORPUS = out;
  return out;
}

/** The fewest words a line must have: shorter ones match everywhere and prove nothing. */
export const MIN_WORDS = 5;
const CLOSE = 0.5;
const MAX = 5;

function excerptOf(text: string, words: string[]): string {
  if (text.length <= 320) return text;
  // Centre on the line's first word as it stands in the paragraph.
  const first = words[0];
  const i = Math.max(0, text.toLowerCase().search(new RegExp(`\\b${first}\\b`)));
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, i - 80)));
  const end = Math.min(text.length, start + 320);
  return `${start > 0 ? "… " : ""}${text.slice(start, end).trim()}${end < text.length ? " …" : ""}`;
}

/** The most letters of the book's words handed back to learn: lib/remember/items.ts keeps as many (QUOTE_MAX). */
const WORDS_MAX = 600;

/** A run of the book's text between spaces, and the plain words it holds ("well-known," holds two; a lone dash, none). */
type Run = { raw: string; from: number; count: number };

function runsOf(text: string): { runs: Run[]; flat: string[] } {
  const runs: Run[] = [];
  const flat: string[] = [];
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const words = normWords(raw);
    runs.push({ raw, from: flat.length, count: words.length });
    flat.push(...words);
  }
  return { runs, flat };
}

/** The runs from the one holding plain word `a` to the one holding plain word `b`, as the book prints them, its edges cleared of stray marks. */
function printed(runs: readonly Run[], a: number, b: number): string {
  const first = runs.findIndex((r) => r.count > 0 && r.from + r.count > a);
  let last = first;
  for (let i = first; i < runs.length && runs[i].from <= b; i++) if (runs[i].count > 0) last = i;
  if (first < 0) return "";
  return runs
    .slice(first, last + 1)
    .map((r) => r.raw)
    .join(" ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}.?!]+$/u, "");
}

/**
 * The book's own words for a line (Found.words). Word for word: the words the
 * line matched. Close: the stretch of the paragraph, about as long as the
 * line, that holds the most of its three-word runs. Null when the paragraph
 * holds nothing of it, which a paragraph that was found never does.
 */
export function bookWords(text: string, line: string): string | null {
  const words = normWords(line);
  const { runs, flat } = runsOf(text);
  if (words.length < 1 || !flat.length) return null;
  let at = -1;
  for (let i = 0; i + words.length <= flat.length && at < 0; i++) {
    let same = true;
    for (let j = 0; j < words.length && same; j++) same = flat[i + j] === words[j];
    if (same) at = i;
  }
  let from = at;
  let to = at + words.length - 1;
  if (at < 0) {
    if (words.length < 3) return null;
    const grams = new Set(words.slice(0, words.length - 2).map((_, i) => words.slice(i, i + 3).join(" ")));
    const hit = flat.map((_, i) => (i + 2 < flat.length && grams.has(`${flat[i]} ${flat[i + 1]} ${flat[i + 2]}`) ? 1 : 0));
    const width = Math.min(flat.length, Math.ceil(words.length * 1.25));
    let best = -1;
    let most = 0;
    let sum = 0;
    for (let i = 0; i < flat.length; i++) {
      sum += hit[i];
      if (i >= width) sum -= hit[i - width];
      if (sum > most) {
        most = sum;
        best = i;
      }
    }
    if (best < 0) return null;
    // The window that ended at `best`, drawn in to its first and last run that are the line's.
    from = Math.max(0, best - width + 1);
    to = Math.min(flat.length - 1, best + 2);
    while (from < to && !hit[from]) from += 1;
  }
  let out = printed(runs, from, to);
  // Too long to learn: whole words from its start, as many as fit.
  while (out.length > WORDS_MAX && to > from) {
    to -= 1;
    out = printed(runs, from, to);
  }
  return out || null;
}

function citeOf(p: Para): Extract<ShownCite, { kind: "father" }> | null {
  return "saint" in p.at
    ? shownWork({ saint: p.at.saint, work: p.at.work, section: p.section, paragraph: p.paragraph })
    : shownCouncil({ council: p.at.council, document: p.at.document, section: p.section });
}

/** Where a line stands in the texts the app carries, best first; empty when nowhere. */
export function findQuote(line: string): Found[] {
  const words = normWords(line);
  if (words.length < MIN_WORDS) return [];
  const needle = ` ${words.join(" ")} `;
  const all = corpus();
  const exact = all.filter((p) => p.norm.includes(needle));
  const scored: { p: Para; share: number; match: Found["match"] }[] = exact.map((p) => ({ p, share: 1, match: "exact" }));
  if (!exact.length) {
    const grams = [...new Set(words.slice(0, words.length - 2).map((_, i) => ` ${words.slice(i, i + 3).join(" ")} `))];
    for (const p of all) {
      let hit = 0;
      for (const g of grams) if (p.norm.includes(g)) hit += 1;
      const share = hit / grams.length;
      if (share >= CLOSE) scored.push({ p, share, match: "close" });
    }
    scored.sort((a, b) => b.share - a.share);
  }
  const found: Found[] = [];
  const seen = new Set<string>();
  for (const { p, share, match } of scored) {
    const cite = citeOf(p);
    if (!cite || seen.has(cite.href)) continue;
    seen.add(cite.href);
    const excerpt = excerptOf(p.text, words);
    found.push({ match, share: Math.round(share * 100) / 100, cite, excerpt, words: bookWords(p.text, line) ?? excerpt });
    if (found.length >= MAX) break;
  }
  return found;
}
