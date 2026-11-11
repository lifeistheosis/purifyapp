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
//   [[library /saints/john/works/]]   a quote from Purify's library: where it
//   > The words, as the page has them. is in the app, the words verbatim, and
//   > ~ The page they are from        the page they are from
//
// A verse card keeps no words, only where they are: the card shows them from
// the app's own Bible (lib/saved/verseWords.ts), verbatim, so a card can never
// carry words the Scripture does not (docs/editorial-standards.md). A quote of
// one's own is the writer's, with the writer's attribution, and never wears
// the library's mark: hand-typed words are never dressed as a Father's. A
// library quote is taken whole from the page it is held on (Quote in journal,
// lib/journal/quoteInJournal.ts), with that page as its way back, and is not
// edited here as the source's words. A library quote leads only inside the
// app (an address that starts with one "/"): never to another site.
//
// Plus's blocks (step 2, JOURNAL.md "Step 2, how it is kept") are kept the
// same way, and read the same in any build:
//
//   ## A heading                      a heading inside the page
//   - [ ] Something to do             a checklist: done, and not yet
//   - [x] Something done
//   ---                               a divider: a plain line,
//   * * *                             three dots,
//   [[divider space]]                 or a space
//   [[callout candle]]                a callout: a soft box with an icon from
//   > Words set apart.                the house's set, and its words
//
//   [[notebook Lent 2027]]            the page's notebook and its tags, in
//   [[tags fasting, prayer]]          one paragraph under the title, with its
//   [[style font=sans align=center]]  style when it is not the house's own,
//   [[cover john-chrysostom.v2.jpg]]  and its cover, by the file's name
//
// A page with Plus's blocks stays readable, and editable, without Plus: the
// writer's words are never locked away. Only adding one is Plus's.
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
  | { type: "quote"; text: string; by: string }
  /** A quote from Purify's library: the words as the page has them, the page's name, and the way back to it. */
  | { type: "library"; text: string; cite: string; href: string }
  /** Plus: a heading inside the page. */
  | { type: "heading"; text: string }
  /** Plus: a checklist, each line done or not yet. */
  | { type: "check"; items: CheckItem[] }
  /** Plus: a divider, from the house's three, never an ornament drawn by hand. */
  | { type: "divider"; style: DividerStyle }
  /** Plus: words set apart in a soft box, with an icon from the house's set. */
  | { type: "callout"; icon: CalloutIcon; text: string };

export type CheckItem = { text: string; done: boolean };
export const DIVIDER_STYLES = ["line", "dots", "space"] as const;
export type DividerStyle = (typeof DIVIDER_STYLES)[number];
/** The callout's icons, each one of components/ui/icons. */
export const CALLOUT_ICONS = ["candle", "cross", "info", "heart", "star"] as const;
export type CalloutIcon = (typeof CALLOUT_ICONS)[number];
/** The blocks only Plus adds. */
export const PLUS_BLOCKS: readonly PageBlock["type"][] = ["heading", "check", "divider", "callout"];

export type Page = {
  title: string;
  blocks: PageBlock[];
  /** Plus: the notebook the page is in, by name. A notebook is the pages that name it. */
  notebook?: string;
  /** Plus: the page's tags. */
  tags?: string[];
  /** Plus: the page's style, from the house's own: Lora or DM Sans, the start or the centre. */
  style?: PageStyle;
  /** Plus: the page's cover, by the file's name (lib/journal/covers.ts offers only verified artwork). */
  cover?: string;
};

/** A cover's name as a page keeps it: a plain file name, nothing that could lead anywhere else. */
export function cleanCover(id: string | undefined): string | undefined {
  return id && /^[a-z0-9][a-z0-9.-]{0,80}\.(?:jpg|jpeg|png|webp)$/.test(id) ? id : undefined;
}

export type PageStyle = { font?: "serif" | "sans"; align?: "start" | "center" };
export const PAGE_FONTS = ["serif", "sans"] as const;
export const PAGE_ALIGNS = ["start", "center"] as const;

