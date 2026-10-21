"use client";

import { useEffect, useRef } from "react";

import { larpOn } from "./larp";
import { MAX_VIEW_MS, scrubLabel, type UsageEvent } from "./usage";

/**
 * Records how the admin is used: the view open and for how long, the buttons
 * pressed in it, and where the next move went. Sent in small batches to
 * /api/admin/usage, which keeps them for admin accounts only.
 *
 * Time counts only while the page is on screen, so a tab left open behind
 * other windows does not read as an hour of reading. Nothing is sent in larp
 * mode, where the numbers on screen are not real use. Anything inside a
 * .adm-sensitive element (names, emails, money) is never read for a label.
 */

const FLUSH_EVERY_MS = 30_000;
const URL = "/api/admin/usage";

export function useUsageLog(active: string): void {
  const queue = useRef<UsageEvent[]>([]);
  const view = useRef<{ tab: string; from: string | null; ms: number; since: number | null } | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // One view closes and the next opens whenever the open tab changes.
  useEffect(() => {
    const now = performance.now();
    const prev = view.current;
    if (prev) {
      if (prev.tab === active) return;
      queue.current.push(closeView(prev, now));
    }
    view.current = {
      tab: active,
      from: prev?.tab ?? null,
      ms: 0,
      since: document.visibilityState === "visible" ? now : null,
    };
  }, [active]);

  useEffect(() => {
    function send(leaving: boolean) {
      if (larpOn()) {
        queue.current = [];
        return;
      }
      const events = queue.current.splice(0, 50);
      if (events.length === 0) return;
      void fetch(URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive: leaving,
        credentials: "same-origin",
      }).catch(() => {});
    }

    function onVisibility() {
      const v = view.current;
      const now = performance.now();
      if (!v) return;
      if (document.visibilityState === "hidden") {
        if (v.since !== null) {
          v.ms += now - v.since;
          v.since = null;
        }
        // Leaving or switching away: close the view so its time is not lost,
        // and reopen it (with no "from") if the page comes back. A glance
        // away and back is not a visit of its own, so under a second is
        // dropped rather than counted as a quick exit.
        const closed = closeView(v, now);
        if (closed.kind === "view" && closed.ms >= 1000) queue.current.push(closed);
        view.current = { tab: v.tab, from: null, ms: 0, since: null };
        send(true);
      } else if (v.since === null) {
        v.since = now;
      }
    }

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("button, a, [role='button']");
      if (!el || !el.closest(".adm") || el.closest(".adm-sensitive")) return;
      const label = scrubLabel(el.getAttribute("aria-label") || el.textContent);
      if (label) queue.current.push({ kind: "action", tab: activeRef.current, label });
    }

    const id = window.setInterval(() => send(false), FLUSH_EVERY_MS);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, true);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, true);
      send(true);
    };
  }, []);
}

function closeView(
  v: { tab: string; from: string | null; ms: number; since: number | null },
  now: number,
): UsageEvent {
  const ms = v.ms + (v.since !== null ? now - v.since : 0);
  return { kind: "view", tab: v.tab, from: v.from, ms: Math.min(MAX_VIEW_MS, Math.max(0, Math.round(ms))) };
}
