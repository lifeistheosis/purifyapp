/**
 * A highlight on any words of a paragraph, kept by its place in the text
 * (build 93 note 13, the owner's word of 2026-11-11: "highlight whichever
 * section or whichever word you want in the actual work itself, so it doesn't
 * just highlight the whole paragraph").
 *
 * A mark knows three things about where it stands: its offsets in the
 * paragraph (`s`, `e`), the words themselves (`q`) and a few words either
 * side (`pre`, `suf`). The offsets are right until the text is edited; then
 * the words find it again, and when the edit was inside the words (a mended
 * typo, a quotation mark set right) the words either side do. A mark that
 * cannot be placed is never thrown away: it is not drawn, and Saved still
 * holds its words.
 *
 * Pure, so every rule here is tested against edits
 * (lib/marks/__tests__/anchor.test.ts).
 */

export type Mark = {
  /** Its own name within the paragraph. */
  id: string;
  /** Where it starts and ends in the paragraph's text; `e` is one past the last character. */
  s: number;
  e: number;
  /** The words. */
  q: string;
  /** The text just before and just after, up to CONTEXT characters. */
  pre?: string;
  suf?: string;
  /** The highlight's colour (lib/bible/highlightPalette.ts). None on words that are only kept or only noted. */
  color?: string;
  /** Kept: listed in Saved as a passage of its own. */
  kept?: boolean;
  note?: string;
  /** When it last changed (ISO). */
  at: string;
};

export type Span = { s: number; e: number };

/** How much text either side a mark remembers. */
export const CONTEXT = 32;

