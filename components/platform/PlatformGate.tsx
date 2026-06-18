"use client";

// Platform-scoped rendering gates. These split the *shell* (chrome, home,
// copy) between the mobile/desktop website and the Capacitor app, on top of
// the existing native detection (lib/platform/native).
//
// Detection is client default-to-web: useIsNative() returns false during SSR
// and the first client render, then flips to true on the native shell after
// hydration. So:
//   * WebOnly children render on the server (web is the SSR default) and
//     unmount on native after hydration — keeps web chrome in the SSR HTML
//     for SEO, and desktop untouched.
//   * NativeOnly children are absent from SSR and mount only on the native
//     client — the app shell never ships to or indexes on the web.
// Server and first client render agree (both web), so there is no hydration
// mismatch; the brief native first-paint swap is covered by the Capacitor
// splash screen.

import type { ReactNode } from "react";
import { useIsNative } from "@/lib/platform/native";

/** Render children everywhere EXCEPT the native app shell (web + desktop). */
export function WebOnly({ children }: { children: ReactNode }) {
  return useIsNative() ? null : <>{children}</>;
}

/** Render children ONLY inside the native app shell. */
export function NativeOnly({ children }: { children: ReactNode }) {
  return useIsNative() ? <>{children}</> : null;
}