/** A style kept only where it differs from the house's own (Lora, at the start). */
export function cleanStyle(style: PageStyle | undefined): PageStyle | undefined {
  const out: PageStyle = {};
  if (style?.font === "sans") out.font = "sans";
  if (style?.align === "center") out.align = "center";
  return out.font || out.align ? out : undefined;
}

/** The longest notebook name and tag, and the most tags a page carries. */
export const NOTEBOOK_MAX = 60;
export const TAG_MAX = 32;
export const TAGS_MAX = 8;
const PROPERTY_LINE = /^\[\[(notebook|tags|style|cover) (.+)\]\]$/;

/** A page's tags, kept sane: trimmed, one line each, none twice (by their letters), at most TAGS_MAX. */
export function cleanTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = oneLine(raw.replace(/[,\]\[]/g, " "), TAG_MAX);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === TAGS_MAX) break;
  }
  return out;
}

/** A notebook's name, kept sane. */
export function cleanNotebook(name: string | undefined): string {
  return oneLine((name ?? "").replace(/[\]\[]/g, " "), NOTEBOOK_MAX);
}

/** The most verses one card holds: a card is a passage to dwell on, not a chapter. */
export const VERSE_CARD_MAX = 10;
/** The longest title kept. */
export const TITLE_MAX = 120;
/** The longest attribution kept. */
export const BY_MAX = 120;

