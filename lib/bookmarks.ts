"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isNativeClient } from "@/lib/platform/native";
import { productHref } from "@/lib/shop/productHref";
import { addTombstone, dropTombstone } from "@/lib/sync/tombstones";

/**
 * Bookmarks across both readers, Bible verses, Bible chapters, and saint
 * writing sections, kept in a single localStorage array.
 *
 * Storage:
 * purify:bookmarks = Bookmark[] // JSON
 *
 * Surfaces:
 * - VerseRow toolbar + right-click menu (bible-verse)
 * - ChapterReader header (bible-chapter)
 * - WritingReader section header + ParagraphRow menu (writing-section)
 * - /saved lists every kind in one feed (lib/saved/feed.ts)
 *
 * The hook is identity-based on a Locator shape so callers don't need to
 * remember a bookmark's UUID, they hand over the location, the hook finds
 * the matching row.
 */

export type BookmarkBase = {
 /** crypto.randomUUID() */
 id: string;
 /** Date.now() */
 addedAt: number;
 /** Pre-rendered display string. Set by the caller. */
 label: string;
};

export type Bookmark =
 | (BookmarkBase & {
 kind: "bible-verse";
 book: string;
 bookName: string;
 chapter: number;
 verse: number;
 })
 | (BookmarkBase & {
 kind: "bible-chapter";
 book: string;
 bookName: string;
 chapter: number;
 })
 | (BookmarkBase & {
 kind: "writing-section";
 saintSlug: string;
 saintName: string;
 workSlug: string;
 workTitle: string;
 sectionN: number;
 sectionTitle: string;
 })
 | (BookmarkBase & {
 kind: "prayer";
 ruleId: string;
 prayerId: string;
 })
 | (BookmarkBase & {
 kind: "prayer-rule";
 ruleId: string;
 href: string;
 })
 | (BookmarkBase & {
 kind: "history-event";
 eventSlug: string;
 displayDate: string;
 })
 | (BookmarkBase & {
 /**
  * A saint, not a passage of theirs. Asked for on 2026-09-07: "I'd like to
  * see a option so set saints as favorites. This way you don't have to
  * search each time." Before this a reader could save a saint's writing
  * section but never the saint. Device-local, like history-event and
  * product: lib/sync/bookmarks.ts syncs an allowlist of three kinds, and
  * carrying this one across devices needs bookmarks_kind_check widened in a
  * migration first.
  */
 kind: "saint";
 saintSlug: string;
 })
 | (BookmarkBase & {
 kind: "product";
 productSlug: string;
 storeName: string;
 /** Pre-formatted price at save time ("$49"); display-only, the product
  * page always shows the live price. */
 priceLabel: string;
 imageUrl?: string;
 imageAlt?: string;
 })
 | (BookmarkBase & {
 /**
  * A walkthrough's context card (lib/walkthroughs), kept with one tap: the
  * owner's specification of 2026-09-28 asks for "one-tap capture to the
  * user's permanent archive". Device-local like saint and product: syncing
  * it needs bookmarks_kind_check widened in a migration first.
  */
 kind: "walkthrough-card";
 book: string;
 bookName: string;
 chapter: number;
 cardId: string;
 });

// Distributive Omit: TypeScript's built-in Omit treats unions as a single
// type, which strips the discriminated union down to only the shared keys.
// `T extends unknown` distributes the operation over each member so the
// per-kind fields survive.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
 ? Omit<T, K>
 : never;

export type BookmarkInput = DistributiveOmit<Bookmark, "id" | "addedAt">;

export type BookmarkLocator =
 | {
 kind: "bible-verse";
 book: string;
 chapter: number;
 verse: number;
 }
 | {
 kind: "bible-chapter";
 book: string;
 chapter: number;
 }
 | {
 kind: "writing-section";
 saintSlug: string;
 workSlug: string;
 sectionN: number;
 }
 | {
 kind: "history-event";
 eventSlug: string;
 }
 | {
 kind: "saint";
 saintSlug: string;
 }
 | {
 kind: "product";
 productSlug: string;
 }
 | {
 kind: "walkthrough-card";
 cardId: string;
 };

const STORAGE_KEY = "purify:bookmarks";
const EVENT = "purify:bookmark";

