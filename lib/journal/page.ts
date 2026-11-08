// A journal page (1.9, docs/1.9-build/JOURNAL.md, "a page"): a title, the
// writer's words, Scripture as verse cards, quotes of one's own with one's own
// attribution, and highlights in the seven colours.
//
// WHERE A PAGE IS KEPT. In the entry's `body`, as text, so nothing else had to
// change: the device's list (lib/journal/entries.ts), the server's
// journal_entries row (a text column of up to 20,000 characters, the owner's
// SQL of 1.7), the sync, the library's export and an older build on a
// reader's second phone all carry a page as they carried words. An older build
// shows the page as the plain text below, which still reads:
//
//   # The title                       the first line, when it is a title
//
//   The writer's words.               a paragraph; blank lines part them
//
//   ==blue== A highlighted paragraph. a paragraph in one of the seven colours
//
//   [[verse john 3:16-18]]            a verse card: only the reference is kept
//
//   > Words of one's own quote.       a quote of one's own
//   > ~ Who said it                   and its attribution, the writer's own
//
// A verse card keeps no words, only where they are: the card shows them from
// the app's own Bible (lib/saved/verseWords.ts), verbatim, so a card can never
// carry words the Scripture does not (docs/editorial-standards.md). A quote of
// one's own is the writer's, with the writer's attribution, and never wears
// the library's mark: hand-typed words are never dressed as a Father's.
//
// Pure: no React, no storage. lib/journal/__tests__/page.test.ts holds the
// round trip.

import { isHighlightColor } from "@/lib/bible/highlightPalette";

export type PageBlock =
  /** The writer's words: one or more paragraphs, in one colour or none. */
  | { type: "text"; text: string; color?: string }
  /** Scripture as a card: a verse or a few, the words from the app's Bible. */
  | { type: "verse"; book: string; chapter: number; from: number; to: number }
  /** A quote of one's own: the words, and who said them, as the writer gives it. */
  | { type: "quote"; text: string; by: string };

export type Page = { title: string; blocks: PageBlock[] };

/** The most verses one card holds: a card is a passage to dwell on, not a chapter. */
export const VERSE_CARD_MAX = 10;
/** The longest title kept. */
export const TITLE_MAX = 120;
/** The longest attribution kept. */
export const BY_MAX = 120;

const VERSE_TOKEN = /^\[\[verse ([a-z0-9][a-z0-9-]{0,31}) (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\]\]$/;
const COLOR_PREFIX = /^==([a-z]{1,16})== /;
/** A paragraph that would be read as something else unless it is marked as words. */
const NEEDS_ESCAPE = /^(#\s|>|==|\[\[|\\)/;

const oneLine = (s: string, max: number) => Array.from(s.replace(/\s+/g, " ").trim()).slice(0, max).join("");

/** A verse card's span, kept sane: a verse or up to VERSE_CARD_MAX in one chapter. */
export function verseBlock(book: string, chapter: number, from: number, to = from): PageBlock | null {
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(book)) return null;
  if (![chapter, from, to].every((n) => Number.isInteger(n) && n >= 1 && n <= 999)) return null;
  const end = Math.max(from, to);
  if (end - from + 1 > VERSE_CARD_MAX) return null;
  return { type: "verse", book, chapter, from, to: end };
}

/** Paragraphs as the text holds them, parted by blank lines. */
function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/^\n+|\n+$/g, ""))
    .filter((p) => p.trim().length > 0);
}

/** Read a page from an entry's body. Any text at all is a page: words alone are one text block. */
export function parsePage(body: string): Page {
  const paras = paragraphs(body ?? "");
  let title = "";
  const blocks: PageBlock[] = [];
  const pushText = (text: string, color?: string) => {
    const last = blocks[blocks.length - 1];
    if (last?.type === "text" && last.color === color) last.text = `${last.text}\n\n${text}`;
    else blocks.push(color ? { type: "text", text, color } : { type: "text", text });
  };

  paras.forEach((p, i) => {
    if (i === 0 && p.startsWith("# ")) {
      const [first, ...rest] = p.split("\n");
      title = oneLine(first.slice(2), TITLE_MAX);
      if (rest.length && rest.join("\n").trim()) pushText(rest.join("\n"));
      return;
    }
    const verse = VERSE_TOKEN.exec(p);
    if (verse) {
      const block = verseBlock(verse[1], Number(verse[2]), Number(verse[3]), verse[4] ? Number(verse[4]) : Number(verse[3]));
      if (block) {
        blocks.push(block);
        return;
      }
    }
    const lines = p.split("\n");
    if (lines.every((l) => l.startsWith(">"))) {
      const inner = lines.map((l) => l.replace(/^> ?/, ""));
      let by = "";
      const last = inner[inner.length - 1];
      if (inner.length > 1 && last.startsWith("~ ")) {
        by = oneLine(last.slice(2), BY_MAX);
        inner.pop();
      }
      const text = inner.map((l) => (l.startsWith("\\~") ? l.slice(1) : l)).join("\n");
      blocks.push({ type: "quote", text, by });
      return;
    }
    const colored = COLOR_PREFIX.exec(p);
    if (colored && isHighlightColor(colored[1])) {
      pushText(unescape(p.slice(colored[0].length)), colored[1]);
      return;
    }
    pushText(unescape(p));
  });
  return { title, blocks };
}

