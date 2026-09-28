"use client";

// Records how the reader last reached for the page, as html[data-input]:
// "pointer" after a mouse click or a tap, "keyboard" after a key that moves
// or acts. globals.css hides the focus ring in pointer mode (outside text
// fields), so a click never leaves a ring behind and keyboard users always
// get one.
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

export function InputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const set = (mode: "pointer" | "keyboard") => {
      if (root.dataset.input !== mode) root.dataset.input = mode;
    };
    const onPointer = () => set("pointer");
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
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
