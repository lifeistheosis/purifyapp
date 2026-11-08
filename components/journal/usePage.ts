"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { MAX_BODY } from "@/lib/journal/entries";
import { insertAt, parsePage, removeAt, serializePage, tidyBlocks, type Page, type PageBlock } from "@/lib/journal/page";

/** Where the cursor is: a text block's index and the selection in it. */
export type Cursor = { index: number; start: number; end: number };
type FocusAsk = { index: number; at: "start" | "end"; field?: "by" };

function fresh(body: string): Page {
  const page = parsePage(body);
  return { title: page.title, blocks: tidyBlocks(page.blocks) };
}

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
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPage(fresh(body));
  }

  // Where the cursor is, as state: the tools read it to know which paragraph
  // a colour goes on, while the page is drawn.
  const [cursor, setCursorState] = useState<Cursor | null>(null);
  const setCursor = useCallback((c: Cursor | null) => {
    setCursorState((was) => (was && c && was.index === c.index && was.start === c.start && was.end === c.end ? was : c));
  }, []);
  const focusAsk = useRef<FocusAsk | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const commit = useCallback(
    (next: Page, focus?: FocusAsk) => {
      const text = serializePage(next);
      if (text.length > MAX_BODY) return false;
      setPage(next);
      onBody(text);
      if (focus) {
        focusAsk.current = focus;
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
    const field = root?.querySelector<HTMLTextAreaElement | HTMLInputElement>(ask.field === "by" ? "input" : "textarea");
    if (!field) return;
    field.focus({ preventScroll: true });
    const at = ask.at === "start" ? 0 : field.value.length;
    field.setSelectionRange(at, at);
    field.scrollIntoView({ block: "nearest" });
  }, [focusTick]);

  const setTitle = (title: string) => commit({ ...page, title });

  const setBlock = (index: number, patch: Partial<PageBlock>) => {
    const blocks = page.blocks.map((b, i) => (i === index ? ({ ...b, ...patch } as PageBlock) : b));
    commit({ ...page, blocks });
  };

  /** Put a card where the cursor is; the cursor goes on after it, or into a new quote. */
  const insert = (block: PageBlock) => {
    const { blocks, inserted } = insertAt(page.blocks, cursor, block);
    const focus: FocusAsk = block.type === "quote" ? { index: inserted, at: "end" } : { index: inserted + 1, at: "start" };
    if (commit({ ...page, blocks }, focus)) setCursor(block.type === "quote" ? null : { index: inserted + 1, start: 0, end: 0 });
  };

  const remove = (index: number) => {
    const blocks = removeAt(page.blocks, index);
    const focusAt = Math.min(Math.max(0, index - 1), blocks.length - 1);
    commit({ ...page, blocks }, blocks[focusAt]?.type === "text" ? { index: focusAt, at: "end" } : undefined);
    setCursor(null);
  };

  /** The text block a colour goes on: the one the cursor is in, else the last with words. */
  const colorTarget = (): number | null => {
    const at = cursor?.index;
    if (at !== undefined && page.blocks[at]?.type === "text") return at;
    for (let i = page.blocks.length - 1; i >= 0; i--) {
      const b = page.blocks[i];
      if (b.type === "text" && b.text.trim()) return i;
    }
    return null;
  };

  const setColor = (index: number, color: string | null) => {
    const b = page.blocks[index];
    if (!b || b.type !== "text") return;
    const next: PageBlock = color ? { type: "text", text: b.text, color } : { type: "text", text: b.text };
    const blocks = tidyBlocks(page.blocks.map((x, i) => (i === index ? next : x)));
    // Two neighbours in one colour become one block: the cursor's index may have moved.
    if (blocks.length !== page.blocks.length) setCursor(null);
    commit({ ...page, blocks });
  };

  return { page, setCursor, setTitle, setBlock, insert, remove, colorTarget, setColor };
}

export type PageEditor = ReturnType<typeof usePage>;
