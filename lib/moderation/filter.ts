/**
 * Community word filter: the matching itself, pure, so it is tested on its
 * own. The lists live elsewhere (lib/moderation/terms.ts, server-only, and the
 * admin's own additions in community_filter_terms); lib/moderation/server.ts
 * puts them together.
 *
 * What it does with a hit:
 *   - in a post or reply: the word is masked with asterisks, the writer is
 *     asked first whether they are sure, and a moderator sees the original
 *     and decides (approve as written, keep hidden, or remove);
 *   - in a handle: the handle is refused.
 *
 * Made to catch the usual ways round a filter (n.i.g.g.e.r, f u c k i n g,
 * fuuuck, n1gg3r, accented letters, Cyrillic look-alikes inside a Latin
 * word, zero-width characters) without the classic false alarms: Niger and
 * Nigeria, snigger, Scunthorpe, retardant, spice, Santiago, a sexton.
 */

export type TermEntry = [term: string, flags: string, suffixes?: string];

type TextMatcher = { re: RegExp; whole: boolean };
export type CompiledFilter = {
  text: TextMatcher[];
  handleAnywhere: string[];
  handleToken: string[];
  allow: ReadonlySet<string>;
};

/** Letters and digits: what a word is made of, in any script. */
const WORD = /[\p{L}\p{N}]/u;
const LATIN = /\p{Script=Latin}/u;
const LOOKALIKE_SCRIPT = /[\p{Script=Cyrillic}\p{Script=Greek}]/u;
const INVISIBLE = /[­​-‍⁠﻿]/u;
const MARKS = /\p{M}/gu;

/** Digits and signs written for letters, inside a word only (so "fag!" still ends at the g). */
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i", "|": "i" };

/** Cyrillic and Greek letters that look Latin, swapped only inside a word that mixes scripts. */
const LOOKALIKE: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", ԁ: "d",
  α: "a", β: "b", ε: "e", η: "n", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x",
};

type Normalized = { norm: string; from: number[]; to: number[] };

/**
 * Lowercase, accents off, look-alikes and leetspeak turned to letters,
 * invisible characters dropped, with a map back to the original positions so
 * a hit can be masked in the text as the reader wrote it.
 */
export function normalizeForMatch(text: string): Normalized {
  const chars: { ch: string; at: number }[] = [];
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i) as number;
    const ch = String.fromCodePoint(cp);
    chars.push({ ch, at: i });
    i += ch.length;
  }
  // Which words mix Latin with Cyrillic or Greek: the only ones look-alikes are swapped in.
  const mixed = new Array<boolean>(chars.length).fill(false);
  for (let i = 0; i < chars.length; ) {
    if (!WORD.test(chars[i].ch)) {
      i++;
      continue;
    }
    let j = i;
    let latin = false;
    let other = false;
    while (j < chars.length && (WORD.test(chars[j].ch) || INVISIBLE.test(chars[j].ch))) {
      if (LATIN.test(chars[j].ch)) latin = true;
      if (LOOKALIKE_SCRIPT.test(chars[j].ch)) other = true;
      j++;
    }
    if (latin && other) for (let k = i; k < j; k++) mixed[k] = true;
    i = j;
  }
  const isWordish = (k: number) => k >= 0 && k < chars.length && (WORD.test(chars[k].ch) || LEET[chars[k].ch] !== undefined);
  const isLetter = (k: number) => k >= 0 && k < chars.length && /\p{L}/u.test(chars[k].ch);

  let norm = "";
  const from: number[] = [];
  const to: number[] = [];
  for (let k = 0; k < chars.length; k++) {
    const { ch, at } = chars[k];
    if (INVISIBLE.test(ch)) continue;
    let out: string;
    const lower = ch.toLowerCase();
    if (LEET[ch] !== undefined && isWordish(k - 1) && isWordish(k + 1) && (isLetter(k - 1) || isLetter(k + 1))) out = LEET[ch];
    else if (mixed[k] && LOOKALIKE[lower]) out = LOOKALIKE[lower];
    else out = lower.normalize("NFKD").replace(MARKS, "");
    for (const o of out) {
      norm += o;
      from.push(at);
      to.push(at + ch.length);
    }
  }
  return { norm, from, to };
}

