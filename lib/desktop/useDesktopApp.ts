"use client";

import { isDesktopApp } from "@/lib/desktop/bridge";
import { useMounted } from "@/lib/useMounted";

/**
 * Is this page running inside the Windows app? False on the server and in the
 * hydration render, so the markup the server sent is the markup React finds,
 * then the truth from the first client render (1.9, for the paywall's rows,
 * lib/premium/plusRows.ts rowsHere).
 */
export function useDesktopApp(): boolean {
  const mounted = useMounted();
  return mounted && isDesktopApp();
}
