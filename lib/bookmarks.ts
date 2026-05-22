"use client";

import { useCallback, useSyncExternalStore } from "react";

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
 * - /saved page lists all kinds, grouped
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
 return false;
}

function readAll(): Bookmark[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
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
 snapVal = Array.isArray(parsed) ? (parsed as Bookmark[]) : EMPTY_LIST;
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
 const next: Bookmark = {
 ...b,
 id:
 typeof crypto !== "undefined" && "randomUUID" in crypto
 ? crypto.randomUUID()
 : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
 addedAt: Date.now(),
 } as Bookmark;
 writeAll([next, ...current]);
 }, []);

 const remove = useCallback((id: string) => {
 const next = readAll().filter((b) => b.id !== id);
 writeAll(next);
 }, []);

 const removeByLocator = useCallback((loc: BookmarkLocator) => {
 const next = readAll().filter((b) => !matches(b, loc));
 writeAll(next);
 }, []);

 const toggle = useCallback((b: BookmarkInput) => {
 const current = readAll();
 const existing = current.find((x) => matches(x, b as BookmarkLocator));
 if (existing) {
 writeAll(current.filter((x) => x.id !== existing.id));
 } else {
 const next: Bookmark = {
 ...b,
 id:
 typeof crypto !== "undefined" && "randomUUID" in crypto
 ? crypto.randomUUID()
 : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
 addedAt: Date.now(),
 } as Bookmark;
 writeAll([next, ...current]);
 }
 }, []);

 const isBookmarked = useCallback(
 (loc: BookmarkLocator) => bookmarks.some((b) => matches(b, loc)),
 [bookmarks],
 );

 return { bookmarks, add, remove, removeByLocator, toggle, isBookmarked };
}
