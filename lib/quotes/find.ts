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
    found.push({ match, share: Math.round(share * 100) / 100, cite, excerpt: excerptOf(p.text, words) });
    if (found.length >= MAX) break;
  }
  return found;
}
