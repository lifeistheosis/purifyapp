"use client";

// Holds the app's first screen until the language it opens in is known.
//
// The apps are built in English and corrected on the device. Drawn at once,
// Today was drawn in English and then drawn again in the reader's language,
// with the splash already gone (lib/i18n/launchLanguage.ts has the
// measurements). Held here it is drawn once, in the right language. For a
// phone set to English the wait is the time it takes to ask the device what
// it remembers, a few milliseconds.
//
// It arms the wait's own deadline when it mounts, so a fault in the code
// that should settle the language can delay the first screen and never
// withhold it.

import { use, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";

import {
  armLanguageDeadline,
  languageSettled,
  languageSettledPromise,
  subscribeLanguageSettled,
} from "@/lib/i18n/launchLanguage";
import { FRONT_DOOR_MARK } from "@/lib/nav/entry";
import { isNativeClient } from "@/lib/platform/native";

/** The server draws nothing behind this gate, so it has nothing to settle. */
function notOnTheServer(): boolean {
  return false;
}

export function LaunchLanguageGate({ children }: { children: ReactNode }) {
  const settled = useSyncExternalStore(
    subscribeLanguageSettled,
    languageSettled,
    notOnTheServer,
  );
  useEffect(() => {
    armLanguageDeadline();
  }, []);
  return settled ? <>{children}</> : null;
}

/**
 * Every other screen of the apps, reached before the opening language is on
 * the screen (Updates 80 and 82, 1.9).
 *
 * The apps load one document, the front door's, and reach every other screen
 * by the router (scripts/lib/shell-server.mjs). A screen opened straight
 * away, as a notification or a link opens one, was drawn at once, before the
 * reader's words had come, so it was drawn in English and again in their
 * language a moment later: Community's sign-in link in Arabic moved 20.5px
 * sideways and the tab bar's labels changed under it
 * (docs/handoffs/updates-79.md, step 3). The gate above holds only Today.
 *
 * This suspends such a screen until the language is settled. The router's
 * move to it is a transition, and a transition that suspends keeps the screen
 * it came from: the front door under the launch slate. So the slate covers
 * the wait, and the screen is drawn once, in the reader's language and faces.
 * The settled mark is set after the commit that draws the reader's words
 * (LocaleBootstrap), and it has its own deadline (lib/i18n/launchLanguage.ts),
 * so the worst a fault can do is open the screen late, never withhold it.
 *
 * How it knows (Updates 82). Updates 80 held on IS_STATIC_EXPORT and the
 * address. The first is a server-only flag that says "the website" in every
 * client bundle (lib/platform/buildTarget.ts), so the hold was never on the
 * phone, and the screen went into the page in English in 7 of 9 opens
 * (docs/handoffs/updates-81.md, step 2). The second is the address the app was
 * opened at from its first render, while the front door is still what is
 * drawn (Next reads the router's first address from the location), so it
 * cannot tell the front door from the screen. So, here: the apps by the
 * device (isNativeClient), the screen by what the router renders (its
 * segments: none for Today, the front door), and only when the page was
 * opened on the front door's document. A screen whose own document was
 * opened is drawn by its first render, and holding a later render of it would
 * hold the very commit that settles the language.
 */
export function RouteLanguageHold({ children }: { children: ReactNode }) {
  // The device's answer is the same for the page's whole life, so the hold is
  // either always in the tree or never; the website and the server never ask
  // the router anything here.
  return isNativeClient() ? <HoldInTheApps>{children}</HoldInTheApps> : <>{children}</>;
}

function HoldInTheApps({ children }: { children: ReactNode }) {
  const onAScreen = (useSelectedLayoutSegments()?.length ?? 0) > 0;
  if (onAScreen && !languageSettled() && document.querySelector(FRONT_DOOR_MARK) !== null) {
    use(languageSettledPromise());
  }
  return <>{children}</>;
}
