"use client";

// Native-shell glue, mounted once in the root layout. Does nothing in
// ordinary browsers; inside the Capacitor app it
//   1. hides the launch splash as soon as the web app has painted
//      (config launchAutoHide is the fallback if this never runs), and
//   2. keeps the status bar with the page: the strip behind it the page
//      colour of the palette worn, and the clock and battery marks light or
//      dark to suit what is behind them (./statusBar.ts), so the system
//      chrome reads as part of the app, and
//   3. re-registers for push when reminders are on, so a token Apple or
//      Google has changed reaches the server (lib/push/native.ts), and again
//      after a sign-in, so the phone belongs to the account now signed in,
//      and when the app comes back to the front in another time zone,
//   4. gives a tapped notification its way into the app: the router. A
//      hard navigation inside the shell is always handed the front door, so
//      a tap that navigated by itself opened Today (lib/push/open.ts). The
//      tap is listened for from the start, reminders on or not, and
//   5. puts right the hard loads that still happen (a reload after a password
//      change, a window.location move): the app comes up as the front door
//      under another screen's address, and the router is asked for the screen
//      the address names (lib/nav/entry.ts), and
//   6. says on the page when one of its fields has the on-screen keyboard
//      (lib/ui/keyboardFlag.ts), so nothing fixed at the foot of the screen
//      stands over the keyboard (app/globals.css, "The reader's own keyboard").
//
// The @capacitor/* JS proxies are safe to import in the web bundle, but
// every call is gated on isNativeClient() because their web fallbacks
// throw "not implemented" for status-bar/splash.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { whenLanguageSettled } from "@/lib/i18n/launchLanguage";
import { ENTRY_KEY, FRONT_DOOR_MARK, entryAction } from "@/lib/nav/entry";
import { INTRO_BUILD_MS, INTRO_QUICK_BUILD_MS, LIFT_ANYWAY_MS } from "@/lib/platform/launchFrame";
import { isNativeClient, nativePlatform } from "@/lib/platform/native";
import { listenForTaps, refreshNative, refreshNativeIfMoved, relinkNative } from "@/lib/push/native";
import { onlyTheHashChanges, setPushOpener } from "@/lib/push/open";
import { createClient } from "@/lib/supabase/client";
import { followKeyboard } from "@/lib/ui/keyboardFlag";

