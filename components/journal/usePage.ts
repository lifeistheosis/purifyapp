"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { MAX_BODY } from "@/lib/journal/entries";
import { isWriting } from "@/lib/journal/writing";
import { cleanStyle, highlightTarget, insertAt, parsePage, removeAt, serializePage, tidyBlocks, type Page, type PageBlock, type PageStyle } from "@/lib/journal/page";

/** Where the cursor is: a text block's index and the selection in it. */
export type Cursor = { index: number; start: number; end: number };
/** Which field of a block takes the cursor: its words (a textarea), or its line (an input: a heading, a checklist's line). */
type FocusAsk = { index: number; at: "start" | "end"; field?: "input"; /** False: the block is brought into view and no cursor is given. */ cursor?: boolean };

function fresh(body: string): Page {
  const page = parsePage(body);
  return { ...page, blocks: tidyBlocks(page.blocks) };
}

/** The panel open over the tools at the sheet's foot, if any. */
export type PagePanel = "verse" | "color" | "more" | "props" | null;

/**
 * The page being written (lib/journal/page.ts), held as blocks while the sheet
 * is open and written into the entry's body on every change. Read from the
 * body once, as the sheet opens; while it is open the blocks are the truth,
 * so a cursor never jumps under the writer's thumb.
 *
 * A change that would carry the page past the server's 20,000 characters is
 * not made, as the field's own limit did before pages.
 */