function matches(b: Bookmark, loc: BookmarkLocator): boolean {
 if (b.kind !== loc.kind) return false;
 if (b.kind === "bible-verse" && loc.kind === "bible-verse") {
 return (
 b.book === loc.book && b.chapter === loc.chapter && b.verse === loc.verse
 );
 }
 if (b.kind === "bible-chapter" && loc.kind === "bible-chapter") {
 return b.book === loc.book && b.chapter === loc.chapter;
 }
 if (b.kind === "writing-section" && loc.kind === "writing-section") {
 return (
 b.saintSlug === loc.saintSlug &&
 b.workSlug === loc.workSlug &&
 b.sectionN === loc.sectionN
 );
 }
 if (b.kind === "history-event" && loc.kind === "history-event") {
 return b.eventSlug === loc.eventSlug;
 }
 if (b.kind === "saint" && loc.kind === "saint") {
 return b.saintSlug === loc.saintSlug;
 }
 if (b.kind === "product" && loc.kind === "product") {
 return b.productSlug === loc.productSlug;
 }
 if (b.kind === "walkthrough-card" && loc.kind === "walkthrough-card") {
 return b.cardId === loc.cardId;
 }
 return false;
}

/**
 * Canonical identity key for a bookmark: kind + its locating fields with keys
 * sorted, so two entries that point at the same thing hash identically even if
 * their fields were serialized in a different order (the cause of the duplicate
 * spam when server rows merged back with a different jsonb key order).
 */
/**
 * Where a bookmark points. Exhaustive over the union, so adding a kind
 * without giving it a destination is a type error rather than a card that
 * silently sends the reader to /saved.
 *
 * Three surfaces resolved this themselves and one of them, the account
 * dashboard's "Last saved" strip, was reading a nested `locator` object.
 * That shape is the server's jsonb row; lib/sync/bookmarks.ts flattens it
 * before it ever reaches localStorage, so every one of those links
 * resolved to /bible/undefined/undefined.
 */
export function bookmarkHref(b: Bookmark): string {
 switch (b.kind) {
 case "bible-verse":
 return `/bible/${b.book}/${b.chapter}#v${b.verse}`;
 case "bible-chapter":
 return `/bible/${b.book}/${b.chapter}`;
 case "writing-section":
 return `/saints/${b.saintSlug}/${b.workSlug}#s${b.sectionN}`;
 case "prayer":
 return `/prayers/${b.ruleId}#${b.prayerId}`;
 case "prayer-rule":
 return b.href;
 case "history-event":
 return `/history/${b.eventSlug}`;
 case "saint":
 return `/saints/${b.saintSlug}`;
 case "product":
 return productHref(b.productSlug, isNativeClient());
 case "walkthrough-card":
 return `/walkthroughs/${b.book}/${b.chapter}#card-${b.cardId}`;
 }
}

export function bookmarkKey(b: Bookmark): string {
 let loc: Record<string, unknown>;
 switch (b.kind) {
 case "bible-verse":
 loc = { book: b.book, chapter: b.chapter, verse: b.verse };
 break;
 case "bible-chapter":
 loc = { book: b.book, chapter: b.chapter };
 break;
 case "writing-section":
 loc = { saintSlug: b.saintSlug, workSlug: b.workSlug, sectionN: b.sectionN };
 break;
 case "prayer":
 loc = { ruleId: b.ruleId, prayerId: b.prayerId };
 break;
 case "prayer-rule":
 loc = { ruleId: b.ruleId };
 break;
 case "history-event":
 loc = { eventSlug: b.eventSlug };
 break;
 case "saint":
 loc = { saintSlug: b.saintSlug };
 break;
 case "product":
 loc = { productSlug: b.productSlug };
 break;
 case "walkthrough-card":
 loc = { cardId: b.cardId };
 break;
 default:
 loc = {};
 }
 const sorted = Object.keys(loc)
 .sort()
 .map((k) => `${k}:${String(loc[k])}`)
 .join("|");
 return `${b.kind}|${sorted}`;
}

/**
 * Collapse entries that point at the same thing, keeping the earliest-added
 * one (stable, so an item's original "added" date survives). Cleans up any
 * historical duplicates the moment the list is read.
 */
function dedupe(items: Bookmark[]): Bookmark[] {
 const seen = new Map<string, Bookmark>();
 for (const b of items) {
 const key = bookmarkKey(b);
 const existing = seen.get(key);
 if (!existing || (b.addedAt ?? 0) < (existing.addedAt ?? 0)) {
 seen.set(key, b);
 }
 }
 // Preserve newest-first ordering by addedAt across the deduped set.
 return [...seen.values()].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

function readAll(): Bookmark[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? dedupe(parsed as Bookmark[]) : [];
 } catch {
 return [];
 }
}

function writeAll(items: Bookmark[]) {
 try {
 window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
 window.dispatchEvent(new CustomEvent(EVENT, { detail: { items } }));
 } catch {
 /* storage may be unavailable */
 }
}

/**
 * Where a bookmark of a kind the server keeps (lib/sync/bookmarks.ts) is, or
 * null for the kinds that live on this device alone. Taking one of these away
 * leaves a tombstone (lib/sync/tombstones.ts), so the next pull does not hand
 * it straight back; saving it again drops the tombstone.
 */
