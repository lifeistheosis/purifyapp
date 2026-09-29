"use client";

// In a browser, Purify follows the browser's motion setting (the owner's
// decision of 2026-09-29). When that setting is what keeps the site still,
// this says so, once, and offers to turn the animations on. A reader who
// keeps them off is not asked again; either answer is remembered, and the
// Motion row in Settings stays available to change it later.
//
// Browser only: the phone apps ignore the OS hint, and the Windows app has its
// own toggle in Settings. Never on the admin panel, which animates anyway.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import {
  motionPlatform,
  motionPreference,
  osPrefersReducedMotion,
  setMotionPreference,
} from "@/lib/ui/motion";
import { surfaceForPath } from "@/lib/ui/motionPreference";

/** Set once the reader has answered, either way. */
export const MOTION_NOTICE_KEY = "purify.motion.notice";
const SHOW_AFTER_MS = 1500;

function answered(): boolean {
  try {
    return window.localStorage.getItem(MOTION_NOTICE_KEY) === "1";
  } catch {
    // Storage shut: the answer could not be kept, so do not keep asking.
    return true;
  }
}

function remember() {
  try {
    window.localStorage.setItem(MOTION_NOTICE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function MotionNotice() {
  const { t } = useTranslate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (motionPlatform() !== "web") return;
    if (surfaceForPath(window.location.pathname) === "admin") return;
    if (motionPreference() !== "os" || !osPrefersReducedMotion() || answered()) return;
    const timer = window.setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  const close = (turnOn: boolean) => {
    remember();
    if (turnOn) setMotionPreference("on");
    setShow(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="lm-card fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+6rem)] z-[110] mx-auto max-w-md rounded-2xl p-4 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)] ring-1 ring-inset ring-paper/12 md:bottom-6"
      style={CARD_BG}
    >
      <p className="font-sans text-detail leading-[1.5] text-paper/85">{t("motion.notice.body")}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => close(false)}
          className="inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-caption text-paper/65 transition-colors hover:text-paper"
        >
          {t("motion.notice.keepOff")}
        </button>
        <button
          type="button"
          onClick={() => close(true)}
          className="inline-flex min-h-11 items-center rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night transition-colors hover:bg-paper/90"
        >
          {t("motion.notice.turnOn")}
        </button>
      </div>
    </div>
  );
}
