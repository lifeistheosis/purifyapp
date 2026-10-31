// The one way a chapter opens its books sheet (1.8, the owner's pick A of
// r3-20, "Straight into the book"). The Bible tab is the chapter now, and the
// books are chosen from the chapter itself: its title, the name on its pill,
// and the ••• sheet's Book row all open one sheet (components/bible/
// MobileChapterSheet.tsx).
//
// The pill holds the sheet, as it always has; the title is drawn by the
// screen, in another part of the tree, so it asks for the sheet with an
// event on window, as the search is opened (lib/search/open.ts).

/** Dispatched on window to open the books sheet over the chapter. */
export const BOOKS_OPEN_EVENT = "purify:bible-books-open";

/** Open the books sheet over the chapter on the screen. */
export function openBooks(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BOOKS_OPEN_EVENT));
}
