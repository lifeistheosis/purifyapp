"use client";

import { useEffect, useRef } from "react";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { syncBookmarks, pushAllLocalBookmarks } from "@/lib/sync/bookmarks";
import { syncAnnotations, pushAllLocalAnnotations } from "@/lib/sync/annotations";
import { syncFlorilegia, pushAllLocalFlorilegia } from "@/lib/sync/florilegium";

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
  const florilegiumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // F-13 again, and this one is on EVERY page. supabase.auth.getUser()
    // network-validates through the cross-tab auth lock, and this component
    // mounts in the (app) layout, so every route in the app took that lock on
    // load. Measured on the admin panel 2026-08-28: five auth/v1/user calls per
    // page load and two gotrue warnings twenty seconds apart reading
    //
    //   Lock "lock:sb-...-auth-token" was not released within 5000ms
    //
    // which is a five second stall the operator feels as the panel hanging.
    // components/billing/WebPlusCheckout.tsx hit the same lock live on
    // 2026-07-14 and moved to the local read for the same reason.
    //
    // Nothing here needs a network-validated identity. The result is used as a
    // boolean to decide whether to sync, and every sync endpoint validates the
    // caller server-side anyway, so a stale or forged local cookie buys an
    // attacker a request that answers 401. The local read is synchronous,
    // lock-free, and cannot hang.
    const user = readLocalSessionUser();
    signedInRef.current = !!user;
    if (user) {
      // Initial two-way sync on first mount of any (app) page.
      syncBookmarks().catch(() => {});
      syncAnnotations().catch(() => {});
      syncFlorilegia().catch(() => {});
    }

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
    function onFlorilegium() {
      if (!signedInRef.current) return;
      if (florilegiumTimer.current) clearTimeout(florilegiumTimer.current);
      florilegiumTimer.current = setTimeout(() => {
        pushAllLocalFlorilegia().catch(() => {});
      }, 500);
    }

    window.addEventListener("purify:bookmark", onBookmark);
    window.addEventListener("purify:annotation", onAnnotation);
    window.addEventListener("purify:florilegium", onFlorilegium);

    return () => {
      // No `cancelled` flag any more: the session read is synchronous, so
      // there is no in-flight await for an unmount to race against.
      window.removeEventListener("purify:bookmark", onBookmark);
      window.removeEventListener("purify:annotation", onAnnotation);
      window.removeEventListener("purify:florilegium", onFlorilegium);
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      if (annotationTimer.current) clearTimeout(annotationTimer.current);
      if (florilegiumTimer.current) clearTimeout(florilegiumTimer.current);
    };
  }, []);

  return null;
}
