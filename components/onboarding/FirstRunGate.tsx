"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  accountAnsweredThisVersion,
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
import { mobileStore } from "@/lib/platform/mobileWeb";
import { createClient } from "@/lib/supabase/client";
import { OnboardingFlow, type OnboardingStart } from "./OnboardingFlow";

/** A signed-in account this young that has not answered is a new sign-up. */
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

/**
 * Decides, on the client after hydration, whether the onboarding overlay
 * shows, and which way in the reader gets. Mounted globally in the root
 * layout but shown only on the home route ("/"): a visitor who deep links to
 * a /bible passage or a shared page lands on that page, not behind a
 * full-screen wall, and meets the onboarding the next time they reach home.
 * The Windows app never rests on "/" (it opens on DESKTOP_HOME,
 * lib/desktop/homeRedirect.ts), so there its home counts too.
 *
 * From 1.5.2 everyone who has not been through THIS version of the questions
 * is asked, a reader with an account included (the owner, 2026-10-05; the
 * record is on ONBOARDING_VERSION in lib/onboarding/state.ts). Four ways in,
 * in order:
 *
 *   1. Mid-flow across a sign-in redirect (the resume stage): straight back
 *      to the first question.
 *   2. Signed in, and the account already answered this version on another
 *      device: those answers are taken and nothing is asked.
 *   3. Signed in. A brand-new account that never saw the flow (signed up on
 *      /signup, or with Google from /signin) gets the questions only, since
 *      the specification puts them after authentication. An account from
 *      before this version gets the short way in for a reader who is back:
 *      "We updated our onboarding", then the questions, with what they
 *      answered before marked and nothing they have set reset.
 *   4. Signed out: the whole flow, from the welcome. That is a new visitor,
 *      and now also a reader who has used Purify on this device without an
 *      account, who used to be passed over.
 *
 * The mobile website is different (the owner, 2026-09-29): on a phone or
 * tablet in a browser the front page is there to send people to the app, "and
 * then when they try to make an account THEN you start the onboarding". So
 * there way 4 never fires; instead the flow opens on /signup, at the account
 * step, for a visitor who is not signed in and has not been through it. Ways
 * 1 to 3 still apply, since each follows an account.
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
    const mobileWeb = mobileStore() !== null;
    const home = pathname === "/" || (pathname === DESKTOP_HOME && isDesktopApp());
    const signup = mobileWeb && pathname === "/signup";
    if (!home && !signup) return;
    let alive = true;
    void (async () => {
      if (signup) {
        if (isOnboarded()) return;
        try {
          const {
            data: { session },
          } = await createClient().auth.getSession();
          if (session) return;
        } catch {
          /* no session to read: treat as signed out */
        }
        if (alive) setStart("account");
        return;
      }
      if (readResumeStage()) {
        if (alive) setStart("level");
        return;
      }
      if (isOnboarded()) return;
      try {
        const {
          data: { session },
        } = await createClient().auth.getSession();
        if (session) {
          const space = session.user.user_metadata?.purify_space;
          // Answered already, this version, on another device: take those
          // answers and ask nothing.
          if (accountAnsweredThisVersion(space) && fillSpaceFromAccount(space)) {
            markOnboardedSilently();
            return;
          }
          const created = session.user.created_at ? Date.parse(session.user.created_at) : NaN;
          if (Date.now() - created < NEW_ACCOUNT_WINDOW_MS) {
            setResumeStage("assessment");
            if (alive) setStart("level");
            return;
          }
          // An account from before this version of the questions. What it
          // answered then, on this device or another, is what gets marked.
          fillSpaceFromAccount(space);
          if (alive) setStart("returning");
          return;
        }
      } catch {
        /* no session to read: fall through to the signed-out check */
      }
      if (!mobileWeb && shouldShowOnboarding() && alive) setStart("welcome");
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
        // The apps land on Today, where the first-step card waits. The
        // website's home is the front page, so it goes straight to that
        // step. A skip stays where it is.
        if (dayOne && !native) router.push(dayOne.href);
      }}
    />
  );
}
