/**
 * Whether the reader is writing now: a field of the writing sheet, or of the
 * tools at its foot, holds the cursor.
 *
 * The owner on 2026-11-13, of the journal (build 95 note 6): "whenever you
 * click on a different section in the journal UI the typing pad pops up
 * automatically and it's buggy when it pops up". The sheet gave the cursor
 * to a field on its own: a third of a second after it opened, when Verse
 * opened its finder, when Quote or one of More's blocks laid a card. Each
 * brought the keyboard up with no tap in a place to write.
 *
 * The rule now: the keyboard comes only from the reader's own tap where they
 * write. The sheet may move a cursor the reader already has (Quote tapped
 * while writing goes on in the quote, and the keyboard stays as it is); it
 * never gives one to a reader who has none.
 */

type Field = { tagName: string; type?: string; closest: (selector: string) => unknown };

/** Fields that are not for words: a tap on one brings no keyboard. */
const NOT_WORDS = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"]);

export function isWriting(doc: { activeElement: unknown } | null = typeof document === "undefined" ? null : document): boolean {
  const el = (doc?.activeElement ?? null) as Field | null;
  if (!el || typeof el.closest !== "function") return false;
  const words = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !NOT_WORDS.has((el.type ?? "text").toLowerCase()));
  return words && !!el.closest("[data-journal-composer], [data-page-toolbar]");
}
