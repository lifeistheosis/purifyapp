"use client";

import { useSyncExternalStore } from "react";

import { coversVersion, subscribeCovers } from "./covers";

/**
 * For a screen that draws a book's cover (readAloudCover): drawn again when
 * the website's covers come (lib/readAloud/covers.ts, the covers pack). Its
 * server snapshot is 0, so a page drawn into the export and its first draw in
 * the app agree; the covers are put in place only after that draw
 * (components/native/PackBridge.tsx).
 */
export function useCoversVersion(): number {
  return useSyncExternalStore(subscribeCovers, coversVersion, () => 0);
}
