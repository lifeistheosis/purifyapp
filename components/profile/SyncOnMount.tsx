"use client";

import { useEffect } from "react";
import { syncBookmarks } from "@/lib/sync/bookmarks";
import { syncAnnotations } from "@/lib/sync/annotations";

const LAST_KEY = "purify.sync.last";
const ERR_KEY = "purify.sync.error";

/**
 * Mount-only trigger that runs a two-way sync once when a signed-in user
 * lands on /account (or any page that renders this component). Records
 * the timestamp on success and the error message on failure so
 * `ProfileSyncStatus` can surface both. Fires a `purify:sync` custom
 * event so live widgets refresh without polling.
 */
export function SyncOnMount() {
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([syncBookmarks(), syncAnnotations()]);
        window.localStorage.setItem(LAST_KEY, new Date().toISOString());
        window.localStorage.removeItem(ERR_KEY);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        window.localStorage.setItem(ERR_KEY, msg);
      } finally {
        window.dispatchEvent(new CustomEvent("purify:sync"));
      }
    })();
  }, []);
  return null;
}
