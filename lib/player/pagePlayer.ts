"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

/**
 * A page with its own player (1.8, sheet r3-18, the owner's pick of
 * 2026-10-31: a chant's page with "the player at the bottom, like how A has
 * it"). A chant's page docks its controls over the tab bar, so while what the
 * mini player would show is one of that chant's recordings, the mini player
 * steps aside (components/prayers/NowPlayingBar.tsx): one player on the
 * screen for one singing, never two. Anything else playing keeps the mini
 * player, and the page's dock stands above it. Leaving the page, the mini
 * player is back at once.
 *
 * The page says which recordings it plays by their paths as its data names
 * them (a bucket address, or /audio/chants/...), and a recording is the
 * page's when the player's address is that path or ends with it: in the apps
 * a website file is asked for at the website's own address
 * (lib/chants/media.ts, chantMediaUrl), as lib/chants/play.ts compares them.
 */
let here: readonly string[] = [];
const NONE: readonly string[] = [];
const listeners = new Set<() => void>();

function set(next: readonly string[]): void {
  here = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A page that is the player for everything (1.9, the owner's pick for
 * Listening, "one bar while playing": docs/1.9-build/BRAINSTORM.md). On a
 * phone and a tablet the Bible reader's chapter pill and the mini player
 * stood one over the other while anything played; now the reader's dock
 * (components/bible/ReaderDock.tsx) is the player there, for every track,
 * and the pill's own sound button stands for a sound playing alone, so the
 * mini player steps aside for both.
 */
export const EVERYTHING = "*";

/**
 * The class on <html> while the page on the screen is the player for
 * everything (app/globals.css, "One surface at the foot"): the mini player
 * stays mounted under it, unseen and keeping no room, so that leaving the
 * page it is there in the same picture as the page it comes back over.
 */
export const HOSTS_CLASS = "hosts-player";

/**
 * The class on <html> for the moment a page that is the player for
 * everything comes or goes, with --foot-shift: how far the foot of the form
 * that leaves stood below the foot of the one that comes (app/globals.css,
 * "One surface at the foot"). In a page switch the two pictures stand on the
 * foot of the arriving form's box and fade into each other; this keeps the
 * leaving one where it stood. Taken back once the switch has run.
 */
export const HANDOVER_CLASS = "foot-handover";
const HANDOVER_MS = 900;

/** Where the feet of the mini player and the dock stood (from the top of the screen) when the page that hosts the player came. */
let feet: { mini: number; dock: number } | null = null;
let handoverTimer: ReturnType<typeof setTimeout> | null = null;
/** True from a hosting page's leaving to the end of that commit: a hosting page that comes in the same commit is a dock to a dock. */
let leaving = false;

/** The foot of a form at the foot of the screen, or null when it is not drawn. */
function footOf(selector: string): number | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.height > 0 ? r.bottom : null;
}

/** Written in the commit that brings or takes away the page, so the switch's picture has it. */
function handOver(root: HTMLElement, shift: number | null): void {
  if (shift === null) {
    if (handoverTimer) clearTimeout(handoverTimer);
    handoverTimer = null;
    root.classList.remove(HANDOVER_CLASS);
    root.style.removeProperty("--foot-shift");
    return;
  }
  root.style.setProperty("--foot-shift", `${Math.round(shift)}px`);
  root.classList.add(HANDOVER_CLASS);
  if (handoverTimer) clearTimeout(handoverTimer);
  handoverTimer = setTimeout(() => {
    handoverTimer = null;
    root.classList.remove(HANDOVER_CLASS);
    root.style.removeProperty("--foot-shift");
  }, HANDOVER_MS);
}

/** A page that hosts the player arrives: the mini player is still drawn, and the dock is in the page. */
function handOverArriving(root: HTMLElement): void {
  if (leaving) {
    // From one such page to another (a chapter to the next): the dock in
    // both pictures, standing where it stood.
    handOver(root, null);
    return;
  }
  const mini = footOf("[data-mini-player] .mini-player");
  const dock = footOf("[data-reader-dock] .reader-dock");
  feet = mini !== null && dock !== null ? { mini, dock } : null;
  handOver(root, feet ? feet.mini - feet.dock : null);
}

/** It leaves: the dock goes, the mini player comes back where it stood. */
function handOverLeaving(root: HTMLElement): void {
  handOver(root, feet ? feet.dock - feet.mini : null);
  leaving = true;
  queueMicrotask(() => {
    leaving = false;
  });
}

/** Whether the player's recording is one a page on the screen plays with its own controls. */
export function playsOnPage(src: string | null | undefined, paths: readonly string[]): boolean {
  if (!src) return false;
  return paths.some((p) => p === EVERYTHING || (p.length > 0 && (src === p || src.endsWith(p))));
}

/** Whether the page on the screen is the player for everything, a sound playing alone included. */
export function hostsEverything(paths: readonly string[]): boolean {
  return paths.includes(EVERYTHING);
}

/** The recordings the page on the screen plays itself, for the mini player. */
export function usePagePlayer(): readonly string[] {
  return useSyncExternalStore(subscribe, () => here, () => NONE);
}

// Before the frame is painted, so the mini player is never drawn for a frame
// under a page that has its own (the store tells it inside the same commit).
// On the server there is nothing to paint (components/nav/ScrollResetBridge.tsx).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A page's own player: its recordings, while the page is on the screen. The
 * list is read by value, so a new array with the same paths changes nothing.
 */
export function useOwnPlayer(paths: readonly string[]): void {
  const key = paths.join("\n");
  useIsoLayoutEffect(() => {
    const next = key ? key.split("\n") : NONE;
    set(next);
    // The class is written here, on the page itself, and not left to the mini
    // player's own render (build 98 note 14): a page arrives in a View
    // Transition whose picture is taken once this commit's layout effects
    // have run, and a render the store asks for here comes only after that
    // picture. The mini player then stood in the picture of the Bible and cut
    // out a moment after it; on the way back it was missing from the picture
    // and cut in. A class written now is in the picture (app/globals.css,
    // "One surface at the foot").
    const root = document.documentElement;
    const hosts = hostsEverything(next);
    if (hosts) handOverArriving(root);
    if (hosts) root.classList.add(HOSTS_CLASS);
    return () => {
      set(NONE);
      if (hosts) handOverLeaving(root);
      if (hosts) root.classList.remove(HOSTS_CLASS);
    };
  }, [key]);
}

/** Test seam. */
export function pagePlayerNow(): readonly string[] {
  return here;
}

/** Test seam: the hand-over between the mini player and the dock, as the page's arrival and leaving run it. */
export const footHandoverForTests = { arriving: handOverArriving, leaving: handOverLeaving };
