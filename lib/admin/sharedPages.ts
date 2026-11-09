/**
 * Shared journal pages, moderated (1.9, admin item A1). A reader can share a
 * page at /p/<id> (supabase/migrations/20261109180246_shared_pages.sql,
 * lib/journal/share.ts); other readers can report one; and a page is kept out of search engines
 * until it has been reviewed (app/(app)/p/[id]/page.tsx reads `reviewed`).
 * Nothing in the admin read the reports or set a page reviewed until this.
 *
 * Two places, one rule each:
 *
 *   Community > Waiting   a reported page joins the one queue of everything
 *                         that waits for a decision (lib/admin/communityQueue.ts),
 *                         one row a page however many reports name it. "Hide
 *                         the page" takes it down (the link then shows
 *                         nothing); "Keep it" marks it reviewed, which is the
 *                         decision that it may stand, and so also lets search
 *                         engines show it. A report filed after that puts it
 *                         back in the queue.
 *   Community > Shared    every share by its state, to review the ones nobody
 *                         reported (let search engines show it, or not), and
 *                         to put a hidden page back.
 *
 * The page's owner is never shown: the public page names nobody, and a
 * decision about a person belongs on their card in Users.
 *
 * Pure. Tested in lib/admin/__tests__/sharedPages.test.ts.
 */

import { getBook } from "@/lib/bible/books";
import { pageText } from "@/lib/journal/page";
import { publicPage } from "@/lib/journal/share";

export type SharedReportIn = { reason: string | null; created_at: string };

/** A shared page as the admin reads it: the copy, its moments, and its reports. */
export type SharedPageIn = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  withdrawn_at: string | null;
  hidden_at: string | null;
  reviewed_at: string | null;
  reports: SharedReportIn[];
};

/** The columns to read for it, the reports joined. */
export const SHARED_PAGE_COLUMNS = "id, title, body, created_at, withdrawn_at, hidden_at, reviewed_at";

/** One key a page, as the queue keys everything it holds. */
export const sharedKey = (id: string) => `shared:${id}`;

const after = (a: string, b: string | null) => b === null || Date.parse(a) > Date.parse(b);

/** The reports filed since the page was last kept: all of them, when it never was. */
export function openReports(p: Pick<SharedPageIn, "reviewed_at" | "reports">): SharedReportIn[] {
  return p.reports.filter((r) => after(r.created_at, p.reviewed_at));
}

/** It waits for a decision: still up, and reported since it was last kept. */
export function waitsForDecision(p: Pick<SharedPageIn, "withdrawn_at" | "hidden_at" | "reviewed_at" | "reports">): boolean {
  return !p.withdrawn_at && !p.hidden_at && openReports(p).length > 0;
}

export type SharedState = "withdrawn" | "hidden" | "reported" | "reviewed" | "unreviewed";

/**
 * Where a share stands. Withdrawn first: the reader took it down, and nothing
 * the admin does can bring it back. Then hidden (by a decision here), then
 * waiting on reports, then reviewed or not.
 */
export function sharedState(p: Pick<SharedPageIn, "withdrawn_at" | "hidden_at" | "reviewed_at" | "reports">): SharedState {
  if (p.withdrawn_at) return "withdrawn";
  if (p.hidden_at) return "hidden";
  if (waitsForDecision(p)) return "reported";
  return p.reviewed_at ? "reviewed" : "unreviewed";
}

export const SHARED_STATE_WORDS: Record<SharedState, string> = {
  withdrawn: "Taken down by its writer",
  hidden: "Hidden",
  reported: "Reported",
  reviewed: "Reviewed: search engines may show it",
  unreviewed: "Not reviewed: kept out of search engines",
};

/** A verse card by its reference, as the admin reads it: "John 3:16-17". */
function verseRef(b: { book: string; chapter: number; from: number; to: number }): string {
  const name = getBook(b.book)?.name ?? b.book;
  return `${name} ${b.chapter}:${b.from}${b.to > b.from ? `-${b.to}` : ""}`;
}

/**
 * The page's words, as its public page shows them: the title, then the text,
 * a verse card by its reference. Cut at `max` characters.
 */
export function sharedWords(p: Pick<SharedPageIn, "title" | "body">, max = 1200): string {
  const page = publicPage(p.body);
  const title = (page?.title || p.title).trim();
  const words = page ? pageText(page, verseRef).trim() : "";
  const text = [title, words].filter(Boolean).join("\n");
  if (!text) return "Nothing on the page to show.";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
