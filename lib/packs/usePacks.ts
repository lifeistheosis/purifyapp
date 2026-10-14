import { useMemo, useSyncExternalStore } from "react";

import { isNativeClient } from "@/lib/platform/native";
import type { BoardMessage } from "@/lib/whatsNew/board";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";
import { savedPacks, subscribePacks } from "./store";
import { mergeVerseTable, type Packs } from "./types";

/**
 * The saved packs, for a client component, in the apps only.
 *
 * The server snapshot is null, so a page prerendered into the export and its
 * first client render agree, and the pack takes over right after hydration.
 */
export function usePacks(): Packs | null {
  return useSyncExternalStore(
    subscribePacks,
    () => (isNativeClient() ? savedPacks() : null),
    () => null,
  );
}

/** The Verse of the Day window with the pack's days in front of the build's. */
export function useVerseTable(bundled: Record<string, VerseOfDayEntry>): Record<string, VerseOfDayEntry> {
  const pack = usePacks()?.packs["verse-of-day"];
  return useMemo(() => mergeVerseTable(bundled, pack), [bundled, pack]);
}

/**
 * The board message to show: whichever is newer by its date, the pack's (the
 * message published in the admin panel) or the one the page was built with.
 *
 * Newer, not simply the pack's. A release writes its own message into the
 * bundle before the store builds (`release.mjs board`), and the same words go
 * to the table only at the announcement, so for a while the website's table
 * holds an older message than the app carries. Taking the pack's then would
 * put last month's message back in front of readers.
 */
export function useBoardMessage(bundled: BoardMessage | null): BoardMessage | null {
  return newerBoard(bundled, usePacks()?.packs.board?.message ?? null);
}

export function newerBoard(bundled: BoardMessage | null, packed: BoardMessage | null): BoardMessage | null {
  if (!packed) return bundled;
  if (!bundled) return packed;
  return packed.date >= bundled.date ? packed : bundled;
}
