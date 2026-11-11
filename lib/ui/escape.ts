"use client";

// One press of Escape closes one thing: the sheet or the dialog that rose
// last.
//
// Every overlay used to listen on the window for itself, so every one of
// them heard the key. A sheet over a sheet closed both at one press: Escape
// over the Plus sheet took the journal's writing sheet with it, and the
// writer was back on the page with the sheet gone (the journal's walk,
// 2026-11-11, on an export that sells Plus). The phone's Back has been kept
// from this since build 90 note 1 (lib/platform/useAndroidBack.ts): each
// overlay asks whether it is on top before it acts. This is the same rule for
// the key, kept in one place, with one listener on the window however many
// overlays are up.
//
// The house's sheet (components/ui/Sheet.tsx) and its confirm dialog
// (components/ui/ConfirmDialog.tsx) answer Escape through here. A page that
// answers Escape itself still asks isSheetUp() and stands aside
// (lib/ui/overlay.ts).

import { useEffect, useRef } from "react";

/** What an overlay does with Escape, as a ref so the newest handler is the one called. */
type Answer = { current: (e: KeyboardEvent) => void };

/** The overlays that are up, in the order they rose. The last one answers. */
const stack: Answer[] = [];

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") escapePressed(e);
}

/** Escape was pressed: the overlay on top answers, and it alone. */
export function escapePressed(e: KeyboardEvent): void {
  stack[stack.length - 1]?.current(e);
}

/**
 * An overlay rises: Escape is its to answer until another rises over it, or
 * it goes. Returns its going, which is safe to call twice.
 */
export function takesEscape(answer: Answer): () => void {
  stack.push(answer);
  if (stack.length === 1 && typeof window !== "undefined") window.addEventListener("keydown", onKey);
  let gone = false;
  return () => {
    if (gone) return;
    gone = true;
    const at = stack.lastIndexOf(answer);
    if (at >= 0) stack.splice(at, 1);
    if (stack.length === 0 && typeof window !== "undefined") window.removeEventListener("keydown", onKey);
  };
}

/**
 * While `active`, Escape calls `onEscape`, if this overlay rose last.
 *
 * The handler is kept in a ref, so the effect depends on `active` alone: a
 * caller that passes a fresh arrow at every render (most do) keeps its place
 * in the order, and does not climb over a sheet that rose after it.
 */
export function useEscape(active: boolean, onEscape: (e: KeyboardEvent) => void): void {
  const latest = useRef(onEscape);
  useEffect(() => {
    latest.current = onEscape;
  }, [onEscape]);
  useEffect(() => {
    if (!active) return;
    return takesEscape(latest);
  }, [active]);
}
