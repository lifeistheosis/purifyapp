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
    set(key ? key.split("\n") : NONE);
    return () => set(NONE);
  }, [key]);
}

/** Test seam. */
export function pagePlayerNow(): readonly string[] {
  return here;
}