export function syncLocator(b: Bookmark | BookmarkInput): Record<string, string | number> | null {
 if (b.kind === "bible-verse") return { book: b.book, chapter: b.chapter, verse: b.verse };
 if (b.kind === "bible-chapter") return { book: b.book, chapter: b.chapter };
 if (b.kind === "writing-section") return { saintSlug: b.saintSlug, workSlug: b.workSlug, sectionN: b.sectionN };
 return null;
}

function bury(gone: Bookmark[]) {
 for (const b of gone) {
 const loc = syncLocator(b);
 if (loc) addTombstone("bookmarks", b.kind, loc);
 }
}

function unbury(b: Bookmark | BookmarkInput) {
 const loc = syncLocator(b);
 if (loc) dropTombstone("bookmarks", b.kind, loc);
}

function newId(): string {
 return typeof crypto !== "undefined" && "randomUUID" in crypto
 ? crypto.randomUUID()
 : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Take a bookmark away by id, outside a component (the Saved feed). Returns
 *  what was taken, for Undo. */
export function removeBookmark(id: string): Bookmark | null {
 const current = readAll();
 const gone = current.find((b) => b.id === id) ?? null;
 if (!gone) return null;
 bury([gone]);
 writeAll(current.filter((b) => b.id !== id));
 return gone;
}

/**
 * Put a removed bookmark back exactly as it was, the same id and the same
 * date, so it returns to its own place in the list (Undo on /saved). Nothing
 * happens if the same thing has been saved again since.
 */
export function restoreBookmark(b: Bookmark): void {
 const current = readAll();
 if (current.some((x) => bookmarkKey(x) === bookmarkKey(b))) return;
 unbury(b);
 writeAll([...current, b].sort((x, y) => (y.addedAt ?? 0) - (x.addedAt ?? 0)));
}

// Stable snapshot for useSyncExternalStore: cache the parsed array keyed by the
// raw string so reads return the same reference until the list actually changes.
const EMPTY_LIST: Bookmark[] = [];
let snapRaw: string | null | undefined;
let snapVal: Bookmark[] = EMPTY_LIST;

function readSnapshot(): Bookmark[] {
 if (typeof window === "undefined") return EMPTY_LIST;
 let raw: string | null = null;
 try {
 raw = window.localStorage.getItem(STORAGE_KEY);
 } catch {
 return EMPTY_LIST;
 }
 if (raw === snapRaw) return snapVal;
 snapRaw = raw;
 if (!raw) {
 snapVal = EMPTY_LIST;
 return snapVal;
 }
 try {
 const parsed = JSON.parse(raw);
 snapVal = Array.isArray(parsed) ? dedupe(parsed as Bookmark[]) : EMPTY_LIST;
 } catch {
 snapVal = EMPTY_LIST;
 }
 return snapVal;
}

function subscribeBookmarks(cb: () => void): () => void {
 if (typeof window === "undefined") return () => {};
 window.addEventListener(EVENT, cb);
 window.addEventListener("storage", cb);
 return () => {
 window.removeEventListener(EVENT, cb);
 window.removeEventListener("storage", cb);
 };
}

/**
 * Returns the live bookmark list plus mutators. Reads via useSyncExternalStore
 * and updates on the `purify:bookmark` event (and cross-tab `storage`), so
 * multiple components stay in sync without a hydrate-in-effect setState.
 */
export function useBookmarks() {
 const bookmarks = useSyncExternalStore(
 subscribeBookmarks,
 readSnapshot,
 () => EMPTY_LIST,
 );

 const add = useCallback((b: BookmarkInput) => {
 const current = readAll();
 // Don't duplicate: if a bookmark with the same locator exists, leave it.
 if (current.some((x) => matches(x, b as BookmarkLocator))) return;
 const next: Bookmark = { ...b, id: newId(), addedAt: Date.now() } as Bookmark;
 unbury(next);
 writeAll([next, ...current]);
 }, []);

 const remove = useCallback((id: string) => {
 removeBookmark(id);
 }, []);

 const removeByLocator = useCallback((loc: BookmarkLocator) => {
 const current = readAll();
 bury(current.filter((b) => matches(b, loc)));
 writeAll(current.filter((b) => !matches(b, loc)));
 }, []);

 const toggle = useCallback((b: BookmarkInput) => {
 const current = readAll();
 const existing = current.find((x) => matches(x, b as BookmarkLocator));
 if (existing) {
 bury([existing]);
 writeAll(current.filter((x) => x.id !== existing.id));
 } else {
 const next: Bookmark = { ...b, id: newId(), addedAt: Date.now() } as Bookmark;
 unbury(next);
 writeAll([next, ...current]);
 }
 }, []);

 const isBookmarked = useCallback(
 (loc: BookmarkLocator) => bookmarks.some((b) => matches(b, loc)),
 [bookmarks],
 );

 return { bookmarks, add, remove, removeByLocator, toggle, isBookmarked };
}
