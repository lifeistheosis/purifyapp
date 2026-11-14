/**
 * A field in a sheet while the on-screen keyboard comes (build 97 note 2, the
 * owner: "and it's a jump and a flash for the typing bug").
 *
 * Measured at 390 by 844 with the keyboard stood in as the Android app's is
 * (the safe-area plugin pads the window for it, so the web view itself grows
 * 300px shorter), on a journal page with a cover: the field stood at 476. The
 * sheet scrolled 59px to bring the line being written above its foot, and a
 * frame later Android's WebView scrolled the field's whole box into view as
 * well (Chromium's scrollFocusedEditableNodeIntoView, which centres a field
 * partly or wholly hidden in every scroller it is in): 200px more, so the page
 * jumped and the cover left the screen in one frame. A page's last field is
 * 30 percent of the screen, so it is nearly always partly under the keyboard,
 * and the WebView moved it on nearly every tap. Every sheet with a field in
 * its body met the same scroll (lib/ui/useDraggableSheet.ts runs this for all
 * of them).
 *
 * So, for a moment after a field in a sheet's body takes the focus, and after
 * each resize the keyboard makes, the body keeps the scroll it had, moved only
 * as far as the line being written needs to stand above the sheet's foot
 * (lib/journal/writingLine.ts); any other scroll is put back before it is
 * drawn. A finger on the body lets go at once: the reader's own scroll is never
 * fought. Typing past the foot keeps the line above it, as the journal did
 * alone until now (build 95 note 6).
 */
import { scrollForWritingLine, type WritingLine } from "@/lib/journal/writingLine";
import { takesTyping } from "@/lib/ui/keyboardFlag";

/** How long after a field takes the focus a scroll that is not the reader's is put back. */
export const HOLD_AFTER_FOCUS_MS = 1500;
/** And after each resize while it has it (the keyboard coming or going). */
export const HOLD_AFTER_RESIZE_MS = 700;

/**
 * The scroll a sheet's body keeps while the keyboard comes: where it stood
 * (`anchor`), moved only as far as the line being written needs. `line` is
 * measured with the body at `scrollTop`, wherever anything else has put it.
 */
export function keptScroll(anchor: number, scrollTop: number, line: Omit<WritingLine, "room">): number {
  const d = scrollTop - anchor;
  return anchor + scrollForWritingLine({ ...line, fieldTop: line.fieldTop + d, fieldBottom: line.fieldBottom + d });
}

/**
 * How tall a field's words are up to the cursor, at the field's own width and
 * type: measured on a twin of it with no height of its own, laid over nothing
 * and gone in the same breath. The field itself is as tall as it was made (30
 * percent of the screen for a journal page's last), which says nothing of
 * where its words end, or of where in them the cursor is.
 */
export function wordsHeightOf(el: HTMLTextAreaElement, upTo: number = el.value.length): number {
  const parent = el.parentElement;
  if (!parent) return el.offsetHeight;
  const twin = el.cloneNode() as HTMLTextAreaElement;
  twin.value = el.value.slice(0, upTo);
  twin.rows = 1;
  twin.tabIndex = -1;
  twin.setAttribute("aria-hidden", "true");
  twin.removeAttribute("placeholder");
  Object.assign(twin.style, { position: "absolute", top: "0", insetInlineStart: "0", width: `${el.clientWidth}px`, height: "0px", minHeight: "0px", visibility: "hidden", pointerEvents: "none" });
  parent.appendChild(twin);
  const height = twin.scrollHeight;
  twin.remove();
  return height;
}

/**
 * How tall a sheet that stands on the keyboard (Sheet `keyboard`) is held as
 * the keyboard comes, or null to let it rise to its cap as before. For the
 * living's sheet is 733px, taller than the 544 a 300px keyboard leaves at 390
 * by 844, so its edge rose from 110.6 to 12.8 in one frame and the name field
 * from 266 to 168.5 (build 97, the sheets' rest). Now its edge stays where it
 * stood while the line being written still shows under it, by the same rule
 * the body keeps (scrollForWritingLine): the panel ends at the keyboard and its
 * body scrolls. It rides up only when the field would be covered.
 *
 * `height` is the panel at rest before the keyboard, `rise` how far the
 * keyboard moved the foot up; the field is measured from the panel's top edge,
 * `under` is what stands under the body (a foot row, the panel's padding).
 */
