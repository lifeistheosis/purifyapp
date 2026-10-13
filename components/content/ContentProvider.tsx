"use client";

// Makes the local-first repository available to the React tree on the native
// shell. On the web this is inert: initNativeLocalContent() returns null (it
// no-ops off the Capacitor shell), so `useRepository()` is null and pages keep
// using their existing server-rendered data — the website is unchanged.
//
// Mounted once in the (app) layout. When the bundled Android build lands, the
// migrated screens (Today, Prayers, Saints) read through useRepository() and
// fall back to null → server data on web.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LocalContent } from "@/lib/content/bootstrap";
import { LOCAL_CONTENT_ENABLED } from "@/lib/content/enabled";
import type { ContentRepository } from "@/lib/content/repository";
import type { SyncQueue } from "@/lib/content/syncQueue";

const LocalContentCtx = createContext<LocalContent | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<LocalContent | null>(null);

  useEffect(() => {
    // Off since 1.6: no screen reads the store, so the apps do not open it or
    // fill it (lib/content/enabled.ts). The provider stays mounted, with
    // nothing to hand out, so a screen written against it meets null as it
    // does on the website.
    if (!LOCAL_CONTENT_ENABLED) return;
    let cancelled = false;
    void (async () => {
      try {
        const { initNativeLocalContent } = await import("@/lib/content/bootstrap");
        const lc = await initNativeLocalContent();
        if (!cancelled) setLocal(lc);
      } catch {
        // A storage failure must never block the app; screens fall back to
        // their network/server path.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LocalContentCtx.Provider value={local}>{children}</LocalContentCtx.Provider>
  );
}

/** Full local-content handle (repo + queue + version), or null on web/first frame. */
export function useLocalContent(): LocalContent | null {
  return useContext(LocalContentCtx);
}

/** The local repository, or null when not running locally (web / pre-init). */
export function useRepository(): ContentRepository | null {
  return useContext(LocalContentCtx)?.repo ?? null;
}

/** The offline sync queue, or null when not running locally. */
export function useSyncQueue(): SyncQueue | null {
  return useContext(LocalContentCtx)?.queue ?? null;
}
