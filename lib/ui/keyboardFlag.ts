/**
 * Whether one of the app's own fields has the on-screen keyboard, said on the
 * page as html[data-keyboard="up"] (build 95, with note 14; found by the
 * Fable chat on the journal's list, 2026-11-13).
 *
 * Nothing fixed at the foot of the screen stands over that keyboard: the tab
 * bar, the player, the toasts, the reader's pills and the bars marked
 * data-foot-bar step away while the flag is up (app/globals.css, "The
 * reader's own keyboard"). On Android the app's web view is made as tall as
 * what the keyboard leaves (the safe-area plugin pads the window for a
 * keyboard one of the page's fields asked for), so a bar fixed at the foot
 * rode up on the keyboard and covered the field being typed in. On an iPhone
 * the keyboard is laid over the page, and the bars sat under it or showed
 * through as the page moved under the finger. Either way the keyboard shows
 * in the visual viewport, measured against the tallest it has been
 * (lib/ui/viewport.ts, keyboardCovers).
 *
 * Up when a field that takes typing has the focus and a keyboard covers the
 * foot; down only once the keyboard has gone, so a field let go of while the
 * keyboard is still leaving does not bring the bars back over it for the
 * moment it takes to go. A hardware keyboard covers nothing, so the bars stay.
 */

import { keyboardCovers } from "./viewport";

export const KEYBOARD_FLAG = "data-keyboard";

/** A field that takes typing: what the on-screen keyboard comes up for. */
export function takesTyping(el: Element | null): boolean {
  if (!el) return false;
  if ((el as HTMLElement).isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA") return !(el as HTMLTextAreaElement).readOnly;
  if (tag !== "INPUT") return false;
  const input = el as HTMLInputElement;
  if (input.readOnly || input.disabled) return false;
  return /^(text|search|email|url|tel|password|number)$/.test(input.type || "text");
}

/** The parts of a window this reads: kept small, so a test can stand one in. */
export type KeyboardWindow = {
  innerHeight: number;
  visualViewport: Pick<VisualViewport, "width" | "height" | "offsetTop" | "scale" | "addEventListener" | "removeEventListener"> | null;
  document: {
    activeElement: Element | null;
    documentElement: Pick<HTMLElement, "setAttribute" | "removeAttribute">;
    addEventListener: (type: string, fn: () => void, capture?: boolean) => void;
    removeEventListener: (type: string, fn: () => void, capture?: boolean) => void;
  };
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

/** Keep the flag with the keyboard. Returns the way to stop, which takes the flag down. */
export function followKeyboard(win: KeyboardWindow = window as unknown as KeyboardWindow): () => void {
  const vv = win.visualViewport;
  const root = win.document.documentElement;
  if (!vv) return () => {};
  let up = false;
  const check = () => {
    // A pinch zoom moves the visual viewport too: the reader's own doing, not a keyboard.
    if (Math.abs(vv.scale - 1) > 0.01) return;
    const covers = keyboardCovers(Math.round(vv.width), Math.round(vv.height), Math.round(vv.offsetTop), win.innerHeight);
    const next = covers && (up || takesTyping(win.document.activeElement));
    if (next === up) return;
    up = next;
    if (up) root.setAttribute(KEYBOARD_FLAG, "up");
    else root.removeAttribute(KEYBOARD_FLAG);
  };
  vv.addEventListener("resize", check);
  vv.addEventListener("scroll", check);
  win.addEventListener("resize", check);
  win.document.addEventListener("focusin", check, true);
  check();
  return () => {
    vv.removeEventListener("resize", check);
    vv.removeEventListener("scroll", check);
    win.removeEventListener("resize", check);
    win.document.removeEventListener("focusin", check, true);
    root.removeAttribute(KEYBOARD_FLAG);
  };
}
