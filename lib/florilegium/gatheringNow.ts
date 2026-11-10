"use client";

import { useSyncExternalStore } from "react";

/**
 * The gathering on the screen, for the bar over it (1.9).
 *
 * The bar is the page's, drawn outside the gathering, and it names the
 * gathering once the name has gone up under it (components/florilegium/
 * GatheringBar.tsx). Which gathering that is, only the gathering knows: on
 * the website it is in the address, but in the apps it is in the query
 * (lib/florilegium/href.ts), and a part that reads the query has to stand in
 * a Suspense boundary of its own. A bar in a boundary of its own arrived a
 * beat after its page whenever the page's script was still on its way: React
 * drew the boundary's stand-in first and the bar after, and pictured the
 * second as a page switch of its own (the walk in scripts/route-motion.mjs,
 * "a gathering in the apps, its script still on its way").
 *
 * So the gathering says which it is, as the reader of a work says which
 * chapter is on the screen (lib/saints/workNow.ts): it writes its name here
 * as it is drawn and takes it away as it goes, and the bar reads it. Nothing
 * here is kept: it is what is on the screen now.
 *
 * What it costs: the name reaches the bar after the page's first draw, and
 * when the page arrives in a transition, not until the transition is over
 * (React keeps an effect's update until then). The bar is made so that the
 * wait shows nothing (components/florilegium/GatheringBar.tsx).
 */
export type GatheringNow = {
  id: string;
  /** The reader's own words. */
  title: string;
};

let now: GatheringNow | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  listeners.forEach((l) => l());
}

/** A gathering is on the screen. The same one under the same name is not said twice. */
export function showGathering(id: string, title: string): void {
  if (now && now.id === id && now.title === title) return;
  now = { id, title };
  tell();
}

/**
 * The gathering has gone. Only the one on the screen can be taken away: a
 * gathering that leaves after the next has arrived takes nothing with it.
 */
export function hideGathering(id: string): void {
  if (!now || now.id !== id) return;
  now = null;
  tell();
}

/** The gathering on the screen now, or none. The same object until it changes. */
export function gatheringNow(): GatheringNow | null {
  return now;
}

/** Told each time the gathering on the screen changes; returns the way to stop being told. */
export function onGatheringNow(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const none = (): null => null;

/** The gathering on the screen; none on the server, or with none open. */
export function useGatheringNow(): GatheringNow | null {
  return useSyncExternalStore(onGatheringNow, gatheringNow, none);
}
