// The last few things a reader opened from the search, on this device only.
//
// The search used to open on the same eight rows for everyone, every time,
// whatever the reader had looked for before (the owner, 2026-10-16: "Today's
// search could look better"). It now keeps the last five results the reader
// opened, newest first, and shows them before anything is typed.
//
// Kept in this device's storage and nowhere else: it is not synced and never
// leaves the phone. Every read and write is guarded, because storage can be
// missing, full or refused (a private window, a cleared app), and the search
// must open whatever happens here.

import { GROUP_ORDER, type SearchGroup, type SearchItem } from "./types";

export const RECENT_KEY = "purify:search:recent";
export const RECENT_MAX = 5;

/** What is kept of a result: enough to draw its row and open it again. */
export type RecentItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  group: SearchGroup;
};

function isRecent(value: unknown): value is RecentItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.href === "string" &&
    // An address inside the app, and only that: what is opened again is
    // read back from storage, so it is held to the app's own paths.
    v.href.startsWith("/") &&
    !v.href.startsWith("//") &&
    typeof v.group === "string" &&
    (GROUP_ORDER as readonly string[]).includes(v.group) &&
    (v.sublabel === undefined || typeof v.sublabel === "string")
  );
}

/** The list with `item` first, once, and no longer than `max`. Pure. */
export function withRecent(list: readonly RecentItem[], item: SearchItem, max: number = RECENT_MAX): RecentItem[] {
  const kept: RecentItem = {
    id: item.id,
    label: item.label,
    ...(item.sublabel ? { sublabel: item.sublabel } : {}),
    href: item.href,
    group: item.group,
  };
  return [kept, ...list.filter((r) => r.id !== item.id && r.href !== item.href)].slice(0, max);
}

/** What storage holds, cleaned: anything that is not a kept result is dropped. Pure. */
export function parseRecent(raw: string | null): RecentItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecent).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function readRecent(): RecentItem[] {
  try {
    return parseRecent(window.localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

/** Keep `item` as the newest, and hand back the list as it now stands. */
export function rememberRecent(item: SearchItem): RecentItem[] {
  const next = withRecent(readRecent(), item);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage refused: the list simply is not kept this time.
  }
  return next;
}

export function clearRecent(): void {
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    // Nothing to do: a list that cannot be read is already not shown.
  }
}
