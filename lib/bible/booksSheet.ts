// The one way a chapter opens its books sheet (1.8, the owner's pick A of
// r3-20, "Straight into the book"). The Bible tab is the chapter now, and the
// books are chosen from the chapter itself: its title and the name on its
// pill open one sheet (components/bible/MobileChapterSheet.tsx). The •••
// sheet had a Book row for it too until the owner's note 82 of build 86.
//
// The pill holds the sheet, as it always has; the title is drawn by the
// screen, in another part of the tree, so it asks for the sheet with an
// event on window, as the search is opened (lib/search/open.ts).

//
// From build 98 note 7 (the owner, 2026-11-15: "incorporate the change Bible
// version with this screen") the sheet also carries the version being read,
// at its head by the chapter, and turns to the versions; the line under the
// chapter's title (TitleTranslation) opens it there, so there is one sheet.

/** Dispatched on window to open the books sheet over the chapter. */
export const BOOKS_OPEN_EVENT = "purify:bible-books-open";

/** What the sheet shows: the books, or the versions of the Bible. */
export type BooksView = "books" | "versions";

/**
 * Open the books sheet over the chapter on the screen, on its versions when
 * asked. The title hands its click here as it is, so anything but "versions"
 * opens the books.
 */
export function openBooks(view?: unknown): void {
  if (typeof window === "undefined") return;
  const detail: { view: BooksView } = {
    view: view === "versions" ? "versions" : "books",
  };
  window.dispatchEvent(new CustomEvent(BOOKS_OPEN_EVENT, { detail }));
}

/** The view an opening asked for. */
export function booksViewOf(e: Event): BooksView {
  return (e as CustomEvent<{ view?: unknown } | null>).detail?.view ===
    "versions"
    ? "versions"
    : "books";
}

// The licensed translations the website has keys for, as the chapter's page
// hands them to the line under its title (TitleTranslation, which writes them
// here). The pill holds the sheet and is not given them; the sheet reads them
// when it opens, so its version and its rows are the line's.
let configured: readonly string[] = [];

/** The chapter's licensed translations with keys, from the line under its title. */
export function setConfiguredTranslations(list: readonly string[]): void {
  configured = list;
}

/** The licensed translations with keys the chapter was given. */
export function configuredTranslations(): readonly string[] {
  return configured;
}
