// Quote in journal (1.9, docs/1.9-build/JOURNAL.md, "quoting anything"): the
// words a reader holds, on a prayer, a saint's life, a Father's work, a chant,
// or a verse from its focus, land on the page they are writing, with their
// source filled in and a way back to it.
//
// The page being written is the journal's kept draft (lib/journal/entries.ts,
// purify:journal.draft): the quote goes at its end, so a reader gathering
// lines for one page gathers them onto one page. With no draft, it begins a
// new page. A draft that is a verse's note is words alone, kept on its verse,
// and takes no card: the quote begins a new page in its place. Then the
// journal opens on that page (`JOURNAL_OPEN_KEY`, read by JournalClient).
//
// Scripture is everyone's; the rest of the library is Plus's, and the places
// that offer Quote in journal show it with the Plus mark (lib/journal/
// libraryPlaces.ts). Nothing here grants or checks Plus.

import { clearDraft, MAX_BODY, readDraft, writeDraft, type JournalDraft } from "./entries";
import { parsePage, serializePage, tidyBlocks, type Page, type PageBlock } from "./page";

/** Set as a quote is laid, read and cleared by the journal as it opens: open the page being written. */
export const JOURNAL_OPEN_KEY = "purify:journal.open";

/** The draft with `block` at the end of its page, or a new page holding it. Null when the page would grow past the server's limit. */
export function draftWithQuote(kept: JournalDraft | null, block: PageBlock): JournalDraft | null {
  const usable = kept && !kept.editing?.startsWith("note:") ? kept : null;
  const page: Page = usable ? parsePage(usable.body) : { title: "", blocks: [] };
  // The quote after the words, and a line after it to write on.
  const blocks = tidyBlocks([...page.blocks.filter((b) => b.type !== "text" || b.text.trim()), block]);
  // The whole page goes back with its quote: its notebook, its tags, its style
  // and its cover are the writer's own choices, and were dropped here until
  // 2026-11-11 (the page was written back as a title and blocks alone).
  const body = serializePage({ ...page, blocks });
  if (body.length > MAX_BODY) return null;
  return usable ? { ...usable, body } : { kind: "reflection", body };
}

/** Lay the quote on the page being written, and ask the journal to open on it. True when it was laid. */
export function quoteInJournal(block: PageBlock): boolean {
  if (typeof window === "undefined") return false;
  const next = draftWithQuote(readDraft(), block);
  if (!next) return false;
  if (!next.body.trim()) clearDraft();
  else writeDraft(next);
  try {
    window.sessionStorage.setItem(JOURNAL_OPEN_KEY, "1");
  } catch {
    /* the journal opens on its list; Write goes on with the page */
  }
  return true;
}

/** Read once, as the journal opens: should it open the page being written? */
export function takeJournalOpen(): boolean {
  try {
    const ask = window.sessionStorage.getItem(JOURNAL_OPEN_KEY) === "1";
    window.sessionStorage.removeItem(JOURNAL_OPEN_KEY);
    return ask;
  } catch {
    return false;
  }
}