export function usePage(open: boolean, body: string, onBody: (body: string) => void) {
  const [page, setPage] = useState<Page>(() => fresh(body));
  // Read the body again each time the sheet opens, during the render that
  // opens it (React's way to follow a prop), not in an effect after it.
  const [wasOpen, setWasOpen] = useState(open);
  const [panel, setPanel] = useState<PagePanel>(null);
  // A card the writer was just taken back to, lit for a moment so the eye
  // finds it: the verse already on the page, when it is asked for again.
  const [noticed, setNoticed] = useState<number | null>(null);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPage(fresh(body));
    setPanel(null);
    setNoticed(null);
  }

  // Where the cursor is, as state: the tools read it to know which paragraph
  // a colour goes on, while the page is drawn.
  const [cursor, setCursorState] = useState<Cursor | null>(null);
  // A page opens with no cursor (lib/journal/writing.ts): what was left from
  // the page open before it is forgotten, so a card laid before any tap goes
  // at the page's end, and not where another page's cursor was.
  const [cursorFor, setCursorFor] = useState(open);
  if (open !== cursorFor) {
    setCursorFor(open);
    if (open) setCursorState(null);
  }
  const setCursor = useCallback((c: Cursor | null) => {
    setCursorState((was) => (was && c && was.index === c.index && was.start === c.start && was.end === c.end ? was : c));
  }, []);
  const focusAsk = useRef<FocusAsk | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (noticed === null) return;
    const id = window.setTimeout(() => setNoticed(null), 1400);
    return () => window.clearTimeout(id);
  }, [noticed]);

  const commit = useCallback(
    (next: Page, focus?: FocusAsk) => {
      const text = serializePage(next);
      if (text.length > MAX_BODY) return false;
      setPage(next);
      onBody(text);
      if (focus) {
        // The cursor goes on to the new place only for a reader who has one
        // (lib/journal/writing.ts). With none, the block is brought into
        // view and the keyboard stays down until they tap where they write.
        focusAsk.current = { ...focus, cursor: isWriting() };
        setFocusTick((n) => n + 1);
      }
      return true;
    },
    [onBody],
  );

  // A block just put in place takes the cursor: the words after a card, or a
  // new quote's own field.
  useLayoutEffect(() => {
    const ask = focusAsk.current;
    if (!ask) return;
    focusAsk.current = null;
    const root = document.querySelector(`[data-journal-composer] [data-page-block="${ask.index}"]`);
    const field = root?.querySelector<HTMLTextAreaElement | HTMLInputElement>(ask.field === "input" ? "input" : "textarea");
    if (!field) return;
    if (ask.cursor !== false) {
      field.focus({ preventScroll: true });
      const at = ask.at === "start" ? 0 : field.value.length;
      field.setSelectionRange(at, at);
    }
    field.scrollIntoView({ block: "nearest" });
  }, [focusTick]);

  const setTitle = (title: string) => commit({ ...page, title });
  /** Plus: the page's notebook (empty takes it out of one) and its tags. */
  const setNotebook = (notebook: string) => commit({ ...page, notebook: notebook || undefined });
  const setTags = (tags: string[]) => commit({ ...page, tags: tags.length ? tags : undefined });
  /** Plus: the page's style, from the house's own. */
  const setStyle = (patch: PageStyle) => commit({ ...page, style: cleanStyle({ ...page.style, ...patch }) });
  /** Plus: the page's cover, by the file's name; none takes it away. */
  const setCover = (cover: string | undefined) => commit({ ...page, cover });

  const setBlock = (index: number, patch: Partial<PageBlock>) => {
    const blocks = page.blocks.map((b, i) => (i === index ? ({ ...b, ...patch } as PageBlock) : b));
    commit({ ...page, blocks });
  };

  /** Put a card where the cursor is; the cursor goes on after it, or into a new quote. */
  const insert = (block: PageBlock) => {
    const { blocks, inserted } = insertAt(page.blocks, cursor, block);
    // A block with words of its own takes the cursor; a card, a divider, gives it to the words after.
    const own = block.type === "quote" || block.type === "callout" || block.type === "heading" || block.type === "check";
    const focus: FocusAsk = own
      ? { index: inserted, at: "end", field: block.type === "heading" || block.type === "check" ? "input" : undefined }
      : { index: inserted + 1, at: "start" };
    if (commit({ ...page, blocks }, focus)) setCursor(own ? null : { index: inserted + 1, start: 0, end: 0 });
  };

  /** Give the cursor to a block already on the page: the empty quote, when Quote is tapped again. */
  const focusBlock = (index: number, field?: "input") => {
    focusAsk.current = { index, at: "end", field, cursor: isWriting() };
    setFocusTick((n) => n + 1);
    setCursor(null);
  };

  /**
   * Bring a card already on the page into view and light it for a moment: the
   * verse asked for a second time. The finder that asked shuts with the
   * cursor in it, so a reader who was writing goes on in the words after the
   * card: until build 95 the cursor went nowhere, and on a phone the keyboard
   * fell (note 6, "it's buggy when it pops up").
   */
  const show = (index: number) => {
    setNoticed(index);
    document.querySelector(`[data-journal-composer] [data-page-block="${index}"]`)?.scrollIntoView({ block: "nearest" });
    const after = page.blocks.findIndex((b, i) => i > index && b.type === "text");
    if (after >= 0 && isWriting()) {
      focusAsk.current = { index: after, at: "start", cursor: true };
      setFocusTick((n) => n + 1);
    }
  };

  /**
   * A panel shut by its own tool. Verse's finder holds the cursor while it
   * is open: shut, it gives the cursor back to the words it was taken from,
   * so the keyboard stays as it is. A reader who was not writing has no
   * cursor to give back.
   */
  const shutPanel = () => {
    if (panel === "verse" && cursor && isWriting()) {
      focusAsk.current = { index: cursor.index, at: "end", cursor: true };
      setFocusTick((n) => n + 1);
    }
    setPanel(null);
  };

  const remove = (index: number) => {
    const blocks = removeAt(page.blocks, index);
    const focusAt = Math.min(Math.max(0, index - 1), blocks.length - 1);
    commit({ ...page, blocks }, blocks[focusAt]?.type === "text" ? { index: focusAt, at: "end" } : undefined);
    setCursor(null);
  };

  /** The text block a colour goes on, or none while nothing is written (lib/journal/page.ts). */
  const colorTarget = (): number | null => highlightTarget(page.blocks, cursor?.index);

  const setColor = (index: number, color: string | null) => {
    const b = page.blocks[index];
    if (!b || b.type !== "text") return;
    const next: PageBlock = color ? { type: "text", text: b.text, color } : { type: "text", text: b.text };
    const blocks = tidyBlocks(page.blocks.map((x, i) => (i === index ? next : x)));
    // Two neighbours in one colour become one block: the cursor's index may have moved.
    if (blocks.length !== page.blocks.length) setCursor(null);
    commit({ ...page, blocks });
  };

  return { page, setCursor, setTitle, setNotebook, setTags, setStyle, setCover, setBlock, insert, remove, focusBlock, show, noticed, colorTarget, setColor, panel, setPanel, shutPanel };
}

export type PageEditor = ReturnType<typeof usePage>;
