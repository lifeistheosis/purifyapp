"use client";

// Ten seconds of Undo before a removal is written (his pick A for Community
// on r3-17, 2026-10-30: "A removal waits ten seconds with Undo before it is
// written"). A client-side delay: nothing is sent until the time is up, so
// Undo needs nothing from the server. The routes' restore actions are still
// there for a removal that was written.
//
// Leaving the page does not cancel a removal he pressed: whatever is still
// waiting is written then, with keepalive so the request outlives the page.

import { useCallback, useEffect, useRef, useState } from "react";

import { UNDO_MS, secondsLeft, type QueueAction, type QueueCall } from "@/lib/admin/communityQueue";

export type PendingRemoval = { key: string; action: QueueAction; until: number };

/** Each call in order; the first that fails stops the rest and says why. */
export async function runCalls(calls: readonly QueueCall[], keepalive = false): Promise<string | null> {
  for (const c of calls) {
    try {
      const r = await fetch(c.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c.body),
        keepalive,
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        return j?.error ?? "That did not go through. Nothing more was changed.";
      }
    } catch {
      return "The network dropped. Nothing more was changed.";
    }
  }
  return null;
}

export function usePendingRemovals(onWritten: (key: string, error: string | null) => void) {
  const [pending, setPending] = useState<Record<string, PendingRemoval>>({});
  const [now, setNow] = useState(0);
  // The timers and the waiting removals, outside React's state so a timer and
  // the page's exit see the same thing.
  const store = useRef<{ timers: Map<string, number>; waiting: Map<string, PendingRemoval> }>({
    timers: new Map(),
    waiting: new Map(),
  });
  const written = useRef(onWritten);
  useEffect(() => {
    written.current = onWritten;
  }, [onWritten]);

  const drop = useCallback((key: string) => {
    const s = store.current;
    const t = s.timers.get(key);
    if (t !== undefined) window.clearTimeout(t);
    s.timers.delete(key);
    s.waiting.delete(key);
    setPending((x) => {
      const next = { ...x };
      delete next[key];
      return next;
    });
  }, []);

  const schedule = useCallback(
    (key: string, action: QueueAction) => {
      const s = store.current;
      if (s.waiting.has(key)) return;
      const p: PendingRemoval = { key, action, until: Date.now() + UNDO_MS };
      s.waiting.set(key, p);
      setPending((x) => ({ ...x, [key]: p }));
      setNow(Date.now());
      s.timers.set(
        key,
        window.setTimeout(() => {
          const due = s.waiting.get(key);
          s.timers.delete(key);
          if (!due) return;
          // Being written now: out of what leaving the page would send, and
          // still on its row, at nought seconds and with no Undo, until the
          // server answers. Dropping it first let the row show its buttons
          // again for the length of the request.
          s.waiting.delete(key);
          setNow(Date.now());
          void runCalls(due.action.calls).then((err) => {
            drop(key);
            written.current(key, err);
          });
        }, UNDO_MS),
      );
    },
    [drop],
  );

  const undo = useCallback((key: string) => drop(key), [drop]);

  // A clock for the countdown, only while something waits.
  const waitingCount = Object.keys(pending).length;
  useEffect(() => {
    if (waitingCount === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [waitingCount]);

  // Leaving writes what he pressed.
  useEffect(() => {
    const s = store.current;
    const flush = () => {
      for (const [key, p] of s.waiting) {
        const t = s.timers.get(key);
        if (t !== undefined) window.clearTimeout(t);
        void runCalls(p.action.calls, true);
      }
      s.waiting.clear();
      s.timers.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const seconds = (key: string) => {
    const p = pending[key];
    return p ? secondsLeft(p.until, now || p.until - UNDO_MS) : 0;
  };

  return { pending, schedule, undo, seconds };
}
