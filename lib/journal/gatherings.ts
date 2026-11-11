// The Florilegium and the journal's notebooks as one (1.9, build 93 note 19,
// the owner on 2026-11-11: "I want the Florigelium and the notebook system
// like intertwined").
//
// They met nowhere. A notebook was only a name written on pages; a gathering
// was its own list of lines. They are joined by that name: a gathering's
// notebook is the notebook that bears its name. A page put in it is one of
// the gathering's pages, and the gathering's page shows them under its
// lines; a gathered line can begin a page there, as its card.
//
// Nothing new is kept anywhere. A page still keeps its notebook's name in its
// own text (lib/journal/page.ts), a gathering is still its list
// (lib/florilegium/florilegium.ts), and both travel as they did: no new
// column, no new table, nothing new on the server.
//
// Pure: no React, no storage. lib/journal/__tests__/gatherings.test.ts holds
// it.

import { itemSource } from "@/lib/florilegium/asText";
import type { FlorilegiumItem } from "@/lib/florilegium/florilegium";

import type { JournalDraft, JournalKind, JournalRecord } from "./entries";
import { cleanNotebook, libraryBlock, pageText, parsePage, serializePage, tidyBlocks, verseAt, verseBlock, type Page, type PageBlock } from "./page";

/** A gathering's name as a page keeps it for its notebook: one line, within a notebook's length. */
export function gatheringNotebook(title: string): string {
  return cleanNotebook(title);
}

/** Two names for one notebook: the same once tidied, whatever their capitals. An empty name is no notebook. */
export function sameNotebook(a: string | undefined, b: string | undefined): boolean {
  const x = cleanNotebook(a).toLocaleLowerCase();
  return x.length > 0 && x === cleanNotebook(b).toLocaleLowerCase();
}

/** A journal page as a gathering's page lists it. */
export type GatheringPage = {
  /** The record's id: what the journal opens. */
  id: string;
  kind: JournalKind;
  /** The page's own title, or none. */
  title: string;
  /** Its words, as the journal's list reads them: the writer's, with a card named by what it is. */
  words: string;
  /** When it was written (ISO). */
  at: string;
};

/**
 * The journal's pages in a gathering: those whose notebook bears its name,
 * newest first. A page that was removed is not one of them.
 */
export function pagesIn(title: string, records: readonly JournalRecord[], verseLabel: (b: Extract<PageBlock, { type: "verse" }>) => string): GatheringPage[] {
  const out: GatheringPage[] = [];
  for (const r of records) {
    if (r.deletedAt) continue;
    const page = parsePage(r.body);
    if (!sameNotebook(page.notebook, title)) continue;
    out.push({ id: r.id, kind: r.kind, title: page.title, words: pageText(page, verseLabel), at: r.createdAt });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/**
 * A gathered line as a card on a journal page. A verse is a verse card: only
 * where it is, its words from the app's own Bible. A Father's line gathered
 * from a place in the app is a quote from the library, with that place as
 * its way back. One gathered with no place to return to is a quote with its
 * source named, and never wears the library's mark.
 */
export function lineBlock(item: FlorilegiumItem): PageBlock | null {
  if (item.kind === "scripture") return verseBlock(item.book, item.chapter, item.verse);
  const text = item.text?.trim();
  if (!text) return null;
  return (item.href ? libraryBlock(text, itemSource(item), item.href) : null) ?? { type: "quote", text, by: itemSource(item) };
}

/**
 * Is this the page being written in the gathering: a new page, not yet kept,
 * in the gathering's notebook? An entry being changed and a verse's note are
 * kept things, never taken for it; nor is a page begun somewhere else.
 */
export function writingIn(waiting: JournalDraft | null, title: string): boolean {
  return !!waiting && !waiting.editing && sameNotebook(parsePage(waiting.body).notebook, title);
}

/** Is this card on the page already? A gathered line is laid once, as a verse is (lib/journal/page.ts, verseAt). */
function hasCard(blocks: readonly PageBlock[], block: PageBlock): boolean {
  if (block.type === "verse") return verseAt(blocks, block) >= 0;
  const same = JSON.stringify(block);
  return blocks.some((b) => JSON.stringify(b) === same);
}

/**
 * The page a reader writes in a gathering: the page being written there when
 * there is one (`writingIn`), or a new one in the gathering's notebook. A card
 * goes at its end, as Quote in journal lays one (lib/journal/
 * quoteInJournal.ts), and only once.
 *
 * Anything else that waits is another page. It is not taken for this one and
 * is not written over: the device's side keeps it first, as Done keeps it
 * (lib/journal/gatheringActions.ts, lib/journal/waiting.ts). Null when the
 * page would grow past the server's limit.
 */
export function draftInGathering(waiting: JournalDraft | null, title: string, block: PageBlock | null, maxBody: number): JournalDraft | null {
  const usable = waiting && writingIn(waiting, title) ? waiting : null;
  const page: Page = usable ? parsePage(usable.body) : { title: "", blocks: [] };
  const blocks = block && !hasCard(page.blocks, block) ? tidyBlocks([...page.blocks.filter((b) => b.type !== "text" || b.text.trim()), block]) : tidyBlocks(page.blocks);
  const body = serializePage({ ...page, blocks, notebook: cleanNotebook(page.notebook) || gatheringNotebook(title) });
  if (body.length > maxBody) return null;
  return usable ? { ...usable, body } : { kind: "reflection", body };
}

/** A notebook a page is offered: its name, and whether it is one of the reader's gatherings. */
export type NotebookChoice = { name: string; gathering: boolean };

/**
 * The notebooks a page is offered: the reader's gatherings by name first, then
 * the other notebooks their pages name. The page's own is left out, and no
 * name is offered twice: a notebook that bears a gathering's name is that
 * gathering's.
 */
export function notebookChoices(gatherings: readonly string[], notebooks: readonly string[], current: string | undefined, most = 12): NotebookChoice[] {
  const out: NotebookChoice[] = [];
  const offer = (raw: string, gathering: boolean) => {
    const name = cleanNotebook(raw);
    if (!name || sameNotebook(name, current) || out.some((o) => sameNotebook(o.name, name))) return;
    out.push({ name, gathering });
  };
  for (const g of gatherings) offer(g, true);
  for (const n of notebooks) offer(n, false);
  return out.slice(0, most);
}

/** The gathering whose notebook this is, if it is one. */
export function gatheringOf<G extends { name: string }>(notebook: string | null | undefined, gatherings: readonly G[]): G | undefined {
  return notebook ? gatherings.find((g) => sameNotebook(g.name, notebook)) : undefined;
}

/**
 * Every page of one notebook moved to another name: a gathering renamed
 * takes its pages with it. Returns the records changed, each with its body
 * rewritten and nothing else touched; an empty list when none bore the name.
 */
export function renameNotebook(records: readonly JournalRecord[], from: string, to: string): JournalRecord[] {
  const next = gatheringNotebook(to);
  if (!next || sameNotebook(from, to)) return [];
  const out: JournalRecord[] = [];
  for (const r of records) {
    if (r.deletedAt) continue;
    const page = parsePage(r.body);
    if (!sameNotebook(page.notebook, from)) continue;
    out.push({ ...r, body: serializePage({ ...page, notebook: next }) });
  }
  return out;
}
