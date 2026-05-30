"use client";

// Thin helper for the prayer bookmark star inside PrayerRuleReader.
// Reuses the existing `purify:bookmarks` localStorage shape so the
// /saved page sees prayer bookmarks the same way it sees verse and
// writing-section bookmarks. Kind: 'prayer', locator: { ruleId, prayerId }.

type PrayerBookmark = {
  id: string;
  kind: "prayer";
  addedAt: number;
  label: string;
  ruleId: string;
  prayerId: string;
};

type AnyBookmark = PrayerBookmark | { id: string; kind: string; [k: string]: unknown };

const STORAGE_KEY = "purify:bookmarks";
const EVENT = "purify:bookmark";

function readAll(): AnyBookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnyBookmark[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: AnyBookmark[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { items } }));
  } catch {
    /* ignore */
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isBookmarked(ruleId: string, prayerId: string): boolean {
  return readAll().some(
    (b) =>
      b.kind === "prayer" &&
      (b as PrayerBookmark).ruleId === ruleId &&
      (b as PrayerBookmark).prayerId === prayerId,
  );
}

export function togglePrayerBookmark(
  ruleId: string,
  prayerId: string,
  prayerTitle: string,
): void {
  const all = readAll();
  const existing = all.find(
    (b) =>
      b.kind === "prayer" &&
      (b as PrayerBookmark).ruleId === ruleId &&
      (b as PrayerBookmark).prayerId === prayerId,
  );
  if (existing) {
    writeAll(all.filter((b) => b.id !== existing.id));
    return;
  }
  const entry: PrayerBookmark = {
    id: uid(),
    kind: "prayer",
    addedAt: Date.now(),
    label: prayerTitle,
    ruleId,
    prayerId,
  };
  writeAll([entry, ...all]);
}