function unescape(p: string): string {
  return p.startsWith("\\") ? p.slice(1) : p;
}

function escapeParagraph(p: string): string {
  return NEEDS_ESCAPE.test(p) ? `\\${p}` : p;
}

/** Write a page into an entry's body: the text an older build shows as it is. */
export function serializePage(page: Page): string {
  const out: string[] = [];
  const title = oneLine(page.title ?? "", TITLE_MAX);
  if (title) out.push(`# ${title}`);
  for (const b of page.blocks) {
    if (b.type === "text") {
      const color = b.color && isHighlightColor(b.color) ? b.color : undefined;
      for (const p of paragraphs(b.text)) out.push(color ? `==${color}== ${escapeParagraph(p)}` : escapeParagraph(p));
    } else if (b.type === "verse") {
      const v = verseBlock(b.book, b.chapter, b.from, b.to);
      if (v && v.type === "verse") out.push(`[[verse ${v.book} ${v.chapter}:${v.from}${v.to > v.from ? `-${v.to}` : ""}]]`);
    } else {
      const lines = b.text.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "").split("\n");
      if (!lines.join("").trim()) continue;
      const quoted = lines.map((l) => (l.startsWith("~") ? `\\${l}` : l)).map((l) => (l ? `> ${l}` : ">"));
      const by = oneLine(b.by ?? "", BY_MAX);
      if (by) quoted.push(`> ~ ${by}`);
      out.push(quoted.join("\n"));
    }
  }
  return out.join("\n\n");
}

/** The page as words alone, for the list's preview and its search: verse cards by their reference. */
export function pageText(page: Page, verseLabel: (b: Extract<PageBlock, { type: "verse" }>) => string): string {
  return page.blocks
    .map((b) => (b.type === "text" ? b.text : b.type === "verse" ? verseLabel(b) : b.by ? `“${b.text}” ${b.by}` : `“${b.text}”`))
    .filter((s) => s.trim())
    .join("\n");
}

/** Does the page hold anything worth keeping? */
export function pageIsEmpty(page: Page): boolean {
  return !page.title.trim() && page.blocks.every((b) => (b.type === "text" ? !b.text.trim() : b.type === "quote" ? !b.text.trim() : false));
}

/**
 * The blocks as the editor keeps them: never two text blocks side by side in
 * one colour (they are one), and always a text block last, to write on in.
 */
export function tidyBlocks(blocks: readonly PageBlock[]): PageBlock[] {
  const out: PageBlock[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (b.type === "text" && last?.type === "text" && last.color === b.color) {
      const joined = [last.text, b.text].filter((t) => t.length > 0).join("\n\n");
      out[out.length - 1] = { ...last, text: joined };
    } else {
      // An empty text block between two cards keeps its place: it is where the cursor goes.
      out.push(b);
    }
  }
  if (out[out.length - 1]?.type !== "text") out.push({ type: "text", text: "" });
  return out;
}

/**
 * Put a block where the cursor is: the text block it is in is parted there,
 * the new block between its two halves, and the words after it go on in a
 * text block of their own.
 */
export function insertAt(blocks: readonly PageBlock[], at: { index: number; start: number; end: number } | null, block: PageBlock): { blocks: PageBlock[]; inserted: number } {
  const list = blocks.slice();
  const target = at ? list[at.index] : undefined;
  if (!at || !target || target.type !== "text") {
    // No cursor in words: at the end, before the last (empty) text block if there is one.
    const last = list[list.length - 1];
    const index = last?.type === "text" && !last.text.trim() ? list.length - 1 : list.length;
    list.splice(index, 0, block);
    return { blocks: tidyBlocks(list), inserted: index };
  }
  const before = target.text.slice(0, at.start).replace(/\s+$/, "");
  const after = target.text.slice(at.end).replace(/^\s+/, "");
  const parts: PageBlock[] = [];
  if (before) parts.push({ ...target, text: before });
  parts.push(block);
  parts.push(target.color ? { type: "text", text: after, color: target.color } : { type: "text", text: after });
  list.splice(at.index, 1, ...parts);
  const inserted = at.index + (before ? 1 : 0);
  return { blocks: tidyBlocks(list), inserted };
}

/** Take a card away, joining the words either side of it again. */
export function removeAt(blocks: readonly PageBlock[], index: number): PageBlock[] {
  return tidyBlocks(blocks.filter((_, i) => i !== index));
}
