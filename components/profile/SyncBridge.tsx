"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncBookmarks, pushAllLocalBookmarks } from "@/lib/sync/bookmarks";
import { syncAnnotations, pushAllLocalAnnotations } from "@/lib/sync/annotations";

/**
 * Background sync glue. Mounts once in the (app) layout so every page under
 * it gets transparent two-way sync when the user is signed in. Listens to
 * the two CustomEvents the bookmarks + annotations hooks dispatch and
 * debounces the push so a rapid sequence (e.g. drag-highlighting a phrase)
 * doesn't fire ten round-trips.
 */
export function SyncBridge() {
  const signedInRef = useRef<boolean | null>(null);
  const bookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annotationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        signedInRef.current = !!user;
        if (user) {
          // Initial two-way sync on first mount of any (app) page.
          syncBookmarks().catch(() => {});
          syncAnnotations().catch(() => {});
        }
      } catch {
        signedInRef.current = false;
      }
    }
    check();

    function onBookmark() {
      if (!signedInRef.current) return;
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      bookmarkTimer.current = setTimeout(() => {
        pushAllLocalBookmarks().catch(() => {});
      }, 500);
    }
    function onAnnotation() {
      if (!signedInRef.current) return;
      if (annotationTimer.current) clearTimeout(annotationTimer.current);
      annotationTimer.current = setTimeout(() => {
        pushAllLocalAnnotations().catch(() => {});
      }, 500);
    }

    window.addEventListener("purify:bookmark", onBookmark);
    window.addEventListener("purify:annotation", onAnnotation);

    return () => {
      cancelled = true;
      window.removeEventListener("purify:bookmark", onBookmark);
      window.removeEventListener("purify:annotation", onAnnotation);
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      if (annotationTimer.current) clearTimeout(annotationTimer.current);
    };
  }, []);

  return null;
}
