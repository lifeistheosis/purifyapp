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
import type { ContentRepository } from "@/lib/content/repository";
import type { SyncQueue } from "@/lib/content/syncQueue";

const LocalContentCtx = createContext<LocalContent | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<LocalContent | null>(null);

  useEffect(() => {
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
