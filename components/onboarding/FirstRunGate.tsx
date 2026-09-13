"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { shouldShowOnboarding } from "@/lib/onboarding/state";
import { OnboardingFlow } from "./OnboardingFlow";

/**
 * Decides — on the client, after hydration — whether a genuinely new
 * visitor should see the first-run overlay. Mounted globally in the root
 * layout but shown only on the Today home route ("/"): a new user who deep
 * links to /signin, a /bible passage, or a shared page should land on that
 * page, not behind a full-screen onboarding wall. They'll meet onboarding
 * the next time they reach home. Returns nothing for returning users (see
 * the prior-use heuristic in `lib/onboarding/state.ts`).
 */
export function FirstRunGate() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Client-only: localStorage + the prior-use heuristic aren't available
    // during SSR, so the decision must happen after mount.
    if (pathname === "/" && shouldShowOnboarding()) setShow(true);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!show) return null;
  return <OnboardingFlow onDone={() => setShow(false)} />;
}
