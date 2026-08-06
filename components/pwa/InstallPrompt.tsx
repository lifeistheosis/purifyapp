"use client";

import { useEffect, useState } from "react";
import { isOverlayOpen } from "@/lib/ui/overlay";
import { isIos, isStandalone } from "@/lib/pwa/detectBrowser";
import { isNativeClient } from "@/lib/platform/native";
import {
  consumeInstallEvent,
  useInstallStore,
} from "@/lib/pwa/installPromptStore";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Two responsibilities, intentionally co-located so the PWA layer is a
 * single client-component import in the (app) layout:
 *
 *  1. Register `/sw.js` on first mount in production. Skipped on dev so
 *     hot-reload doesn't fight the cache. Idempotent, the browser
 *     de-dupes registrations of the same script URL.
 *  2. Once the user has visited at least three times, surface a
 *     dismissible gold banner above the tab bar that uses the shared
 *     install-prompt store (`lib/pwa/installPromptStore`) to drive the
 *     "Install" button. The desktop CTA uses the same store, so this
 *     mobile banner and the desktop home CTA never race for the
 *     single `beforeinstallprompt` event — whoever the user clicks
 *     first wins, and the other consumer cleanly returns null.
 *
 *  iOS Safari doesn't fire `beforeinstallprompt`, so iOS users see a
 *  tailored "Add to Home Screen" hint after a few visits.
 *
 *  Local-storage keys (kept in `purify_*` namespace, never sent to the
 *  server):
 *    - purify_install_visits       , incremented per app load
 *    - purify_install_dismissed_at , epoch ms of last dismiss; banner
 *                                     stays hidden for 30 days after
 *
 *  No analytics fire from this component. The banner is local UI only.
 */

const KEY_VISITS = "purify_install_visits";
const KEY_DISMISSED = "purify_install_dismissed_at";
const MIN_VISITS = 3;
const HIDE_AFTER_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const { t } = useTranslate();
  const { event: bip } = useInstallStore();
  const [eligible, setEligible] = useState(false);
  // Lazy initializer, read once at mount.
  const [iosHintEligible] = useState<boolean>(() => isIos());
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 1. Service-worker lifecycle.
  //    Web (purifyapp.net): register /sw.js in production for offline + push.
  //    Native (Capacitor shell): NEVER register, and actively tear down any SW
  //    a prior build (or an earlier web visit to the same origin) left behind.
  //    Capacitor already serves the bundled app locally and offline, but the
  //    WebView's Cache Storage survives app updates — a lingering SW keeps
  //    serving the previous bundle's HTML/JS after the store update lands, so
  //    the app "won't update" until its cache is evicted. Unregistering + wiping
  //    the SW caches here heals testers already stuck on an old bundle on their
  //    next launch. Native push runs through @capacitor/push-notifications, not
  //    this SW, so nothing is lost.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (isNativeClient()) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {
          /* swallow */
        });
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {
            /* swallow */
          });
      }
      return;
    }

    if (process.env.NODE_ENV !== "production") return;
    // Fire-and-forget. Errors here are non-fatal: PWA is an enhancement.
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* swallow */
    });
  }, []);

  // 2. Track visits + decide whether the banner is eligible to show.
  // Eligibility is independent of whether the install event has fired:
  // on Chromium, the event drives the Install button; on iOS the hint
  // string drives the banner. Either way, we need MIN_VISITS first.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already installed, or running inside the native store app — in
    // either case there is nothing to install.
    if (isStandalone() || isNativeClient()) return;

    // Bump visit count.
    let visits = 0;
    try {
      visits = Number(localStorage.getItem(KEY_VISITS) ?? "0") + 1;
      localStorage.setItem(KEY_VISITS, String(visits));
    } catch {
      return; // localStorage blocked → don't surface anything.
    }

    // Respect a recent dismiss.
    try {
      const dismissedAt = Number(
        localStorage.getItem(KEY_DISMISSED) ?? "0",
      );
      if (dismissedAt && Date.now() - dismissedAt < HIDE_AFTER_DISMISS_MS) {
        return;
      }
    } catch {
      /* ignore */
    }

    if (visits < MIN_VISITS) return;

    // Eligible. The Chromium "Install" button waits for `bip` from the
    // store; iOS users see the Share-and-Add hint instead. Both state
    // flips deferred via 0-delay so they happen *outside* the effect
    // body (react-hooks/set-state-in-effect).
    const tmEligible = setTimeout(() => setEligible(true), 0);
    let tmIos: ReturnType<typeof setTimeout> | null = null;
    if (iosHintEligible) {
      tmIos = setTimeout(() => setIosHint(true), 0);
    }
    return () => {
      clearTimeout(tmEligible);
      if (tmIos) clearTimeout(tmIos);
    };
  }, [iosHintEligible]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY_DISMISSED, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
    setIosHint(false);
  };

  const install = async () => {
    // Use the shared store — if the desktop CTA prompted first, we
    // get null back and gracefully dismiss instead of throwing.
    const ev = consumeInstallEvent();
    if (!ev) {
      dismiss();
      return;
    }
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch {
      /* ignore */
    }
    dismiss();
  };

  // Show only when eligible, not dismissed, and we actually have
  // something useful to offer (an install event on Chromium, or the
  // iOS hint).
  const show = eligible && !dismissed && (Boolean(bip) || iosHint);
  if (!show) return null;
  // Don't compete with an open sheet / verse toolbar, those are
  // mid-task UI; the install banner can wait.
  if (isOverlayOpen()) return null;

  return (
    <div
      role="dialog"
      aria-label="Add Purify to your home screen"
      className="md:hidden fixed inset-x-3 z-[55]"
      style={{
        bottom:
          "calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <div className="rounded-2xl border border-gold/45 bg-night/95 backdrop-blur shadow-[0_12px_36px_rgba(0,0,0,0.55)] p-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-detail font-semibold text-paper leading-tight">
            {t("ui.addPurifyToYourHome")}
          </p>
          <p className="mt-1 font-sans text-caption text-paper/70 leading-[1.5]">
            {iosHint
              ? "Tap Share, then Add to Home Screen."
              : "Install for a full-screen, offline-ready app."}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {!iosHint && bip ? (
            <button
              type="button"
              onClick={install}
              className="rounded-pill bg-gold text-night font-sans text-detail font-semibold px-4 py-2"
            >
              {t("ui.install")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("translationDisclaimer.dismiss")}
            className="h-8 w-8 rounded-pill text-paper/60 hover:text-paper inline-flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
