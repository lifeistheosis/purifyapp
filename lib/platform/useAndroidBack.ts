"use client";

// Make the Android hardware back button dismiss a history-less overlay
// (a sheet or full-screen dialog that isn't its own browser route) instead
// of falling through to WebView history — which, with nothing to go back to,
// feels like the screen is stuck or quietly exits the app.
//
// Only active inside the native shell and only while `active` is true. The
// @capacitor/app import is dynamic so the plugin never enters the web bundle
// (same guard pattern as NativeBridge / lib/auth/nativeGoogle).
//
// Note: this is for overlays with no browser history of their own. Things that
// are real routes (e.g. the /pricing paywall) should NOT use this — there the
// default back behaviour (navigate to the previous page) is correct.

import { useEffect, useRef } from "react";

import { isNativeClient } from "@/lib/platform/native";

// How many sheets and dialogs hold the phone's Back just now. Counted as each
// becomes active, not as its listener is registered (which is later, and
// asynchronous), so the answer is right from the frame the sheet opens.
let owners = 0;

/**
 * True while a sheet or a dialog has taken the phone's Back for itself. The
 * page's own Back (components/nav/RouteTransition.tsx, 1.9) asks, and stands
 * aside: every listener hears the button, and a press that closes a sheet
 * must not also leave the page.
 */
export function overlayOwnsBack(): boolean {
  return owners > 0;
}

export function useAndroidBack(active: boolean, onBack: () => void): void {
  // Keep the latest onBack in a ref so the effect below depends ONLY on
  // `active`. Callers almost always pass a fresh arrow each render (e.g.
  // `onClose={() => setOpen(false)}`); if the effect depended on `onBack` it
  // would tear down and re-register the native backButton listener on EVERY
  // render — a burst of @capacitor/app bridge calls, and (because the async
  // registration races the synchronous cleanup) a leak of listeners that keep
  // firing. That churn could leave an overlay un-dismissable on the device
  // ("dark screen stuck" on the reader-settings sheet).
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active || !isNativeClient()) return;
    owners += 1;
    let disposed = false;
    let remove: (() => void) | undefined;
    void (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", () =>
        onBackRef.current(),
      );
      // If the effect was cleaned up before registration finished, remove the
      // handle we just added so it can't leak.
      if (disposed) {
        void handle.remove();
        return;
      }
      remove = () => void handle.remove();
    })();
    return () => {
      owners -= 1;
      disposed = true;
      remove?.();
    };
  }, [active]);
}
