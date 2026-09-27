"use client";

// Keeps the desktop app's Discord status in step with the reader's chosen
// mode and the page. Mounted once in the root layout (Today is app/page.tsx,
// outside the (app) group, and it is where the app opens). Renders nothing,
// and does nothing at all outside the desktop app or while Discord status is
// off.
//
// Waits a moment after each navigation before describing the page: Next sets
// document.title after the new page renders, and the page's own markup says
// where the reader is. The wait also turns a quick run through several
// chapters into one update; the desktop app coalesces again before Discord
// sees anything (about five updates in twenty seconds, discord.rs).
//
// Reading, with the live bar on, also listens to the scroll, at most once a
// second, and sends only when the whole-number percent changes.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePlusCustom } from "@/components/desktop/usePlusCustom";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { clearPresence, isDesktopApp, setPresence } from "@/lib/desktop/bridge";
import { assemblePresence, readPlace } from "@/lib/desktop/presenceAssemble";
import { effectiveMode, progressPercent } from "@/lib/desktop/presenceModes";
import { readPresencePrefs, usePresencePrefs } from "@/lib/desktop/presencePref";

const SETTLE_MS = 1200;
const SCROLL_MS = 1000;

export function DesktopPresenceBridge() {
  const pathname = usePathname() ?? "/";
  const [prefs] = usePresencePrefs();
  const plus = usePlusCustom();
  const [style] = useCalendarStyleDefault();
  const { t, locale } = useTranslate();
  const lastKey = useRef<string | null>(null);
  const [moved, setMoved] = useState(0);

  const { base } = effectiveMode(prefs, plus.allowed);
  const tracking = base === "reading" && prefs.showPlace && prefs.liveBar;

  // The live bar: a new percent is a new picture on Discord.
  useEffect(() => {
    if (!isDesktopApp() || !tracking) return;
    let last = -1;
    let timer = 0;
    const measure = () => {
      timer = 0;
      const place = readPlace(pathname);
      if (!place) return;
      const p =
        place.kind === "scripture"
          ? progressPercent(place.chapter, place.chapters, place.fraction)
          : progressPercent(place.section, place.sections, place.fraction);
      if (p !== last) {
        last = p;
        setMoved((n) => n + 1);
      }
    };
    const onScroll = () => {
      if (!timer) timer = window.setTimeout(measure, SCROLL_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname, tracking]);

  useEffect(() => {
    if (!isDesktopApp()) return;
    // Read the stored choice itself, not the render's. While the page
    // hydrates, the store answers with the server's snapshot, which is off,
    // and acting on that cleared the status on every page load only to set
    // it again a second later: Discord flickered, and the desktop app let go
    // of its connection in between, which could leave it offline for its
    // fifteen-second retry.
    const current = readPresencePrefs();
    if (effectiveMode(current, plus.allowed).base === "off") {
      if (lastKey.current !== "") {
        lastKey.current = "";
        void clearPresence();
      }
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void assemblePresence({
        prefs: current,
        plusAllowed: plus.allowed,
        pathname,
        title: document.title,
        t,
        style: style === "old" ? "old" : "new",
        locale,
      }).then((request) => {
        if (cancelled || !request) return;
        const key = JSON.stringify(request);
        if (key === lastKey.current) return;
        lastKey.current = key;
        void setPresence(request);
      });
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [base, pathname, prefs, plus.allowed, style, t, locale, moved]);

  return null;
}