function escapeChar(c: string): string {
  return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A term as a pattern: each letter may repeat, with a dot, dash, star or underscore between (a space too, for long words). */
function termPattern(term: string): string {
  const letters = [...term.toLowerCase().replace(/\s+/g, "")];
  const sep = letters.length >= 6 ? "(?:[._*\\-]|\\s)?" : letters.length >= 4 ? "[._*\\-]?" : "";
  return letters.map((c) => `${escapeChar(c)}+`).join(sep);
}

export function compileFilter(entries: TermEntry[], allow: Iterable<string>): CompiledFilter {
  const text: TextMatcher[] = [];
  const handleAnywhere: string[] = [];
  const handleToken: string[] = [];
  for (const [rawTerm, flags, suffixes] of entries) {
    const term = rawTerm.toLowerCase().trim();
    if (!term) continue;
    const [tier, inText, inHandle] = flags;
    if (tier === "t" && (inText === "w" || inText === "p")) {
      const body = termPattern(term);
      if (inText === "w") {
        const suf = suffixes ? `(?:${suffixes.split("|").map((s) => [...s].map(escapeChar).join("")).join("|")})?` : "";
        text.push({ re: new RegExp(`(?<![\\p{L}\\p{N}])${body}${suf}(?![\\p{L}\\p{N}])`, "gu"), whole: true });
      } else {
        text.push({ re: new RegExp(body, "gu"), whole: false });
      }
    }
    const squashed = term.replace(/[^a-z0-9]/g, "");
    if (!squashed) continue;
    if (inHandle === "a") handleAnywhere.push(squashed);
    else handleToken.push(squashed);
  }
  return { text, handleAnywhere, handleToken, allow: new Set([...allow].map((w) => w.toLowerCase())) };
}

/** The whole word around [s, e) in the normalized text. */
function wordAround(norm: string, s: number, e: number): string {
  let a = s;
  let b = e;
  while (a > 0 && WORD.test(norm[a - 1])) a--;
  while (b < norm.length && WORD.test(norm[b])) b++;
  return norm.slice(a, b);
}

/** Where listed words sit in the text, as [start, end) in the text as written. */
export function findHits(text: string, f: CompiledFilter): [number, number][] {
  if (!text) return [];
  const { norm, from, to } = normalizeForMatch(text);
  const spans: [number, number][] = [];
  for (const { re, whole } of f.text) {
    re.lastIndex = 0;
    for (let m = re.exec(norm); m; m = re.exec(norm)) {
      const s = m.index;
      const e = s + m[0].length;
      if (e === s) {
        re.lastIndex++;
        continue;
      }
      if (!whole && f.allow.has(wordAround(norm, s, e))) continue;
      spans.push([from[s], to[e - 1]]);
    }
  }
  // Overlaps merged, in order.
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]);
    else merged.push([...sp]);
  }
  return merged;
}

/** The text with every hit masked, and how many there were. */
export function censorText(text: string, f: CompiledFilter): { text: string; hits: number } {
  const hits = findHits(text, f);
  if (hits.length === 0) return { text, hits: 0 };
  let out = "";
  let at = 0;
  for (const [s, e] of hits) {
    out += text.slice(at, s);
    const letters = [...text.slice(s, e)].filter((c) => WORD.test(c)).length;
    out += "*".repeat(Math.min(12, Math.max(3, letters)));
    at = e;
  }
  return { text: out + text.slice(at), hits: hits.length };
}

const HANDLE_LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b" };

/** Whether a handle carries a listed word, read with and without digits standing for letters. */
export function handleBlocked(handle: string, f: CompiledFilter): boolean {
  const h = handle.toLowerCase();
  const views = [
    // Letters only, tokens split at dots, underscores and digits.
    h.split(/[._0-9]+/).filter(Boolean),
    // Digits read as letters (n1gg3r), tokens split at dots and underscores.
    h
      .split(/[._]+/)
      .filter(Boolean)
      .map((t) => [...t].map((c) => HANDLE_LEET[c] ?? c).join("")),
  ];
  for (const tokens of views) {
    const squashed = tokens.join("");
    for (const term of f.handleAnywhere) {
      let i = squashed.indexOf(term);
      while (i >= 0) {
        // The token the hit falls in: an ordinary word there is let through.
        let pos = 0;
        let owner = "";
        for (const t of tokens) {
          if (i >= pos && i < pos + t.length) owner = t;
          pos += t.length;
        }
        if (!f.allow.has(owner)) return true;
        i = squashed.indexOf(term, i + 1);
      }
    }
    for (const t of tokens) {
      const bare = t.replace(/(.)\1{2,}/g, "$1$1");
      for (const term of f.handleToken) {
        if (bare === term || bare === `${term}s` || bare === `${term}z`) return true;
      }
    }
    if (f.handleToken.includes(squashed)) return true;
  }
  return false;
}
