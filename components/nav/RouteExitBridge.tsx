"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { endRouteExit } from "@/lib/ui/routeTransition";

/**
 * Clears the route-exit flag when a navigation commits.
 *
 * Mounted ONCE in the root layout rather than inside app/(app)/template.tsx,
 * for two reasons. Today (app/page.tsx) sits outside the (app) group and has
 * no template, so a template-scoped clear would leave a tap into Today faded
 * out until the watchdog fired. And a single root-level mount cannot be
 * forgotten when a new route group is added later.
 *
 * Keyed on `usePathname()`, not `useSearchParams()`. A filter change that only
 * rewrites the query string is not a page transition and must not start or
 * clear one; usePathname also avoids the static-export CSR bailout that
 * useSearchParams forces.
 *
 * Renders nothing.
 */
export function RouteExitBridge() {
  const pathname = usePathname();

  useEffect(() => {
    endRouteExit();
  }, [pathname]);

  // Belt and braces: a hard unmount (the app backgrounded, the shell torn
  // down) must not leave the flag set for the next cold render.
  useEffect(() => endRouteExit, []);

  return null;
}
