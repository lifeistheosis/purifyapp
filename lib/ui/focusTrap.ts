/**
 * The keyboard contract for a modal dialog, with the arithmetic pulled out.
 *
 * `aria-modal="true"` is a PROMISE that everything outside the dialog is
 * inert. A dialog that sets it without trapping Tab is worse than one that
 * sets neither: a screen reader stops announcing the page behind it while the
 * keyboard walks straight out into it, so the operator is tabbing through
 * controls their reader will not read.
 *
 * The wrap arithmetic lives here rather than inline because vitest runs in a
 * node environment with no DOM, so a function touching `document` cannot be
 * tested and one doing index maths can. That split is the only reason this is
 * two exports instead of one.
 */

/**
 * What counts as a tab stop. `[tabindex]:not([tabindex="-1"])` catches the
 * roving-tabindex widgets; `details > summary` and `audio[controls]` are here
 * because the shop's media panels use both.
 */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "audio[controls]",
  "video[controls]",
  "details > summary",
  "[contenteditable]:not([contenteditable=false])",
].join(",");

/**
 * The tab stops inside `root`, in document order.
 *
 * Filters two things the selector cannot. `aria-hidden` subtrees are removed
 * because a reader will not announce them, so tabbing into one strands the
 * operator on a control that reads as nothing. Zero-size elements are removed
 * because a collapsed panel keeps its buttons in the DOM, and a Tab that lands
 * on something with no box looks to the operator like focus vanished.
 */
export function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}

/**
 * Where Tab should go, given where it is.
 *
 * `current` is -1 when focus is not on any stop in the list, which happens on
 * the very first Tab after the dialog focused its own panel. Forward from
 * there is the first stop and backward is the last, which is what makes
 * Shift+Tab out of a freshly opened dialog land on its Close button rather
 * than escaping to the page behind it.
 */
export function nextIndex(count: number, current: number, back: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return back ? count - 1 : 0;
  return back ? (current - 1 + count) % count : (current + 1) % count;
}
