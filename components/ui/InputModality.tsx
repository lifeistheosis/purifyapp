"use client";

// Records how the reader last reached for the page, as html[data-input]:
// "pointer" after a mouse click or a tap, "keyboard" after a key that moves
// or acts. globals.css hides the focus ring in pointer mode (outside text
// fields), so a click never leaves a ring behind and keyboard users always
// get one. The page starts in pointer mode (app/layout.tsx): before the
// reader has reached for it at all, a field the page focuses by itself is not
// keyboard use, and shows the quiet edge (build 89 note 11); the first key
// that moves sets keyboard mode, as ever.
//
// Needed because the browser's own :focus-visible guess is wrong in one case
// this site hits constantly: after a click navigates, Next's router focuses
// the new page from script, and the browser may treat that as keyboard focus.
// The owner saw the result on 2026-09-27 as "a red circle appears when you
// click on things".
//
// Mounted once in the root layout. Renders nothing.

import { useEffect } from "react";

// Typing letters into a field is not moving focus, so it does not switch the
// page into keyboard mode; these keys do.
const NAV_KEYS = new Set([
  "Tab",
  "Enter",
  " ",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/** A place the reader types: a text field, a text area, a select, or editable text. */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !["checkbox", "radio", "range", "button", "submit", "reset", "color", "file"].includes(target.type);
}

export function InputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const set = (mode: "pointer" | "keyboard") => {
      if (root.dataset.input !== mode) root.dataset.input = mode;
    };
    const onPointer = () => set("pointer");
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // In a field, a space, Enter, the arrows, Home and End are typing and
      // moving the caret, not reaching for the page: only Tab and Escape
      // leave a field. A space used to bring the keyboard's ring back round
      // the field mid-word (build 89 note 11: "a white box ... appears").
      if (e.key !== "Tab" && e.key !== "Escape" && isEditable(e.target)) return;
      if (NAV_KEYS.has(e.key)) set("keyboard");
    };
    window.addEventListener("pointerdown", onPointer, { capture: true, passive: true });
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onPointer, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, []);
  return null;
}
