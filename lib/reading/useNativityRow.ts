"use client";

import { useEffect, useState } from "react";

import { NATIVITY_PATH, nativityRow, type NativityRow } from "./nativity";
import { readPathDone } from "./pathProgress";
import { getPath } from "./paths";

/** Today's Nativity Fast row (lib/reading/nativity.ts), once the device's path days are read. */
export function useNativityRow(now: Date | null, style: "new" | "old"): NativityRow {
  const [done, setDone] = useState<number[] | null>(null);
  // The days read are the device's: read once the page has woken.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDone(readPathDone(NATIVITY_PATH)), []);
  const days = getPath(NATIVITY_PATH)?.days.length ?? 0;
  if (!now || done === null) return null;
  return nativityRow(now, style, done, days);
}
