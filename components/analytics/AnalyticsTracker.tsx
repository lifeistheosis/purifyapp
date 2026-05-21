"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Anonymous visit tracker. Generates an ephemeral per-tab session id (kept in
 * sessionStorage, no cookie, no PII), and pings /api/track on first load, on
 * every route change, and on a heartbeat so the admin Live View knows who is
 * currently on the site. Fire-and-forget; never blocks or errors the page.
 */
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

export function AnalyticsTracker() {
  const pathname = usePathname();
  const sentRef = useRef<string | null>(null);

  // Record on first mount + every path change.
  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (sentRef.current === pathname) return;
    sentRef.current = pathname;
    const body = JSON.stringify({
      sessionId: getSessionId(),
      path: pathname,
      referrer: document.referrer || null,
    });
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  // Heartbeat so "live now" stays accurate while a reader lingers on one page.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (pathname?.startsWith("/admin")) return;
      void fetch("/api/track", {
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
