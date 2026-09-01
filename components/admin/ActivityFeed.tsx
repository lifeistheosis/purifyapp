"use client";

import { useEffect, useRef, useState } from "react";

import { useLiveData } from "@/lib/admin/useLiveData";
import { useReducedMotion } from "@/lib/ui/motion";
import {
  diffActivity,
  dwellMs,
  trim,
  type ActivityEvent,
  type ActivityKind,
  type ActivitySnapshot,
} from "@/lib/admin/activity";

/**
 * The activity bar. What just happened, as it happens, then gone.
 *
 * It replaced a bell that opened nothing. A count behind a bell asks the
 * operator to go and look; this tells them, and then stops taking up the
 * screen. Nothing here is clickable and nothing accumulates: an event that has
 * faded is not stored anywhere, because a list that has to be cleared is a
 * chore, and the numbers underneath are the real record either way.
 *
 * EVERY ROW IS A REAL CHANGE. lib/admin/activity.ts derives them by diffing
 * consecutive polls of endpoints the panel already reads. Nothing is invented,
 * and a quiet hour shows an empty bar rather than filler.
 *
 * MOTION COMES FROM useReducedMotion, not from a media query. This panel
 * decides motion per surface in JS and deliberately animates through the OS
 * hint; three separate bugs in this codebase came from a media query
 * overriding that, the worst of them killing every transition in the panel
 * with !important. The Motion control in the rail is what turns this off, and
 * under it rows appear and disappear without moving, still on the same timers.
 */

type Stats = {
  liveCount: number;
  sessions: { countryCode: string | null }[];
  today: { visitors: number; views: number; signups: number };
};
type Overview = {
  revenueTodayCents: number;
  paidPlus: number;
  paidPro: number;
};
type Traffic = { points: { visitors: number }[] };

/** Per-kind colour and glyph. The design IS the kind: an operator should know
 *  what a row is before reading it. */
const LOOK: Record<ActivityKind, { tint: string; ring: string }> = {
  visitor: { tint: "var(--adm-ink-2)", ring: "var(--adm-line-strong)" },
  signup: { tint: "var(--adm-accent)", ring: "var(--adm-accent)" },
  sale: { tint: "var(--adm-positive, #34d399)", ring: "var(--adm-positive, #34d399)" },
  subscriber: { tint: "var(--adm-warn)", ring: "var(--adm-warn)" },
  milestone: { tint: "var(--adm-accent)", ring: "var(--adm-accent)" },
};

type Shown = ActivityEvent & { born: number; leaving: boolean };

export function ActivityFeed() {
  const reduced = useReducedMotion();
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);
  const overview = useLiveData<Overview>("/api/admin/overview", 30_000);
  const traffic = useLiveData<Traffic>("/api/admin/traffic?range=90d", 300_000);

  const [shown, setShown] = useState<Shown[]>([]);
  const prevSnap = useRef<ActivitySnapshot | null>(null);
  const seq = useRef(0);

  // Derive events whenever a poll lands.
  useEffect(() => {
    if (!stats.data || !overview.data) return;
    const pts = traffic.data?.points ?? [];
    const snap: ActivitySnapshot = {
      todayVisitors: stats.data.today?.visitors ?? 0,
      todaySignups: stats.data.today?.signups ?? 0,
      // The last complete bucket. points is oldest-first and the last entry is
      // today, so yesterday is the one before it.
      yesterdayVisitors: pts.length > 1 ? (pts[pts.length - 2]?.visitors ?? 0) : 0,
      revenueTodayCents: overview.data.revenueTodayCents ?? 0,
      paidPlus: overview.data.paidPlus ?? 0,
      paidPro: overview.data.paidPro ?? 0,
      countries: (stats.data.sessions ?? [])
        .map((s) => s.countryCode)
        .filter((c): c is string => Boolean(c))
        .map((c) => c.toLowerCase()),
    };
    seq.current += 1;
    const fresh = diffActivity(prevSnap.current, snap, seq.current);
    prevSnap.current = snap;
    if (fresh.length === 0) return;
    const born = Date.now();
    setShown((cur) => trim([...cur, ...fresh.map((e) => ({ ...e, born, leaving: false }))]));
  }, [stats.data, overview.data, traffic.data]);

  // Retire rows on their own dwell. Two phases so the exit can animate: mark
  // leaving, then drop after the transition has had time to run.
  useEffect(() => {
    if (shown.length === 0) return;
    const timers = shown.map((e) => {
      const age = Date.now() - e.born;
      const untilLeave = Math.max(0, dwellMs(e.kind) - age);
      return setTimeout(() => {
        setShown((cur) => cur.map((x) => (x.id === e.id ? { ...x, leaving: true } : x)));
        setTimeout(
          () => setShown((cur) => cur.filter((x) => x.id !== e.id)),
          reduced ? 0 : 520,
        );
      }, untilLeave);
    });
    return () => timers.forEach(clearTimeout);
    // Re-armed whenever the set changes; ids are stable so a row is not
    // re-timed by a neighbour arriving.
  }, [shown.map((e) => e.id).join(","), reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  if (shown.length === 0) return null;

  return (
    <div
      // Live region, so the feed reaches a screen reader without stealing
      // focus. polite: none of this is urgent enough to interrupt.
      aria-live="polite"
      aria-label="Recent activity"
      className="pointer-events-none flex flex-col items-end gap-1.5"
    >
      {shown.map((e) => {
        const look = LOOK[e.kind];
        return (
          <div
            key={e.id}
            className="flex items-center gap-2 rounded-[var(--adm-radius-pill)] border py-1.5 pl-2 pr-3"
            style={{
              background: "var(--adm-panel)",
              borderColor: look.ring,
              boxShadow: "var(--adm-shadow-card)",
              // The whole animation, in two properties. Entering from the
              // right because the bar hangs off the right edge, so a row
              // arrives from outside the screen rather than out of nowhere.
              opacity: e.leaving ? 0 : 1,
              transform: reduced
                ? "none"
                : e.leaving
                  ? "translateX(12px)"
                  : "translateX(0)",
              transition: reduced
                ? "none"
                : "opacity 480ms cubic-bezier(0.2,0.6,0.2,1), transform 480ms cubic-bezier(0.2,0.6,0.2,1)",
              animation: reduced ? "none" : "adm-activity-in 420ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <span
              aria-hidden
              className="grid h-6 min-w-6 place-items-center rounded-[var(--adm-radius-pill)] px-1.5 font-sans text-[11.5px] font-semibold tabular-nums"
              style={{
                background: `color-mix(in oklab, ${look.ring}, transparent 86%)`,
                color: look.tint,
              }}
            >
              {e.badge}
            </span>
            <span
              className="font-sans text-[12.5px] font-medium whitespace-nowrap"
              style={{ color: "var(--adm-ink-2)" }}
            >
              {e.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
