"use client";

import { useEffect, useState } from "react";
import { isOverlayOpen } from "@/lib/ui/overlay";

/**
 * Two responsibilities, intentionally co-located so the PWA layer is a
 * single client-component import in the (app) layout:
 *
 *  1. Register `/sw.js` on first mount in production. Skipped on dev so
 *     hot-reload doesn't fight the cache. Idempotent — the browser
 *     de-dupes registrations of the same script URL.
 *  2. Listen for `beforeinstallprompt` (Chromium / Android), and once
 *     the user has visited at least three times, surface a dismissible
 *     gold banner above the tab bar. iOS Safari doesn't fire this
 *     event, so iOS users get a tailored "Add to Home Screen" hint
 *     after a few visits.
 *
 *  Local-storage keys (kept in `purify_*` namespace, never sent to the
 *  server):
 *    - purify_install_visits        — incremented per app load
 *    - purify_install_dismissed_at  — epoch ms of last dismiss; banner
 *                                     stays hidden for 30 days after
 *
 *  No analytics fire from this component. The banner is local UI only.
 */

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const KEY_VISITS = "purify_install_visits";
const KEY_DISMISSED = "purify_install_dismissed_at";
const MIN_VISITS = 3;
const HIDE_AFTER_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS-specific
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  // Lazy initializer — read once at mount. The ref-style state lets us
  // toggle the iOS hint on a real user interaction (the visit-count
  // gate) without falling into the React 19 "setState in effect"
  // anti-pattern that the new lint rule flags.
  const [iosHintEligible] = useState<boolean>(() => isIos());
  const [iosHint, setIosHint] = useState(false);

  // 1. Register the service worker.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    // Fire-and-forget. Errors here are non-fatal: PWA is an enhancement.
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* swallow */
    });
  }, []);

  // 2. Track visits + decide whether to surface the banner.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

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
      const dismissed = Number(localStorage.getItem(KEY_DISMISSED) ?? "0");
      if (dismissed && Date.now() - dismissed < HIDE_AFTER_DISMISS_MS) return;
    } catch {
      /* ignore */
    }

    if (visits < MIN_VISITS) return;

    // Chromium / Android path.
    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari path (no beforeinstallprompt). We toggle the hint via a
    // 0-delay timer so the state transition happens *outside* the effect
    // body — see react-hooks/set-state-in-effect.
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (iosHintEligible) {
      iosTimer = setTimeout(() => setIosHint(true), 0);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [iosHintEligible]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY_DISMISSED, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
    setIosHint(false);
  };

  const install = async () => {
    if (!bip) return;
    try {
      await bip.prompt();
      await bip.userChoice;
    } catch {
      /* ignore */
    }
    dismiss();
  };

  if (!show && !iosHint) return null;
  // Don't compete with an open sheet / verse toolbar — those are
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
          <p className="font-sans text-[13.5px] font-semibold text-paper leading-tight">
            Add Purify to your home screen
          </p>
          <p className="mt-1 font-sans text-[12px] text-paper/70 leading-[1.5]">
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
              className="rounded-pill bg-gold text-night font-sans text-[13px] font-semibold px-4 py-2"
            >
              Install
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="h-8 w-8 rounded-pill text-paper/60 hover:text-paper inline-flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
