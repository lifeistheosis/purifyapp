"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { isAutomatedAgent } from "@/lib/analytics/bot";
import { tagFromSearch, withoutTag } from "@/lib/analytics/tag";
import { isDesktopApp } from "@/lib/desktop/bridge";

/**
 * Anonymous visit tracker. Generates an ephemeral per-tab session id (kept in
 * sessionStorage, no cookie, no PII), and pings /api/track on first load, on
 * every route change, and on a heartbeat so the admin Live View knows who is
 * currently on the site. Fire-and-forget; never blocks or errors the page.
 *
 * Uses apiFetch, not a bare relative fetch: inside the Capacitor shell the app
 * is served from https://localhost with app/api stashed out of the static
 * export, so a relative "/api/track" 404s into the swallowed catch below. That
 * made 100% of Android usage invisible to every dashboard. apiFetch rewrites
 * the path to SITE_URL when native; /api/track answers the CORS preflight and
 * exempts the shell origins from its Sec-Fetch-Site guard.
 *
 * Nothing is sent until the tab has had real input: a pointer move or press, a
 * touch, a key, or a wheel turn. A crawler that renders the page and leaves
 * never makes one. On 2026-09-29 a headless scraper borrowing a normal desktop
 * Chrome user agent opened 706 pages from Singapore, one page per session, sat
 * still for twenty seconds on each and left, and doubled the day's visits.
 * Scroll is not on the list because a script can scroll a page; `isTrusted`
 * drops input a page script dispatches. Once a tab has had input it is
 * remembered in sessionStorage, so later page loads in that tab count at once.
 * Automation that names itself (navigator.webdriver, a bot or headless user
 * agent) is never counted, input or not.
 *
 * Two things the page says about itself with a page view, both on the privacy
 * page (lib/analytics/tag.ts has the whole of it):
 *   - the link tag, when the link that brought the reader ended in one
 *     (?via=email-release-1.5). It is read once, kept for the tab, and taken
 *     off the address so a copied link does not carry it to somebody else.
 *   - that this is the Windows app, whose user agent does not say so.
 */
const HUMAN_KEY = "purify:human";
const TAG_KEY = "purify:via";
const HUMAN_INPUT = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel"] as const;

function getSessionId(): string {
  try {
    const k = "purify:sid";
    let id = sessionStorage.getItem(k);
    if (!id) {
      id =
        (globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(36).slice(2) + Date.now().toString(36));
      sessionStorage.setItem(k, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function looksAutomated(): boolean {
  try {
    if (navigator.webdriver) return true;
    const brands = (
      navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }
    ).userAgentData?.brands
      ?.map((b) => b.brand)
      .join(", ");
    return isAutomatedAgent(navigator.userAgent, brands);
  } catch {
    return false;
  }
}

/**
 * Read the link tag off the address, keep it for this tab, and take it off
 * the address. Safe to call on every page: with no tag it does nothing.
 */
function takeTag() {
  try {
    const tag = tagFromSearch(window.location.search);
    if (!tag) return;
    if (!sessionStorage.getItem(TAG_KEY)) sessionStorage.setItem(TAG_KEY, tag);
    window.history.replaceState(window.history.state, "", withoutTag(window.location.href));
  } catch {
    // Storage or history blocked: the visit is counted without its tag.
  }
}

function keptTag(): string | null {
  try {
    return sessionStorage.getItem(TAG_KEY);
  } catch {
    return null;
  }
}

function tabHasHadInput(): boolean {
  try {
    return sessionStorage.getItem(HUMAN_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberInput() {
  try {
    sessionStorage.setItem(HUMAN_KEY, "1");
  } catch {
    // Storage blocked: this page still counts, the next one waits for input.
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const sentRef = useRef<string | null>(null);
  const humanRef = useRef(false);

  // One pageview per path, and only once a person is confirmed.
  const record = useCallback(() => {
    const path = pathRef.current;
    if (!humanRef.current || !path || path.startsWith("/admin")) return;
    if (sentRef.current === path) return;
    sentRef.current = path;
    const tag = keptTag();
    const body = JSON.stringify({
      sessionId: getSessionId(),
      path,
      referrer: document.referrer || null,
      ...(tag ? { tag } : {}),
      ...(isDesktopApp() ? { app: "desktop" } : {}),
    });
    void apiFetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, []);

  // Record every path change. The tag is taken first, so the page view that
  // starts the visit carries it.
  useEffect(() => {
    takeTag();
    pathRef.current = pathname;
    record();
  }, [pathname, record]);

  // Wait for a person, then record the page they are on.
  useEffect(() => {
    if (looksAutomated()) return;
    const confirm = () => {
      humanRef.current = true;
      record();
    };
    if (tabHasHadInput()) {
      confirm();
      return;
    }
    const opts = { capture: true, passive: true } as const;
    const stop = () => {
      for (const t of HUMAN_INPUT) window.removeEventListener(t, onInput, opts);
    };
    const onInput = (e: Event) => {
      if (!e.isTrusted) return;
      stop();
      rememberInput();
      confirm();
    };
    for (const t of HUMAN_INPUT) window.addEventListener(t, onInput, opts);
    return stop;
  }, [record]);

  // Heartbeat so "live now" stays accurate while a reader lingers on one page.
  useEffect(() => {
    const id = setInterval(() => {
      if (!humanRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (pathname?.startsWith("/admin")) return;
      void apiFetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), path: pathname }),
        keepalive: true,
      }).catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, [pathname]);

  return null;
}
