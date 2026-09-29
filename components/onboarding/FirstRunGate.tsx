"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  fillSpaceFromAccount,
  isOnboarded,
  markOnboardedSilently,
  readResumeStage,
  setResumeStage,
  shouldShowOnboarding,
} from "@/lib/onboarding/state";
import { isDesktopApp } from "@/lib/desktop/bridge";
import { DESKTOP_HOME } from "@/lib/desktop/homeRedirect";
import { useIsNative } from "@/lib/platform/native";
import { createClient } from "@/lib/supabase/client";
import { OnboardingFlow, type OnboardingStart } from "./OnboardingFlow";

/** A signed-in account this young that has not answered is a new sign-up. */
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

/**
 * Decides, on the client after hydration, whether the first-run overlay
 * shows. Mounted globally in the root layout but shown only on the home route
 * ("/"): a new visitor who deep links to a /bible passage or a shared page
 * lands on that page, not behind a full-screen wall, and meets onboarding the
 * next time they reach home. The Windows app never rests on "/" (it opens on
 * DESKTOP_HOME, lib/desktop/homeRedirect.ts), so there its home counts too.
 *
 * Three ways in, in order:
 *   1. Mid-flow across a sign-in redirect (the resume stage): straight back
 *      to the first question.
 *   2. A brand-new account that never saw the flow (signed up on /signup, or
 *      with Google from /signin): the questions only, since they are signed
 *      in already. The specification puts them after authentication.
 *   3. A genuinely new visitor: the whole flow, from the welcome.
 * Returning readers see nothing (the prior-use heuristic in state.ts).
 */
export function FirstRunGate({
  catechismAvailable = false,
}: {
  /** Whether the question bank holds anything; decided by the root layout
   *  on the server, so the overlay never advertises an empty page. */
  catechismAvailable?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const native = useIsNative();
  const [start, setStart] = useState<OnboardingStart | null>(null);

  useEffect(() => {
    const home = pathname === "/" || (pathname === DESKTOP_HOME && isDesktopApp());
    if (!home) return;
    let alive = true;
    void (async () => {
      if (readResumeStage()) {
        if (alive) setStart("level");
        return;
      }
      if (!isOnboarded()) {
        try {
          const {
            data: { session },
          } = await createClient().auth.getSession();
          const created = session?.user?.created_at ? Date.parse(session.user.created_at) : NaN;
          if (session && Date.now() - created < NEW_ACCOUNT_WINDOW_MS) {
            // Answered already, on another device: take those answers.
            if (fillSpaceFromAccount(session.user.user_metadata?.purify_space)) {
              markOnboardedSilently();
              return;
            }
            setResumeStage("assessment");
            if (alive) setStart("level");
            return;
          }
        } catch {
          /* no session to read: fall through to the ordinary check */
        }
      }
      if (shouldShowOnboarding() && alive) setStart("welcome");
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (!start) return null;
  return (
    <OnboardingFlow
      startAt={start}
      catechismAvailable={catechismAvailable}
      onDone={(dayOne) => {
        setStart(null);
        // The apps land on Today, where the Day 1 card waits. The website's
        // home is the front page, so it goes straight to the Day 1 step.
        // A skip stays where it is.
        if (dayOne && !native) router.push(dayOne.href);
      }}
    />
  );
}
