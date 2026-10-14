"use client";

// The app icon's shortcuts, on the app's side. Mounted once in the root
// layout, beside NativeBridge; does nothing in ordinary browsers.
//
// A reader holds the icon on the home screen and taps Morning prayers,
// Today's reading or Continue reading. The phone opens the app with an
// address (lib/shortcuts/shortcuts.ts has the list and the why), and this
// takes it to its screen through the router, the only way to an inner screen
// inside the shells.
//
// It listens two ways, because the tap can come at two moments:
//   - the app is already open: "appUrlOpen" says so as it happens;
//   - the tap started the app: the same event is kept until this is
//     listening, and getLaunchUrl answers with the address as well. Either
//     one alone can be missed on one phone or the other, so both are asked
//     and the second telling of the same tap is dropped.
//
// A tap on a home screen widget arrives the same way, with an address of its
// own (lib/widget/open.ts), and is taken to its screen by the same two paths.
//
// Every other URL the app is opened with comes past here too (the Google
// sign-in callback on the iPhone) and is left alone.
//
// The @capacitor/app import is dynamic so the plugin never enters the web
// bundle (same guard pattern as NativeBridge / lib/platform/useAndroidBack).

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { readLastRead } from "@/lib/bible/lastRead";
import { isNativeClient } from "@/lib/platform/native";
import {
  LAUNCH_ASKED_KEY,
  alreadyThere,
  sameTap,
  shortcutFromUrl,
  shortcutTarget,
  type Told,
} from "@/lib/shortcuts/shortcuts";
import { widgetTarget } from "@/lib/widget/open";

/**
 * Whether the launch URL was already asked for since the app was started,
 * writing down that it now has been. Without storage it is asked each time
 * the app comes up, which only shows after a reload inside the shell.
 */
function launchAlreadyAsked(): boolean {
  try {
    if (window.sessionStorage.getItem(LAUNCH_ASKED_KEY)) return true;
    window.sessionStorage.setItem(LAUNCH_ASKED_KEY, "1");
  } catch {
    /* asked again after a reload; see above */
  }
  return false;
}

export function ShortcutListener() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeClient()) return;
    let disposed = false;
    let remove: (() => void) | undefined;
    let last: Told | null = null;

    const open = (url: unknown) => {
      if (disposed || typeof url !== "string") return;
      const id = shortcutFromUrl(url);
      // A widget's tap, when it is not a shortcut's: the screen it opens, or
      // null for every URL that is neither.
      const widget = id ? null : widgetTarget(url);
      if (!id && widget === null) return;
      const now = Date.now();
      if (sameTap(last, url, now)) return;
      last = { url, at: now };
      if (!id) {
        // A widget's tap. push, for the reason below: one that started the
        // app leaves Today underneath it.
        if (widget !== null) router.push(widget);
        return;
      }
      const target = shortcutTarget(id, readLastRead());
      // Continue reading, tapped while the reader is still in that chapter:
      // the app has come forward where it was, and that is the place.
      if (alreadyThere(id, window.location.pathname, target)) return;
      // push, not replace: on a tap that started the app Today stays
      // underneath, so the Android back button has somewhere to go.
      router.push(target);
    };

    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appUrlOpen", (event) => open(event.url));
        // If the effect was cleaned up before registration finished, remove
        // the handle we just added so it can't leak.
        if (disposed) {
          void handle.remove();
          return;
        }
        remove = () => void handle.remove();
        if (launchAlreadyAsked()) return;
        const launch = await App.getLaunchUrl();
        open(launch?.url);
      } catch {
        /* a shortcut that opens Today is better than an app that does not open */
      }
    })();

    return () => {
      disposed = true;
      remove?.();
    };
  }, [router]);

  return null;
}