import { followStatusBar } from "./statusBar";

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
    // And the tap itself, from the first moment, whether or not reminders are
    // on: a notification that launched the app is waiting for exactly this
    // (lib/push/native.ts, listenForTaps). After the opener, so the tap finds
    // it. Once per app life; the router changing again does not add another.
    void listenForTaps();
    return () => {
      cancelAnimationFrame(frame);
      setPushOpener(null);
    };
  }, [router]);

  // Back to the front in another time zone (a flight, with the app waiting in
  // the background): the reminders follow the phone's clock now, not at the
  // next launch (refreshNativeIfMoved sends nothing when the zone is the same).
  useEffect(() => {
    if (!isNativeClient()) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshNativeIfMoved();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // One of the page's fields has the on-screen keyboard: the bars at the foot
  // step away until it has gone (lib/ui/keyboardFlag.ts).
  useEffect(() => {
    if (!isNativeClient()) return;
    return followKeyboard();
  }, []);

  // A sign-in gives this phone to the account now signed in, without waiting
  // for the next launch (relinkNative). The callback only schedules the work:
  // supabase-js runs it inside the auth lock, and an auth call made from in
  // there never returns.
  useEffect(() => {
    if (!isNativeClient()) return;
    const { data } = createClient().auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && id) {
        window.setTimeout(() => void relinkNative(id), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isNativeClient()) return;

    // Mark the document as the native app shell. CSS scopes app-only
    // spacing (bottom tab-bar clearance via .safe-pb, top status-bar inset
    // via .safe-pt) to html.is-native, so the website never gets app
    // padding and the app never ships web chrome. Pairs with the
    // WebOnly/NativeOnly React gates (components/platform/PlatformGate).
    document.documentElement.classList.add("is-native");

    let cancelled = false;
    // Set once the status bar plugin has loaded. Stops following the palette.
    let stopBar = () => {};

    // Set once the logo screen has been lifted, by whichever of the three
    // ways below got there first.
    let lifted = false;
    let anyway: ReturnType<typeof setTimeout> | undefined;
    let playedNet: ReturnType<typeof setTimeout> | undefined;

    const hideSplash = async () => {
      if (cancelled) return;
      lifted = true;
      // Said on the document as well as to the shell, so the moment can be
      // seen from outside: scripts/export-walk.mjs reads what is on the
      // screen at the instant this appears. It is also one of the two marks
      // that take the launch intro away (components/native/LaunchFrame.tsx,
      // app/globals.css).
      document.documentElement.dataset.launch = "ready";
      // The other is the intro's own, set by the document's lines
      // (lib/platform/launchFrame.ts). This sets it too, a full intro after
      // ready, as a net: were those lines never to run, the cover would wait
      // for a mark nobody sets, with the app alive under it. A full intro on
      // the pace the document chose: quick on any open after the day's first.
      const build = document.documentElement.dataset.introPace === "quick" ? INTRO_QUICK_BUILD_MS : INTRO_BUILD_MS;
      playedNet ??= setTimeout(() => {
        document.documentElement.dataset.intro = "played";
      }, build);
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
    //
    // And the reader's language first (1.6). The apps are built in English
    // and corrected on the device, and the first screen is held until that
    // is done (components/i18n/LaunchLanguageGate.tsx). Lifting the splash
    // before it would show an empty page, and before 1.6 it showed Today in
    // English for a moment on every phone set to another language. The wait
    // has its own deadline (lib/i18n/launchLanguage.ts), and the fallback
    // below does not depend on it.
    void whenLanguageSettled().then(() => {
      if (cancelled) return;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          void hideSplash();
        }),
      );
      // And a net under those two frames (1.6). A web view may hold its
      // frames back while the phone's own logo screen is up; then the frames
      // would wait for the logo to go while the logo waited for the frames,
      // and every open would last until the limit below. It is not known that
      // any phone does this, and a computer cannot say. So, a moment after the
      // language is settled, the screen itself is asked for: once it is in the
      // page, the logo goes, frames or no frames. Where frames run they come
      // first and this finds the job done.
      const drawn = () => {
        if (cancelled || lifted) return;
        if (document.querySelector("[data-route-content]")) void hideSplash();
        else anyway = setTimeout(drawn, 50);
      };
      anyway = setTimeout(drawn, LIFT_ANYWAY_MS);
    });
    const fallback = setTimeout(() => void hideSplash(), 4000);

    // Keep the status bar with the page so the system chrome reads as part
    // of the app: the strip the page colour of the palette worn (Android 14
    // and older, where the bar is an opaque strip the app paints), and the
    // marks light or dark to suit what is behind them, on every phone
    // (./statusBar.ts follows; lib/reader/statusBarColor.ts is the rule).
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        // Light marks until what is behind them is known, as the app has always drawn them.
        await StatusBar.setStyle({ style: Style.Dark });
        if (cancelled) return;
        const platform = nativePlatform();
        // No phone named (Capacitor has not said which): the marks stay light and nothing follows.
        if (!platform) return;
        stopBar = followStatusBar({
          platform,
          paintStrip: (color) => StatusBar.setBackgroundColor({ color }),
          // An Android phone gives its strip's colour; an iPhone has no strip, and gives none.
          stripNow: async () => (await StatusBar.getInfo()).color ?? null,
          // The plugin names a style for the ground it is meant for: "Dark" draws light marks, "Light" dark ones.
          drawMarks: (marks) => StatusBar.setStyle({ style: marks === "dark" ? Style.Light : Style.Dark }),
        });
        // NB: we intentionally do NOT call setOverlaysWebView here. Android 16
        // (targetSdk 36) forces edge-to-edge, where that call is a no-op and
        // env(safe-area-inset-top) reads 0, leaving the top bar under the
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
      stopBar();
      clearTimeout(fallback);
      clearTimeout(anyway);
      clearTimeout(playedNet);
      clearTimeout(pushRefresh);
    };
  }, []);

  return null;
}
