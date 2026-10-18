"use client";

import { useEffect, useRef } from "react";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { syncBookmarks, pushAllLocalBookmarks } from "@/lib/sync/bookmarks";
import {
  FROM_SYNC,
  annotationKeyOf,
  pushAllLocalAnnotations,
  pushAnnotationKeys,
  syncAnnotations,
} from "@/lib/sync/annotations";
import { syncFlorilegia, pushAllLocalFlorilegia } from "@/lib/sync/florilegium";
import { pushHighlightNames, syncHighlightNames } from "@/lib/sync/highlightNames";
import { pushJournal, syncJournal } from "@/lib/sync/journal";
import { NAMES_EVENT } from "@/lib/bible/highlightColors";

/**
 * Background sync glue. Mounts once in the (app) layout so every page under
 * it gets transparent two-way sync when the user is signed in. Listens to
 * the CustomEvents the bookmarks, annotations, florilegium and journal stores
 * dispatch and debounces the push so a rapid sequence (e.g. drag-highlighting
 * a phrase) doesn't fire ten round-trips.
 *
 * Annotations push by key (1.7): an event that names its verse or paragraph
 * pushes that one, which is how an edited note or a cleared highlight
 * reaches the server; an event that names nothing (an import, a clear) asks
 * for the sweep. The sync's own writes are marked and not pushed back.
 *
 * What each highlight colour means travels too (1.7.1,
 * lib/sync/highlightNames.ts): the newer copy wins on the first load, and a
 * name given or changed here is sent after a pause.
 */
export function SyncBridge() {
  const signedInRef = useRef<boolean | null>(null);
  const bookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annotationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const florilegiumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const namesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeys = useRef<Set<string>>(new Set());
  const sweep = useRef(false);

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
      syncJournal().catch(() => {});
      syncHighlightNames().catch(() => {});
    }

    function onBookmark() {
      if (!signedInRef.current) return;
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      bookmarkTimer.current = setTimeout(() => {
        pushAllLocalBookmarks().catch(() => {});
      }, 500);
    }
    function onAnnotation(e: Event) {
      if (!signedInRef.current) return;
      const detail = (e as CustomEvent).detail as { source?: string } | undefined;
      if (detail?.source === FROM_SYNC) return;
      const key = annotationKeyOf(detail);
      if (key) pendingKeys.current.add(key);
      else sweep.current = true;
      if (annotationTimer.current) clearTimeout(annotationTimer.current);
      annotationTimer.current = setTimeout(() => {
        const keys = [...pendingKeys.current];
        const all = sweep.current;
        pendingKeys.current.clear();
        sweep.current = false;
        void (async () => {
          if (all) await pushAllLocalAnnotations();
          if (keys.length) await pushAnnotationKeys(keys);
        })().catch(() => {});
      }, 500);
    }
    function onFlorilegium() {
      if (!signedInRef.current) return;
      if (florilegiumTimer.current) clearTimeout(florilegiumTimer.current);
      florilegiumTimer.current = setTimeout(() => {
        pushAllLocalFlorilegia().catch(() => {});
      }, 500);
    }
    function onJournal(e: Event) {
      if (!signedInRef.current) return;
      if (((e as CustomEvent).detail as { source?: string } | undefined)?.source === "sync") return;
      if (journalTimer.current) clearTimeout(journalTimer.current);
      journalTimer.current = setTimeout(() => {
        pushJournal().catch(() => {});
      }, 500);
    }

    function onNames(e: Event) {
      if (!signedInRef.current) return;
      if (((e as CustomEvent).detail as { source?: string } | undefined)?.source === "sync") return;
      if (namesTimer.current) clearTimeout(namesTimer.current);
      namesTimer.current = setTimeout(() => {
        pushHighlightNames().catch(() => {});
      }, 1500);
    }

    window.addEventListener("purify:bookmark", onBookmark);
    window.addEventListener("purify:annotation", onAnnotation);
    window.addEventListener("purify:florilegium", onFlorilegium);
    window.addEventListener("purify:journal", onJournal);
    window.addEventListener(NAMES_EVENT, onNames);

    return () => {
      // No `cancelled` flag any more: the session read is synchronous, so
      // there is no in-flight await for an unmount to race against.
      window.removeEventListener("purify:bookmark", onBookmark);
      window.removeEventListener("purify:annotation", onAnnotation);
      window.removeEventListener("purify:florilegium", onFlorilegium);
      window.removeEventListener("purify:journal", onJournal);
      window.removeEventListener(NAMES_EVENT, onNames);
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      if (annotationTimer.current) clearTimeout(annotationTimer.current);
      if (florilegiumTimer.current) clearTimeout(florilegiumTimer.current);
      if (journalTimer.current) clearTimeout(journalTimer.current);
      if (namesTimer.current) clearTimeout(namesTimer.current);
    };
  }, []);

  return null;
}
