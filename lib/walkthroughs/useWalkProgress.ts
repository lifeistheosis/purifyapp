"use client";

// A reader's walk as a live React value. The snapshot is the stored string,
// a primitive, so useSyncExternalStore compares it cheaply; parsing happens
// once per change. Re-renders on writes in this tab (WALK_EVENT) and in
// another (storage).

import { useMemo, useSyncExternalStore } from "react";

import { WALK_EVENT, parseProgress, readRaw, walkKey, type WalkProgress } from "./progress";

function subscribe(book: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined") return () => {};
    const onStorage = (e: StorageEvent) => {
      if (e.key === walkKey(book)) onChange();
    };
    window.addEventListener(WALK_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WALK_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  };
}

export function useWalkProgress(book: string): WalkProgress {
  const sub = useMemo(() => subscribe(book), [book]);
  const raw = useSyncExternalStore(sub, () => readRaw(book) ?? "", () => "");
  return useMemo(() => parseProgress(raw || null), [raw]);
}