const WORD = /[\p{L}\p{N}]+(?:['’\-‑][\p{L}\p{N}]+)*/gu;

/** Every word of a text, by where it starts and ends. */
export function wordSpans(text: string): Span[] {
  const out: Span[] = [];
  for (const m of text.matchAll(WORD)) out.push({ s: m.index ?? 0, e: (m.index ?? 0) + m[0].length });
  return out;
}

/** A span widened to whole words; null when it touches none. */
export function snapToWords(text: string, s: number, e: number): Span | null {
  const lo = Math.max(0, Math.min(s, e));
  const hi = Math.min(text.length, Math.max(s, e));
  let first: Span | null = null;
  let last: Span | null = null;
  for (const w of wordSpans(text)) {
    // A caret between two words belongs to neither; a caret inside or at the edge of one is that word.
    const touches = hi === lo ? w.s <= lo && lo <= w.e : w.e > lo && w.s < hi;
    if (!touches) continue;
    first ??= w;
    last = w;
  }
  return first && last ? { s: first.s, e: last.e } : null;
}

// Words that end in a full stop without ending a sentence.
const ABBREVIATIONS = new Set([
  "st", "sts", "ss", "mt", "dr", "mr", "mrs", "fr", "rev", "cf", "vs", "viz", "etc", "ibid", "vol", "ch", "chap", "bk", "no", "pp", "ver", "ep", "hom", "tr",
  "gen", "ex", "lev", "num", "deut", "josh", "judg", "sam", "chron", "neh", "ps", "pss", "prov", "eccl", "isa", "jer", "lam", "ezek", "dan", "hos", "mic", "hab", "zech", "mal",
  "matt", "mk", "lk", "jn", "rom", "cor", "gal", "eph", "phil", "col", "thess", "tim", "tit", "heb", "jas", "pet", "rev",
]);

/** Where each sentence of a text ends (one past its last character, closing marks included). */
function sentenceEnds(text: string): number[] {
  const ends: number[] = [];
  const re = /[.!?]+["'’”)\]]*(?=\s|$)/g;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    const end = at + m[0].length;
    if (m[0][0] === ".") {
      const before = /([\p{L}]+)$/u.exec(text.slice(Math.max(0, at - 12), at))?.[1] ?? "";
      // "St. Basil", "Matt. 5", an initial: not a sentence's end.
      if (ABBREVIATIONS.has(before.toLowerCase()) || (before.length === 1 && before === before.toUpperCase())) continue;
      // A stop followed by a small letter runs on ("i.e. the same").
      const next = /^\s+(\S)/.exec(text.slice(end))?.[1];
      if (next && next !== next.toUpperCase()) continue;
    }
    ends.push(end);
  }
  if (ends[ends.length - 1] !== text.length) ends.push(text.length);
  return ends;
}

/** The whole sentence, or sentences, a span stands in. */
export function sentenceAround(text: string, s: number, e: number): Span {
  const ends = sentenceEnds(text);
  let start = 0;
  let end = text.length;
  for (const at of ends) {
    if (at <= s) start = at;
    if (at >= e) {
      end = at;
      break;
    }
  }
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return { s: start, e: end };
}

/** The paragraph, without the space at its ends. */
export function wholeSpan(text: string): Span {
  let s = 0;
  let e = text.length;
  while (s < e && /\s/.test(text[s])) s += 1;
  while (e > s && /\s/.test(text[e - 1])) e -= 1;
  return { s, e };
}

export function coversAll(text: string, span: Span): boolean {
  const all = wholeSpan(text);
  return span.s <= all.s && span.e >= all.e;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** A mark on `text` from `s` to `e`, remembering its words and what stands either side. */
export function makeMark(text: string, s: number, e: number, more: Partial<Pick<Mark, "color" | "kept" | "note" | "id" | "at">> = {}): Mark | null {
  let lo = Math.max(0, Math.min(s, e));
  let hi = Math.min(text.length, Math.max(s, e));
  while (lo < hi && /\s/.test(text[lo])) lo += 1;
  while (hi > lo && /\s/.test(text[hi - 1])) hi -= 1;
  if (hi <= lo) return null;
  const mark: Mark = { id: more.id ?? newId(), s: lo, e: hi, q: text.slice(lo, hi), at: more.at ?? new Date().toISOString() };
  const pre = text.slice(Math.max(0, lo - CONTEXT), lo);
  const suf = text.slice(hi, hi + CONTEXT);
  if (pre) mark.pre = pre;
  if (suf) mark.suf = suf;
  if (more.color) mark.color = more.color;
  if (more.kept) mark.kept = true;
  if (more.note) mark.note = more.note;
  return mark;
}

/** The same mark moved to where it now stands, its words and surroundings read again from the text. */
export function reanchor(text: string, mark: Mark, at: Span): Mark {
  const fresh = makeMark(text, at.s, at.e, { id: mark.id, at: mark.at, color: mark.color, kept: mark.kept, note: mark.note });
  return fresh ?? mark;
}

// ── Finding a mark again ─────────────────────────────────────────────────

/**
 * A text as an edit of punctuation leaves it: curly quotation marks and
 * apostrophes straight, every run of space one space. `map[i]` is where the
 * i-th character of the result stands in the text.
 */
function plain(text: string): { n: string; map: number[] } {
  let n = "";
  const map: number[] = [];
  let space = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (/\s/.test(c) || c === " ") {
      if (!space && n.length) {
        n += " ";
        map.push(i);
      }
      space = true;
      continue;
    }
    space = false;
    n += c === "‘" || c === "’" || c === "‛" ? "'" : c === "“" || c === "”" || c === "„" ? '"' : c;
    map.push(i);
  }
  return { n, map };
}

function allIndexes(hay: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) out.push(at);
  return out;
}

/** How many characters two strings share, read from the end of one and the start of the other. */
function sharedTail(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n += 1;
  return n;
}
function sharedHead(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n += 1;
  return n;
}

function best(candidates: Span[], text: string, mark: Mark): Span | null {
  if (!candidates.length) return null;
  const pre = plain(mark.pre ?? "").n;
  const suf = plain(mark.suf ?? "").n;
  let top: Span | null = null;
  let topScore = -Infinity;
  for (const c of candidates) {
    const before = plain(text.slice(Math.max(0, c.s - CONTEXT - 8), c.s)).n;
    const after = plain(text.slice(c.e, c.e + CONTEXT + 8)).n;
    // What stands either side counts most; how far it moved settles a tie.
    const score = (sharedTail(before, pre) + sharedHead(after, suf)) * 1000 - Math.abs(c.s - mark.s);
    if (score > topScore) {
      topScore = score;
      top = c;
    }
  }
  return top;
}

/** The least of the words either side that will be trusted to find a mark whose own words changed. */
const MIN_CONTEXT = 8;

/**
 * Where a mark stands in a text now, or null when it cannot be found.
 *  1. where it was, when the words there are still its words;
 *  2. its words elsewhere in the paragraph (the nearest whose surroundings fit);
 *  3. its words as an edit of punctuation or spacing leaves them;
 *  4. between the words that stood either side of it, when its own changed.
 */
export function locate(text: string, mark: Mark): Span | null {
  if (!mark.q) return null;
  if (text.slice(mark.s, mark.e) === mark.q) return { s: mark.s, e: mark.e };

  const exact = allIndexes(text, mark.q).map((s) => ({ s, e: s + mark.q.length }));
  if (exact.length) return best(exact, text, mark);

  const t = plain(text);
  const q = plain(mark.q).n;
  const spanOf = (from: number, len: number): Span => ({ s: t.map[from], e: t.map[from + len - 1] + 1 });
  const loose = allIndexes(t.n, q).map((at) => spanOf(at, q.length));
  if (loose.length) return best(loose, text, mark);

  // Its own words changed: what stood either side still marks the place.
  const pre = plain(mark.pre ?? "").n.trimStart();
  const suf = plain(mark.suf ?? "").n.trimEnd();
  const atStart = !mark.pre;
  const atEnd = !mark.suf;
  if ((!atStart && pre.length < MIN_CONTEXT) || (!atEnd && suf.length < MIN_CONTEXT)) return null;
  const starts = atStart ? [0] : allIndexes(t.n, pre).map((at) => at + pre.length);
  const ends = atEnd ? [t.n.length] : allIndexes(t.n, suf);
  let found: { from: number; to: number } | null = null;
  let foundOff = Infinity;
  for (const from of starts) {
    for (const to of ends) {
      const len = to - from;
      if (len <= 0) continue;
      // An edit mends words; it does not double them or halve them.
      if (len > q.length * 2 + 8 || len * 2 + 8 < q.length) continue;
      const off = Math.abs(len - q.length);
      if (off < foundOff) {
        foundOff = off;
        found = { from, to };
      }
    }
  }
  if (!found) return null;
  let { from, to } = found;
  while (from < to && t.n[from] === " ") from += 1;
  while (to > from && t.n[to - 1] === " ") to -= 1;
  return to > from ? spanOf(from, to - from) : null;
}

/**
 * A mark that its own paragraph no longer holds, looked for in the others of
 * its section, nearest first (a paragraph split in two, or one added above).
 * Only its words are trusted this far from home, never its surroundings alone.
 */
export function locateAcross(paragraphs: readonly string[], home: number, mark: Mark): { paragraphIdx: number; at: Span } | null {
  const own = paragraphs[home];
  if (own !== undefined) {
    const at = locate(own, mark);
    if (at) return { paragraphIdx: home, at };
  }
  // Too few words to know them again in another paragraph.
  if (plain(mark.q).n.length < 12) return null;
  for (let d = 1; d < paragraphs.length; d += 1) {
    for (const idx of [home - d, home + d]) {
      const text = paragraphs[idx];
      if (text === undefined) continue;
      const anywhere: Mark = { ...mark, pre: mark.pre, suf: mark.suf, s: 0, e: 0 };
      const exact = allIndexes(text, mark.q).map((s) => ({ s, e: s + mark.q.length }));
      const at = exact.length ? best(exact, text, anywhere) : looseOnly(text, anywhere);
      if (at) return { paragraphIdx: idx, at };
    }
  }
  return null;
}

function looseOnly(text: string, mark: Mark): Span | null {
  const t = plain(text);
  const q = plain(mark.q).n;
  const hits = allIndexes(t.n, q).map((at) => ({ s: t.map[at], e: t.map[at + q.length - 1] + 1 }));
  return best(hits, text, mark);
}

// ── Drawing ──────────────────────────────────────────────────────────────

export type Placed = { mark: Mark; s: number; e: number };

/** The marks of a paragraph that can be placed in its text now, in reading order. */
export function placeMarks(text: string, marks: readonly Mark[] | undefined): Placed[] {
  const out: Placed[] = [];
  for (const mark of marks ?? []) {
    const at = locate(text, mark);
    if (at) out.push({ mark, s: at.s, e: at.e });
  }
  return out.sort((a, b) => a.s - b.s || a.e - b.e);
}

export type Piece = { s: number; e: number; text: string; marks: Mark[] };

/**
 * A paragraph cut wherever a mark begins or ends, each piece with the marks
 * over it, the newest first: where two overlap, the newer one's colour shows.
 * The pieces joined are the text, character for character.
 */
export function pieces(text: string, placed: readonly Placed[]): Piece[] {
  const cuts = new Set<number>([0, text.length]);
  for (const p of placed) {
    cuts.add(Math.max(0, Math.min(text.length, p.s)));
    cuts.add(Math.max(0, Math.min(text.length, p.e)));
  }
  const at = [...cuts].sort((a, b) => a - b);
  const out: Piece[] = [];
  for (let i = 0; i < at.length - 1; i += 1) {
    const s = at[i];
    const e = at[i + 1];
    if (e <= s) continue;
    const over = placed
      .filter((p) => p.s <= s && p.e >= e)
      .map((p) => p.mark)
      .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    out.push({ s, e, text: text.slice(s, e), marks: over });
  }
  return out.length ? out : [{ s: 0, e: text.length, text, marks: [] }];
}

// ── A paragraph's marks, changed ─────────────────────────────────────────

/** The marks with one added or replaced (by id). */
export function withMark(marks: readonly Mark[] | undefined, mark: Mark): Mark[] {
  const rest = (marks ?? []).filter((m) => m.id !== mark.id);
  return [...rest, mark];
}

/** The marks without one; undefined when none is left. */
export function withoutMark(marks: readonly Mark[] | undefined, id: string): Mark[] | undefined {
  const rest = (marks ?? []).filter((m) => m.id !== id);
  return rest.length ? rest : undefined;
}

/** A mark with nothing on it (no colour, not kept, no note) is no mark. */
export function isBare(mark: Mark): boolean {
  return !mark.color && !mark.kept && !(mark.note && mark.note.trim());
}

/** What a stored list of marks really holds: well formed marks only, so a bad row from anywhere cannot break a page. */
export function cleanMarks(value: unknown): Mark[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: Mark[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object") continue;
    const m = v as Record<string, unknown>;
    if (typeof m.id !== "string" || typeof m.q !== "string" || !m.q || !Number.isInteger(m.s) || !Number.isInteger(m.e)) continue;
    const mark: Mark = { id: m.id.slice(0, 40), s: m.s as number, e: m.e as number, q: m.q, at: typeof m.at === "string" ? m.at : new Date(0).toISOString() };
    if (typeof m.pre === "string" && m.pre) mark.pre = m.pre.slice(-CONTEXT);
    if (typeof m.suf === "string" && m.suf) mark.suf = m.suf.slice(0, CONTEXT);
    if (typeof m.color === "string" && /^[a-z]{1,16}$/.test(m.color)) mark.color = m.color;
    if (m.kept === true) mark.kept = true;
    if (typeof m.note === "string" && m.note.trim()) mark.note = m.note;
    if (!isBare(mark)) out.push(mark);
  }
  return out.length ? out : undefined;
}
