"use client";

// Native-shell glue, mounted once in the root layout. Does nothing in
// ordinary browsers; inside the Capacitor app it
//   1. hides the launch splash as soon as the web app has painted
//      (config launchAutoHide is the fallback if this never runs), and
//   2. pins the status bar to the night palette so the system chrome
//      reads as part of the app, and
//   3. re-registers for push when reminders are on, so a token Apple or
//      Google has changed reaches the server (lib/push/native.ts), and
//   4. gives a tapped notification its way into the app: the router. A
//      hard navigation inside the shell is always handed the front door, so
//      a tap that navigated by itself opened Today (lib/push/open.ts), and
//   5. puts right the hard loads that still happen (a reload after a password
//      change, a window.location move): the app comes up as the front door
//      under another screen's address, and the router is asked for the screen
//      the address names (lib/nav/entry.ts).
//
// The @capacitor/* JS proxies are safe to import in the web bundle, but
// every call is gated on isNativeClient() because their web fallbacks
// throw "not implemented" for status-bar/splash.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { ENTRY_KEY, FRONT_DOOR_MARK, entryAction } from "@/lib/nav/entry";
import { isNativeClient } from "@/lib/platform/native";
import { refreshNative } from "@/lib/push/native";
import { onlyTheHashChanges, setPushOpener } from "@/lib/push/open";

const NIGHT = "#101013";

export function NativeBridge() {
  const router = useRouter();
  const entered = useRef(false);

  // A hard load of an inner address. Once, as the app comes up: only the
  // first screen can be the wrong one. Without storage it is left as it
  // always was, because the memory of a failed try is what stops a missing
  // screen from reloading for ever.
  useEffect(() => {
    if (entered.current) return;
    entered.current = true;
    if (!isNativeClient()) return;
    // Is the document that came up the front door's? Asked of the page, not
    // of the build: lib/platform/buildTarget.ts is server only, and in a
    // client bundle it says "the website" whatever was built. The first
    // version of this asked it, and so never ran.
    const frontDoor = document.querySelector(FRONT_DOOR_MARK) !== null;
    let remembered: string | null;
    try {
      remembered = window.sessionStorage.getItem(ENTRY_KEY);
    } catch {
      return;
    }
    const { action, remember } = entryAction({
      shell: frontDoor,
      pathname: window.location.pathname,
      search: window.location.search,
      remembered,
      now: Date.now(),
    });
    try {
      if (remember) window.sessionStorage.setItem(ENTRY_KEY, remember);
      else window.sessionStorage.removeItem(ENTRY_KEY);
    } catch {
      return;
    }
    if (action === "front-door") {
      router.replace("/");
      return;
    }
    if (action !== "refresh") return;
    router.refresh();
    // A try that failed comes back as a hard load within a moment, and finds
    // the note. One that worked is still here: take the note away, so a
    // reader who reloads the same screen again soon is not taken for a
    // failure.
    const forget = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(ENTRY_KEY);
      } catch {
        /* nothing to forget */
      }
      // And the third way it can end: no hard load, and no screen either. If
      // the front door is still what is drawn under the other address, the
      // refresh brought nothing; the front door under its own address is
      // better than Today mislabelled.
      const inner = (window.location.pathname.replace(/\/+$/, "") || "/") !== "/";
      if (inner && document.querySelector(FRONT_DOOR_MARK) !== null) router.replace("/");
    }, 6000);
    return () => window.clearTimeout(forget);
  }, [router]);

  // A tapped notification's way in. Its own effect, so it follows the router
  // and nothing below runs twice for it.
  useEffect(() => {
    if (!isNativeClient()) return;
    let frame = 0;
    setPushOpener((url) => {
      const to = new URL(url, window.location.origin);
      const sameScreen = onlyTheHashChanges(window.location, to);
      router.push(url);
      if (!sameScreen) return;
      // The router changes a # on the screen the reader is already on with
      // pushState, which fires no hashchange, and Community listens for one
      // to open the post. Say it once the address has caught up.
      let tries = 0;
      const say = () => {
        if (window.location.hash === to.hash || tries++ > 30) {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
          return;
        }
        frame = requestAnimationFrame(say);
      };
      frame = requestAnimationFrame(say);
    });
    return () => {
      cancelAnimationFrame(frame);
      setPushOpener(null);
    };
  }, [router]);

  useEffect(() => {
    if (!isNativeClient()) return;

    // Mark the document as the native app shell. CSS scopes app-only
    // spacing (bottom tab-bar clearance via .safe-pb, top status-bar inset
    // via .safe-pt) to html.is-native, so the website never gets app
    // padding and the app never ships web chrome. Pairs with the
    // WebOnly/NativeOnly React gates (components/platform/PlatformGate).
    document.documentElement.classList.add("is-native");

    let cancelled = false;

    const hideSplash = async () => {
      if (cancelled) return;
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        if (!cancelled) await SplashScreen.hide();
      } catch {
        /* fallback timeout covers it */
      }
    };

    // No-flash guarantee: keep the launch splash up until the native shell
    // has actually painted. The SSR HTML is the WEB shell (we default to
    // web so the site stays static for SEO), and React swaps to the app
    // shell right after hydration via useIsNative(). Two animation frames
    // ensure that swap is committed and painted before we lift the splash,
    // so the marketing site is never visible inside the app. A bounded
    // fallback makes sure the splash can never hang (capacitor
    // launchAutoHide is off, so this is the only hide path).
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        void hideSplash();
      }),
    );
    const fallback = setTimeout(() => void hideSplash(), 4000);

    // Pin the status bar to the night palette so the system chrome reads as
    // part of the app (Android; throws on iOS, where the WKWebView
    // background already matches).
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: NIGHT }).catch(() => {});
        // NB: we intentionally do NOT call setOverlaysWebView here. Android 16
        // (targetSdk 36) forces edge-to-edge, where that call is a no-op and
        // env(safe-area-inset-top) reads 0 — leaving the top bar under the
        // clock. @capacitor-community/safe-area (with EdgeToEdge.enable in
        // MainActivity) fixes the insets instead, so the existing
        // env(safe-area-inset-*) paddings work across screens.
      } catch {
        /* status bar styling is cosmetic; never block the app on it */
      }
    })();

    // After the first screen is up, so it never competes with it.
    const pushRefresh = setTimeout(() => void refreshNative(), 3000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      clearTimeout(pushRefresh);
    };
  }, []);

  return null;
}
