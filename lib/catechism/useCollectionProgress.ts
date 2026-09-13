"use client";

// The device's collection sets as React state, for the collections page,
// the practice page and the one line on /account.
//
// Empty on the first frame, then the store after mount, the same shape as
// useCompletionCount and for the same reason (a localStorage scan is not a
// stable snapshot for useSyncExternalStore). Signed in, the account's rows
// are pulled once and merged into the device store, which fires the event
// this hook listens to, so the merge shows without a second read path.

import { useEffect, useMemo, useState } from "react";

import { readLocalSessionUser } from "@/lib/supabase/localSession";

import { loadCollections, type CollectionIndexEntry } from "./collections";
import {
  COLLECTIONS_EVENT,
  readCollectionProgress,
  settleCompletion,
  type LocalProgressMap,
} from "./progressLocal";
import { pullCollectionProgress } from "./progressSync";

/**
 * Every collection's set. When `index` is given, a set that already covers
 * its collection is settled (completed_at written) on every read.
 */
export function useCollectionProgress(index?: readonly CollectionIndexEntry[]): LocalProgressMap {
  const [map, setMap] = useState<LocalProgressMap>({});

  useEffect(() => {
    function recompute() {
      if (index) settleCompletion(index);
      setMap(readCollectionProgress());
    }
    recompute();
    window.addEventListener(COLLECTIONS_EVENT, recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener(COLLECTIONS_EVENT, recompute);
      window.removeEventListener("storage", recompute);
    };
  }, [index]);

  useEffect(() => {
    if (!readLocalSessionUser()) return;
    void pullCollectionProgress();
  }, []);

  return map;
}

export type CompletedCollection = { slug: string; name: string; completed_at: string };

/**
 * The completed collections that still exist in the config, oldest first,
 * for the quiet "Completed:" list. A completion whose collection was since
 * withdrawn from the file is kept in the store and simply not named.
 */
export function useCompletedCollections(): CompletedCollection[] {
  const map = useCollectionProgress();
  return useMemo(() => {
    const names = new Map(loadCollections().map((c) => [c.slug, c.name]));
    return Object.entries(map)
      .filter(([slug, p]) => !!p.completed_at && names.has(slug))
      .map(([slug, p]) => ({ slug, name: names.get(slug) as string, completed_at: p.completed_at as string }))
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  }, [map]);
}
