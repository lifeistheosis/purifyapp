"use client";

import { useEffect } from "react";
import { syncBookmarks } from "@/lib/sync/bookmarks";
import { syncAnnotations } from "@/lib/sync/annotations";

/**
 * Mount-only trigger that runs a two-way sync once when a signed-in user
 * lands on /account (or any page that renders this component). Best-effort:
 * a network failure or RLS denial is swallowed; the next render still
 * shows whatever's in localStorage.
 */
export function SyncOnMount() {
  useEffect(() => {
    Promise.all([syncBookmarks(), syncAnnotations()]).catch(() => {});
  }, []);
  return null;
}
