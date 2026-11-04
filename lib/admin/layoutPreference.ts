"use client";

import { useSyncExternalStore } from "react";

/**
 * Two looks he liked both of, and picks between in Settings (the owner,
 * 2026-11-04: "I want to have a switcher in the settings to switch between A
 * and B ... just the A-B test on my own, because I like both designs").
 *
 *   home   A, numbers first: the figures as tiles, then the hour, then the
 *          timeline. B, money leads: what came in today, large, with its
 *          week, and the site's live count as one row (sheet r3-32).
 *   today  How Traffic's chart shows the day still running (sheet r3-36).
 *          A, still counting: the line runs to today, its last stretch
 *          dashed, beside yesterday at this time. B, apart: the line ends
 *          last night and today stands to its right as one bar.
 *
 * Remembered per browser, like the panel's other choices
 * (lib/admin/latestDayPreference.ts): localStorage through
 * useSyncExternalStore, the default on the server and on first paint, an
 * in-memory copy where storage is refused.
 */

export type LayoutKey = "home" | "today";
export type Layout = "a" | "b";

/** Money leads, his opening page; today still counting. */
export const LAYOUT_DEFAULT: Record<LayoutKey, Layout> = { home: "b", today: "a" };

const KEY = (k: LayoutKey) => `purify:admin:layout:${k}`;
const EVENT = "purify:admin:layout-change";
const memory: Partial<Record<LayoutKey, Layout>> = {};

export function parseLayout(raw: string | null | undefined, k: LayoutKey): Layout {
  return raw === "a" || raw === "b" ? raw : LAYOUT_DEFAULT[k];
}

function read(k: LayoutKey): Layout {
  try {
    const stored = window.localStorage.getItem(KEY(k));
    if (stored !== null) return parseLayout(stored, k);
  } catch {
    // fall through to the in-memory copy
  }
  return memory[k] ?? LAYOUT_DEFAULT[k];
}

export function setLayout(k: LayoutKey, next: Layout): void {
  memory[k] = next;
  try {
    window.localStorage.setItem(KEY(k), next);
  } catch {
    // remembered for this session only
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useLayout(k: LayoutKey): Layout {
  return useSyncExternalStore(subscribe, () => read(k), () => LAYOUT_DEFAULT[k]);
}