export function heldHeight({ height, rise, fieldTop, fieldBottom, wordsHeight, under }: { height: number; rise: number; fieldTop: number; fieldBottom: number; wordsHeight: number; under: number }): number | null {
  const held = height - rise;
  return scrollForWritingLine({ fieldTop, fieldBottom, wordsHeight, scrollerBottom: held - under }) === 0 ? held : null;
}

/** Keep a sheet's body still while the keyboard comes. Returns the way to stop. */
export function holdFieldOnKeyboard(body: HTMLElement): () => void {
  const vv = window.visualViewport;
  let anchor = body.scrollTop;
  let until = 0;
  let finger = false;

  const field = (): HTMLTextAreaElement | HTMLInputElement | null => {
    const el = document.activeElement;
    return (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) && takesTyping(el) && body.contains(el) ? el : null;
  };
  const lineOf = (el: HTMLTextAreaElement | HTMLInputElement) => {
    const box = el.getBoundingClientRect();
    return {
      fieldTop: box.top,
      fieldBottom: box.bottom,
      wordsHeight: el instanceof HTMLTextAreaElement ? wordsHeightOf(el, el.selectionEnd) : box.height,
      // The body's foot, or the keyboard's top where it lies over the page (a phone's browser).
      scrollerBottom: Math.min(body.getBoundingClientRect().bottom, vv ? vv.offsetTop + vv.height : window.innerHeight),
    };
  };
  const holding = () => !finger && performance.now() <= until;
  const apply = () => {
    const el = field();
    if (!el || !holding()) return;
    const want = Math.min(keptScroll(anchor, body.scrollTop, lineOf(el)), body.scrollHeight - body.clientHeight);
    if (Math.abs(body.scrollTop - want) >= 1) body.scrollTop = want;
  };

  const onFocus = () => {
    if (!field()) return;
    if (!holding()) anchor = body.scrollTop;
    until = performance.now() + HOLD_AFTER_FOCUS_MS;
    apply();
  };
  const onResize = () => {
    if (!field() || finger) return;
    until = Math.max(until, performance.now() + HOLD_AFTER_RESIZE_MS);
    apply();
  };
  const onInput = (e: Event) => {
    const el = field();
    if (!el || e.target !== el) return;
    const below = scrollForWritingLine(lineOf(el));
    if (below > 0) body.scrollTop += below;
    anchor = body.scrollTop;
  };
  const onScroll = () => {
    if (holding() && field()) apply();
    else anchor = body.scrollTop;
  };
  const down = () => {
    finger = true;
    until = 0;
  };
  const up = () => {
    finger = false;
    anchor = body.scrollTop;
  };

  document.addEventListener("focusin", onFocus);
  document.addEventListener("input", onInput);
  vv?.addEventListener("resize", onResize);
  window.addEventListener("resize", onResize);
  body.addEventListener("scroll", onScroll, { passive: true });
  body.addEventListener("touchstart", down, { passive: true });
  body.addEventListener("wheel", down, { passive: true });
  body.addEventListener("touchend", up, { passive: true });
  body.addEventListener("touchcancel", up, { passive: true });
  return () => {
    document.removeEventListener("focusin", onFocus);
    document.removeEventListener("input", onInput);
    vv?.removeEventListener("resize", onResize);
    window.removeEventListener("resize", onResize);
    body.removeEventListener("scroll", onScroll);
    body.removeEventListener("touchstart", down);
    body.removeEventListener("wheel", down);
    body.removeEventListener("touchend", up);
    body.removeEventListener("touchcancel", up);
  };
}
