"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { NATIVITY_PATH, nativityRow, type NativityRow } from "./nativity";
import { readPathDone } from "./pathProgress";
import { getPath } from "./paths";

// The Nativity Fast's card on Today (components/today/NativityStarCard.tsx,
// 1.8) takes the path over while it shows: one place for the path, not two.
// It claims the row while it is on the screen, and the row in The Church
// today gives way for as long as the claim stands. Where the card is not
// drawn (/prayers/today on a computer), or on the days it is not (the week
// before the fast, a reader still on the path after it), the row is as it was.

let claims = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** The card is up: the row gives way until the returned release is called. */
export function claimNativityRow(): () => void {
  claims += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims -= 1;
    emit();
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether a Nativity card holds the path on this screen. */
export function isNativityRowClaimed(): boolean {
  return claims > 0;
}

export function useNativityRowClaimed(): boolean {
  return useSyncExternalStore(subscribe, isNativityRowClaimed, () => false);
}

/** Today's Nativity Fast row (lib/reading/nativity.ts), once the device's path days are read. */
export function useNativityRow(now: Date | null, style: "new" | "old"): NativityRow {
  const [done, setDone] = useState<number[] | null>(null);
  const claimed = useNativityRowClaimed();
  // The days read are the device's: read once the page has woken.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDone(readPathDone(NATIVITY_PATH)), []);
  const days = getPath(NATIVITY_PATH)?.days.length ?? 0;
  if (!now || done === null || claimed) return null;
  return nativityRow(now, style, done, days);
}
