"use client";

// Keeps the desktop app's Discord status in step with the page. Mounted once
// in the root layout (Today is app/page.tsx, outside the (app) group, and it
// is where the app opens). Renders nothing, and does nothing at all outside
// the desktop app or while the reader has not turned Discord status on.
//
// Waits a moment after each navigation before describing the page: Next sets
// document.title after the new page renders, and a saint's name comes from
// the title. The wait also turns a quick run through several chapters into
// one update; the desktop app coalesces again before Discord sees anything.

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { activityFor, activityKey } from "@/lib/desktop/activity";
import { clearPresence, isDesktopApp, setPresence } from "@/lib/desktop/bridge";
import { usePresenceLevel } from "@/lib/desktop/presencePref";

const SETTLE_MS = 1200;

export function DesktopPresenceBridge() {
  const pathname = usePathname() ?? "/";
  const [level] = usePresenceLevel();
  const { t } = useTranslate();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isDesktopApp()) return;
    if (level === "off") {
      if (lastKey.current !== "") {
        lastKey.current = "";
        void clearPresence();
      }
      return;
    }
    const timer = window.setTimeout(() => {
      const activity = activityFor(pathname, level, document.title);
      const key = activityKey(activity);
      if (!activity || key === lastKey.current) return;
      lastKey.current = key;
      void setPresence({
        details: t(`desktop.presence.${activity.kind}`),
        state: activity.subject,
        path: activity.path,
        buttonLabel: t(activity.path === "/" ? "desktop.presence.buttonHome" : "desktop.presence.button"),
      });
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, level, t]);

  return null;
}