const VERSE_TOKEN = /^\[\[verse ([a-z0-9][a-z0-9-]{0,31}) (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\]\]$/;
const LIBRARY_TOKEN = /^\[\[library (\S{1,300})\]\]$/;
/** The longest name a library quote's page is given. */
export const CITE_MAX = 160;
const COLOR_PREFIX = /^==([a-z]{1,16})== /;
const CALLOUT_TOKEN = /^\[\[callout ([a-z]{1,16})\]\]$/;
const CHECK_LINE = /^- \[( |x)\] ?(.*)$/;
/** The longest heading, and the longest line of a checklist. */
export const HEADING_MAX = 120;
export const ITEM_MAX = 300;
/** A paragraph that would be read as something else unless it is marked as words. */
const NEEDS_ESCAPE = /^(#{1,2}\s|>|==|\[\[|\\|- \[[ x]\]|---$|\* \* \*$)/;

const oneLine = (s: string, max: number) => Array.from(s.replace(/\s+/g, " ").trim()).slice(0, max).join("");

/** A verse card's span, kept sane: a verse or up to VERSE_CARD_MAX in one chapter. */
export function verseBlock(book: string, chapter: number, from: number, to = from): PageBlock | null {
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(book)) return null;
  if (![chapter, from, to].every((n) => Number.isInteger(n) && n >= 1 && n <= 999)) return null;
  const end = Math.max(from, to);
  if (end - from + 1 > VERSE_CARD_MAX) return null;
  return { type: "verse", book, chapter, from, to: end };
}

/** A way back into the app, and only into it: one "/", then a path with nothing that could leave it. */
export function isAppHref(href: string): boolean {
  return /^\/(?!\/)[A-Za-z0-9\-._~/%#?=&]*$/.test(href) && href.length <= 300 && !/^\/\\/.test(href);
}

/** A library quote, kept sane: words, a page's name, and a way back inside the app. */
export function libraryBlock(text: string, cite: string, href: string): PageBlock | null {
  const words = (text ?? "").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!words || !isAppHref(href)) return null;
  return { type: "library", text: words, cite: oneLine(cite ?? "", CITE_MAX), href };
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

  let notebook = "";
  let tags: string[] = [];
  let style: PageStyle | undefined;
  let cover: string | undefined;
  paras.forEach((p, i) => {
    const props = p.split("\n");
    if (props.every((l) => PROPERTY_LINE.test(l))) {
      for (const l of props) {
        const m = PROPERTY_LINE.exec(l)!;
        if (m[1] === "notebook") notebook = cleanNotebook(m[2]);
        else if (m[1] === "tags") tags = cleanTags(m[2].split(","));
        else if (m[1] === "cover") cover = cleanCover(m[2].trim());
        else {
          const pairs = Object.fromEntries(m[2].split(/\s+/).map((kv) => kv.split("=") as [string, string]));
          style = cleanStyle({ font: pairs.font as PageStyle["font"], align: pairs.align as PageStyle["align"] });
        }
      }
      return;
    }
    if (i === 0 && p.startsWith("# ")) {
      const [first, ...rest] = p.split("\n");
      title = oneLine(first.slice(2), TITLE_MAX);
      if (rest.length && rest.join("\n").trim()) pushText(rest.join("\n"));
      return;
    }
    if (p.startsWith("## ") && !p.includes("\n")) {
      blocks.push({ type: "heading", text: oneLine(p.slice(3), HEADING_MAX) });
      return;
    }
    if (p === "---" || p === "* * *" || p === "[[divider space]]") {
      blocks.push({ type: "divider", style: p === "---" ? "line" : p === "* * *" ? "dots" : "space" });
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
    if (lines.every((l) => CHECK_LINE.test(l))) {
      blocks.push({
        type: "check",
        items: lines.map((l) => {
          const m = CHECK_LINE.exec(l)!;
          return { text: oneLine(m[2], ITEM_MAX), done: m[1] === "x" };
        }),
      });
      return;
    }
    const callout = CALLOUT_TOKEN.exec(lines[0]);
    if (callout && (CALLOUT_ICONS as readonly string[]).includes(callout[1]) && lines.length > 1 && lines.slice(1).every((l) => l.startsWith(">"))) {
      blocks.push({ type: "callout", icon: callout[1] as CalloutIcon, text: lines.slice(1).map((l) => l.replace(/^> ?/, "")).join("\n") });
      return;
    }
    const library = LIBRARY_TOKEN.exec(lines[0]);
    if (library && lines.length > 1 && lines.slice(1).every((l) => l.startsWith(">"))) {
      const inner = lines.slice(1).map((l) => l.replace(/^> ?/, ""));
      let cite = "";
      if (inner.length > 1 && inner[inner.length - 1].startsWith("~ ")) cite = inner.pop()!.slice(2);
      const block = libraryBlock(
        inner.map((l) => (l.startsWith("\\~") ? l.slice(1) : l)).join("\n"),
        cite,
        library[1],
      );
      if (block) {
        blocks.push(block);
        return;
      }
    }
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
  const page: Page = { title, blocks };
  if (notebook) page.notebook = notebook;
  if (tags.length) page.tags = tags;
  if (style) page.style = style;
  if (cover) page.cover = cover;
  return page;
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
  const notebook = cleanNotebook(page.notebook);
  const tags = cleanTags(page.tags ?? []);
  const style = cleanStyle(page.style);
  const styleLine = style ? `[[style ${[style.font ? `font=${style.font}` : "", style.align ? `align=${style.align}` : ""].filter(Boolean).join(" ")}]]` : "";
  const cover = cleanCover(page.cover);
  const props = [notebook ? `[[notebook ${notebook}]]` : "", tags.length ? `[[tags ${tags.join(", ")}]]` : "", styleLine, cover ? `[[cover ${cover}]]` : ""].filter(Boolean);
  if (props.length) out.push(props.join("\n"));
  for (const b of page.blocks) {
    if (b.type === "text") {
      const color = b.color && isHighlightColor(b.color) ? b.color : undefined;
      for (const p of paragraphs(b.text)) out.push(color ? `==${color}== ${escapeParagraph(p)}` : escapeParagraph(p));
    } else if (b.type === "verse") {
      const v = verseBlock(b.book, b.chapter, b.from, b.to);
      if (v && v.type === "verse") out.push(`[[verse ${v.book} ${v.chapter}:${v.from}${v.to > v.from ? `-${v.to}` : ""}]]`);
    } else if (b.type === "heading") {
      const text = oneLine(b.text, HEADING_MAX);
      if (text) out.push(`## ${text}`);
    } else if (b.type === "check") {
      const items = b.items.map((i) => ({ text: oneLine(i.text, ITEM_MAX), done: i.done })).filter((i) => i.text);
      if (items.length) out.push(items.map((i) => `- [${i.done ? "x" : " "}] ${i.text}`).join("\n"));
    } else if (b.type === "divider") {
      out.push(b.style === "dots" ? "* * *" : b.style === "space" ? "[[divider space]]" : "---");
    } else if (b.type === "callout") {
      const lines = b.text.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "").split("\n");
      if (!lines.join("").trim()) continue;
      const icon = (CALLOUT_ICONS as readonly string[]).includes(b.icon) ? b.icon : "info";
      out.push([`[[callout ${icon}]]`, ...lines.map((l) => (l ? `> ${l}` : ">"))].join("\n"));
    } else if (b.type === "library") {
      const lib = libraryBlock(b.text, b.cite, b.href);
      if (!lib || lib.type !== "library") continue;
      // A blank line inside the words would part the block: it is kept as an empty ">" line.
      const quoted = lib.text.split("\n").map((l) => (l.startsWith("~") ? `\\${l}` : l)).map((l) => (l ? `> ${l}` : ">"));
      if (lib.cite) quoted.push(`> ~ ${lib.cite}`);
      out.push([`[[library ${lib.href}]]`, ...quoted].join("\n"));
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
    .map((b) => {
      if (b.type === "text" || b.type === "heading" || b.type === "callout") return b.text;
      if (b.type === "verse") return verseLabel(b);
      if (b.type === "check") return b.items.map((i) => i.text).join("\n");
      if (b.type === "divider") return "";
      const by = b.type === "quote" ? b.by : b.cite;
      return by ? `“${b.text}” ${by}` : `“${b.text}”`;
    })
    .filter((s) => s.trim())
    .join("\n");
}

/** Does the page hold anything worth keeping? */
export function pageIsEmpty(page: Page): boolean {
  return (
    !page.title.trim() &&
    page.blocks.every((b) =>
      b.type === "text" || b.type === "quote" || b.type === "heading" || b.type === "callout"
        ? !b.text.trim()
        : b.type === "check"
          ? b.items.every((i) => !i.text.trim())
          : b.type === "divider",
    )
  );
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

/**
 * The text block a highlight goes on: the one the cursor is in when it has
 * words (or already wears a colour, so the colour can come off), else the last
 * with words. None while nothing is written: there is nothing to mark. Until
 * 2026-11-11 an empty line under the cursor took the colour, which a reader
 * saw as a tap that did nothing.
 */
export function highlightTarget(blocks: readonly PageBlock[], cursorIndex: number | undefined): number | null {
  const here = cursorIndex !== undefined ? blocks[cursorIndex] : undefined;
  if (cursorIndex !== undefined && here?.type === "text" && (here.text.trim() || here.color)) return cursorIndex;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.type === "text" && b.text.trim()) return i;
  }
  return null;
}

/**
 * Where the page already holds an empty quote of one's own, or -1. Quote goes
 * to it and lays no second one: an empty card is a question still open, and
 * two of them are a mistake (build 93 note 8, his second screenshot).
 */
export function emptyQuoteAt(blocks: readonly PageBlock[]): number {
  return blocks.findIndex((b) => b.type === "quote" && !b.text.trim() && !b.by.trim());
}

/** Where the page already holds this verse card, the same verses of the same chapter, or -1. A verse is laid once. */
export function verseAt(blocks: readonly PageBlock[], verse: PageBlock): number {
  if (verse.type !== "verse") return -1;
  return blocks.findIndex((b) => b.type === "verse" && b.book === verse.book && b.chapter === verse.chapter && b.from === verse.from && b.to === verse.to);
}

/** Take a card away, joining the words either side of it again. */
export function removeAt(blocks: readonly PageBlock[], index: number): PageBlock[] {
  return tidyBlocks(blocks.filter((_, i) => i !== index));
}
