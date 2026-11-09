// Sharing a journal page (1.9, docs/1.9-build/JOURNAL.md, step 3: "sharing a
// page, one at a time, three a month", and "sharing, safely").
//
// What a shared page is: a COPY of the page as it stood when it was shared,
// made public at an unlisted link (/p/<id>), kept out of search engines until
// it is reviewed, with Report on it, and marked as a reader's page made with
// Purify, so Purify's name is never lent to an unreviewed page. The page
// itself stays the reader's, on their device.
//
// What the copy keeps, and leaves behind, is decided here, before it leaves
// the device and again on the server (app/api/journal/share):
//   - the title, the words, Scripture's cards, one's own quotes, Plus's
//     blocks, the style and the cover: what the reader chose to show;
//   - NOT the notebook or the tags: how a reader files their pages is theirs;
//   - a quote from the library goes as a plain quote, cited by its page, and
//     WITHOUT the library's mark: nothing yet checks a copy's words against
//     the page they came from, and a page's text can be edited by hand in an
//     older build, so a public page never claims "Quoted from Purify's
//     library" for words nobody checked.
//
// Pure, for the route, the page and the tests alike.

import { pageIsEmpty, parsePage, serializePage, TITLE_MAX, type Page } from "./page";

/** Shares a reader without Plus makes in a calendar month (Claude's recommendation, standing; his to move on item 12's numbers). */
export const SHARE_LIMIT_FREE = 3;

/**
 * Shares one account may make in a day, with Plus or without: a guard against
 * abuse, far above what any reader shares (Plus promises sharing without a
 * monthly limit, and keeps it). Fable's release check 1, M3.
 */
export const SHARE_DAILY_CAP = 50;

/**
 * The verse cards of a shared page whose words are fetched for a view: the
 * first this many. A card after them shows its reference, linked to the
 * verse, as a card whose words could not be had does. A page's text may
 * hold some hundreds of cards, and each is a read on every view (Fable's
 * release check 1, M3); none is ever cut from the page.
 */
export const SHARED_VERSE_CARDS = 20;

/** The page as it may be shown in public, or null when there is nothing in it to show. */
export function publicPage(body: string): Page | null {
  const page = parsePage(body);
  const out: Page = {
    title: page.title,
    blocks: page.blocks.map((b) => (b.type === "library" ? { type: "quote" as const, text: b.text, by: b.cite } : b)),
  };
  if (page.style) out.style = page.style;
  if (page.cover) out.cover = page.cover;
  return pageIsEmpty(out) ? null : out;
}

/** The copy kept for a share: the public page, as text. */
export function publicBody(body: string): string | null {
  const page = publicPage(body);
  return page ? serializePage(page) : null;
}

/** A shared page's name: its title, else its first words. */
export function shareTitle(page: Page): string {
  if (page.title.trim()) return page.title.trim();
  const first = page.blocks.find((b) => (b.type === "text" || b.type === "heading" || b.type === "quote" || b.type === "callout") && b.text.trim());
  const words = first && "text" in first ? first.text.replace(/\s+/g, " ").trim() : "";
  return Array.from(words).slice(0, TITLE_MAX).join("");
}

/** The first moment of the calendar month `now` is in, in UTC: the month a share is counted in. */
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Shares left this month for a reader without Plus, never below none. */
export function sharesLeft(usedThisMonth: number): number {
  return Math.max(0, SHARE_LIMIT_FREE - Math.max(0, usedThisMonth));
}
