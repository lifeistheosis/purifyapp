"use client";

// The React side of lib/admin/productDrafts.ts: the live list for the Products
// panel, and the one call every write makes so that list follows along. Kept
// apart from the store itself so the store stays a pure module the node tests
// can import without a window.

import { useSyncExternalStore } from "react";

import { DRAFTS_KEY, listDrafts, type ProductDraft } from "./productDrafts";

const EVENT = "purify:admin-drafts";
const EMPTY: ProductDraft[] = [];

/** Tell every open list that the drafts changed. Call after a save or delete. */
export function notifyDraftsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

/** The browser's storage, or null where there is none (SSR, a locked-down browser). */
export function draftStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

let cache: { raw: string; list: ProductDraft[] } | null = null;

function snapshot(): ProductDraft[] {
  const storage = draftStorage();
  if (!storage) return EMPTY;
  let raw = "";
  try {
    raw = storage.getItem(DRAFTS_KEY) ?? "";
  } catch {
    return EMPTY;
  }
  if (!cache || cache.raw !== raw) cache = { raw, list: listDrafts(storage) };
  return cache.list;
}

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === DRAFTS_KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Every unsaved listing on this device, newest first. Empty on the server. */
export function useProductDrafts(): ProductDraft[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
