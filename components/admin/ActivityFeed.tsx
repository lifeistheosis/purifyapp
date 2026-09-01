"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useLiveData } from "@/lib/admin/useLiveData";
import { useReducedMotion } from "@/lib/ui/motion";
import {
  diffActivity,
  dwellMs,
  type ActivityKind,
  type ActivitySnapshot,
} from "@/lib/admin/activity";
import {
  agoLabel,
  clockLabel,
  clearActivity,
  getActivity,
  getServerActivity,
  markAllSeen,
  pushActivity,
  subscribeActivity,
  unseenCount,
  type ActivityRecord,
} from "@/lib/admin/activityStore";

/**
 * The activity bar, and the bell that keeps what it dropped.
 *
 * WHAT CHANGED AND WHY. The first version was a bar alone: an event appeared,
 * sat for a few seconds, and was gone forever. That is right for a bar and
 * wrong as the only record. An operator reading Orders when a sale landed had
 * no way to learn it had happened, because the row had already expired and the
 * bar held no history at all. So the toast is now a VIEW over
 * lib/admin/activityStore.ts rather than the thing itself, and the bell opens
 * the rest, with the time each one arrived.
 *
 * VISIBILITY IS DERIVED, NOT STORED. A row is on the strip when its age is
 * under its dwell, which is a pure function of the store and the clock. The
 * previous version kept a `shown` array in component state with a setTimeout
 * per row, so anything that remounted this component threw the live rows away
 * mid-flight. Deriving it means the strip survives a remount, and the bell is
 * correct even if the ticking clock below never runs at all.
 *
 * EVERY ROW IS A REAL CHANGE. lib/admin/activity.ts derives them by diffing
 * consecutive polls of endpoints the panel already reads. Nothing is invented,
 * and a quiet hour shows an empty bar rather than filler.
 *
 * MOTION COMES FROM useReducedMotion, not from a media query. This panel
 * decides motion per surface in JS and deliberately animates through the OS
 * hint; three separate bugs in this codebase came from a media query
 * overriding that, the worst of them killing every transition in the panel
 * with !important. The Motion control in the rail is what turns this off.
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

/** Per-kind colour. The design IS the kind: an operator should know what a row
 *  is before reading a word of it. */
const LOOK: Record<ActivityKind, { tint: string; ring: string }> = {
  visitor: { tint: "var(--adm-ink-2)", ring: "var(--adm-line-strong)" },
  signup: { tint: "var(--adm-accent)", ring: "var(--adm-accent)" },
  sale: { tint: "var(--adm-positive, #34d399)", ring: "var(--adm-positive, #34d399)" },
  subscriber: { tint: "var(--adm-warn)", ring: "var(--adm-warn)" },
  milestone: { tint: "var(--adm-accent)", ring: "var(--adm-accent)" },
};

/**
 * Pill geometry, in pixels, and it is FIXED on purpose.
 *
 * The arrival animation slides every older pill right by exactly the width of
 * the one that just appeared, which it does by animating the new pill's own
 * negative left margin back to zero. That distance has to be known before the
 * pill has been laid out, and a uniform width is what makes it knowable
 * without measuring anything in a frame callback. It also keeps the strip
 * rhythmic instead of ragged, which is worth having on its own.
 */
const PILL_W = 232;
const PILL_GAP = 8;

/** How many ride the strip at once. The rest are already in the bell. */
const STRIP_MAX = 3;

/** How long the exit animation needs after a row's dwell has run out. */
const EXIT_MS = 460;

/**
 * A coarse clock that runs only while something is actually on screen.
 *
 * 500ms because the finest thing it drives is a fade boundary; nothing here
 * displays seconds. It re-arms whenever the store changes and stops itself
 * once the last row has aged out, so an admin tab left open overnight is not
 * re-rendering twice a second for no reason.
 *
 * THE CLOCK IS READ IN AN EFFECT, NEVER IN RENDER. Date.now() is impure and a
 * component that calls it while rendering produces a different tree each time
 * React happens to re-render it, which react-hooks/purity rejects and which
 * makes the output depend on how often something unrelated changed. The lazy
 * useState initializer below is the one sanctioned reading.
 *
 * Nothing TRUE depends on this. It decides how long a toast lingers. The store
 * behind it, and therefore the bell, is correct whether or not this ever ticks,
 * which is the same contract the odometer and the chart zoom hold to.
 */
function useCoarseClock(records: ActivityRecord[]): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (records.length === 0) return;
    const live = (t: number) =>
      records.some((r) => t - r.receivedAt < dwellMs(r.kind) + EXIT_MS);
    if (!live(Date.now())) return;
    // No setNow here. Calling setState directly in an effect body is what
    // react-hooks/set-state-in-effect forbids, and the 500ms gap before the
    // first tick is covered by the floor in ActivityFeed: a record cannot be
    // newer than the clock, so the clock is raised to meet it.
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      // Self-stopping. The dependency list cannot express "until these rows
      // are old", so the interval retires itself the moment they are.
      if (!live(t)) window.clearInterval(id);
    }, 500);
    return () => window.clearInterval(id);
  }, [records]);
  return now;
}

export function ActivityFeed() {
  const reduced = useReducedMotion();
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);
  const overview = useLiveData<Overview>("/api/admin/overview", 30_000);
  const traffic = useLiveData<Traffic>("/api/admin/traffic?range=90d", 300_000);

  const records = useSyncExternalStore(
    subscribeActivity,
    getActivity,
    getServerActivity,
  );

  const prevSnap = useRef<ActivitySnapshot | null>(null);
  const seq = useRef(0);

  // Derive events whenever a poll lands, and hand them to the store. The store
  // dedupes by id, so an effect that runs twice cannot double an event.
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
    if (fresh.length > 0) pushActivity(fresh);
  }, [stats.data, overview.data, traffic.data]);

  const clock = useCoarseClock(records);

  // FLOORED BY THE NEWEST RECORD, and this is what makes the strip correct
  // without reading the wall clock during render.
  //
  // The clock stops when the last toast ages out, so it can be minutes stale
  // by the time the next event lands. Left alone, that stale value would make
  // every long-dead record look young again, because `staleNow - receivedAt`
  // is small for all of them, and the strip would refill with history.
  // Raising it to the newest arrival fixes both ends at once: the new row is
  // age zero and shows immediately, and everything older is aged against the
  // same instant. records is newest-first, guaranteed by prune().
  const now = Math.max(clock, records[0]?.receivedAt ?? 0);

  const strip = records
    .filter((r) => now - r.receivedAt < dwellMs(r.kind) + EXIT_MS)
    .slice(0, STRIP_MAX);

  return (
    // FLEXES ONLY WHERE THE STRIP EXISTS, which is md and up.
    //
    // This carried a bare flex-1, and TabSearch beside it carries
    // `min-w-0 flex-1 lg:flex-none`, so below lg there were TWO flex-1
    // siblings and the free space split evenly between them. On a phone the
    // strip inside here is `hidden`, so half the bar was an empty box with a
    // 44px bell pinned to its left edge and a wide gap before the search
    // field. The bar's own comment says search is the one that flexes; this
    // was quietly making that false.
    <div className="flex items-center gap-2 md:min-w-0 md:flex-1">
      {/* The strip's viewport. LEFT-anchored, which is what makes older pills
          travel right as a new one arrives: the container's left edge is
          fixed, so a pill inserted at the head displaces everything after it.
          overflow-hidden is what the arrival slides in from, and what the
          fourth pill leaves through. */}
      <div
        aria-live="polite"
        aria-label="Recent activity"
        className="relative hidden h-11 min-w-0 flex-1 overflow-hidden md:block"
      >
        <div
          className="absolute left-0 top-0 flex h-full items-center"
          style={{ gap: PILL_GAP }}
        >
          {strip.map((r) => {
            const age = now - r.receivedAt;
            const leaving = age >= dwellMs(r.kind);
            return (
              <ActivityPill
                key={r.id}
                record={r}
                leaving={leaving}
                reduced={reduced}
              />
            );
          })}
        </div>
      </div>
      <ActivityBell records={records} reduced={reduced} />

      {/* ── The phone ────────────────────────────────────────────────────
          The strip above is md and up, because a 232px pill cannot sit in a
          375px bar next to a search field. That left the bell as the only
          trace of activity on a phone, which is the surface the owner
          actually uses: they reported seeing notifications nowhere but the
          bell, and that is exactly right.

          So mobile gets a real toast instead of a squeezed strip. ONE at a
          time, not three: a phone has room for one line of news, and a stack
          of three covers the screen someone is trying to work in. It is the
          newest, it sits under the top bar rather than over it, and it leaves
          on the same dwell as everything else. */}
      <MobileToast record={strip[0] ?? null} now={now} reduced={reduced} />
    </div>
  );
}

/**
 * One notification, on a phone.
 *
 * FIXED, not in the bar's flow. The top bar is a flex row that is already full
 * at 375px, so anything added inside it squeezes the search field. Positioned
 * under the bar instead, spanning the width, out of everyone's way.
 *
 * pointer-events-none, because it covers content the operator may be reading
 * or tapping and it has no controls of its own. The bell is where you go to
 * interact with these; this is only for noticing.
 */
function MobileToast({
  record,
  now,
  reduced,
}: {
  record: ActivityRecord | null;
  now: number;
  reduced: boolean;
}) {
  if (!record) return null;
  const look = LOOK[record.kind];
  const leaving = now - record.receivedAt >= dwellMs(record.kind);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--adm-topbar-h,69px)+8px)] z-[45] flex justify-center px-3 md:hidden"
    >
      <div
        className="flex max-w-[min(94vw,420px)] items-center gap-2.5 rounded-[var(--adm-radius-pill)] border py-2 pl-2 pr-3.5"
        style={{
          background: "var(--adm-panel)",
          borderColor: look.ring,
          boxShadow: `0 10px 28px -10px color-mix(in oklab, ${look.ring}, transparent 40%)`,
          opacity: leaving ? 0 : 1,
          transform: reduced ? "none" : leaving ? "translateY(-10px)" : "translateY(0)",
          transition: reduced
            ? "none"
            : `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms cubic-bezier(0.4,0,1,1)`,
          animation: reduced
            ? undefined
            : "adm-activity-in 460ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <span
          className="grid h-7 min-w-7 place-items-center rounded-[var(--adm-radius-pill)] px-1.5 font-sans text-[13px] font-semibold tabular-nums"
          style={{
            background: `color-mix(in oklab, ${look.ring}, transparent 84%)`,
            color: look.tint,
          }}
        >
          {record.badge}
        </span>
        <span
          className="min-w-0 truncate font-sans text-[13px] font-medium"
          style={{ color: "var(--adm-ink)" }}
        >
          {record.text}
        </span>
      </div>
    </div>
  );
}

/**
 * One pill on the strip.
 *
 * TWO ANIMATIONS, ON TWO ELEMENTS, doing two different jobs. The outer slot
 * animates its own negative margin back to zero, which is what pushes every
 * older pill to the right by exactly one pill's width. The inner card fades in
 * while rising, which is the arrival itself. Splitting them matters: putting
 * the rise on the same element as the margin would make the pill grow into
 * place AND move, and it reads as a stutter.
 *
 * Both are @keyframes with only a `from` and no fill-mode, so the rest state
 * is the plain, correct layout. A run that is skipped or throttled leaves the
 * strip looking exactly right, which is the same rule the odometer and the
 * chart zoom follow.
 */
function ActivityPill({
  record,
  leaving,
  reduced,
}: {
  record: ActivityRecord;
  leaving: boolean;
  reduced: boolean;
}) {
  const look = LOOK[record.kind];
  return (
    <div
      style={{
        width: PILL_W,
        ...(reduced
          ? null
          : {
              ["--adm-pill-shift" as string]: `${PILL_W + PILL_GAP}px`,
              animation: "adm-activity-slot 460ms cubic-bezier(0.22, 0.9, 0.24, 1)",
            }),
      }}
    >
      <div
        className="flex items-center gap-2.5 rounded-[var(--adm-radius-pill)] border py-2 pl-2 pr-3"
        style={{
          background: "var(--adm-panel)",
          borderColor: look.ring,
          // A tinted lift rather than the flat card shadow. These are meant to
          // be noticed from across a desk, and a pill that shares the panel's
          // own shadow reads as another piece of chrome.
          boxShadow: `0 6px 20px -8px color-mix(in oklab, ${look.ring}, transparent 55%)`,
          opacity: leaving ? 0 : 1,
          transform: reduced ? "none" : leaving ? "translateY(-8px)" : "translateY(0)",
          transition: reduced
            ? "none"
            : `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms cubic-bezier(0.4,0,1,1)`,
          animation: reduced
            ? undefined
            : "adm-activity-in 460ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <span
          aria-hidden
          className="grid h-7 min-w-7 place-items-center rounded-[var(--adm-radius-pill)] px-1.5 font-sans text-[13px] font-semibold tabular-nums"
          style={{
            background: `color-mix(in oklab, ${look.ring}, transparent 84%)`,
            color: look.tint,
          }}
        >
          {record.badge}
        </span>
        <span
          className="min-w-0 flex-1 truncate font-sans text-[13px] font-medium"
          style={{ color: "var(--adm-ink)" }}
        >
          {record.text}
        </span>
      </div>
    </div>
  );
}

/**
 * The bell, and the history behind it.
 *
 * It is back, and it is not the bell that was removed. That one carried a
 * pending-order count and, on click, navigated to Orders: a number that asked
 * the operator to go and look something up. This one opens the thing itself,
 * which is the only record of events that have already scrolled off the strip.
 *
 * The panel scrolls HORIZONTALLY. Vertically it would be a notifications list,
 * which invites being read as a queue with an obligation attached; laid along
 * one axis with the newest at the left it reads as a timeline, which is what
 * it is. It is also the shape that fits under a top bar without covering the
 * screen the operator is working on.
 */
function ActivityBell({
  records,
  reduced,
}: {
  records: ActivityRecord[];
  reduced: boolean;
}) {
  const [open, setOpen] = useState(false);
  const unseen = unseenCount(records);

  // Its own clock, and a slow one. The strip's clock stops as soon as the last
  // toast ages out, so reusing it would freeze "4m ago" at whatever it read
  // when the strip went quiet. A minute is the finest thing agoLabel prints,
  // so 30s is enough to keep every row honest and cheap enough to leave on
  // only while the panel is actually open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      if (!o) markAllSeen();
      return !o;
    });
    // Stamped here rather than in the effect that starts the interval: this is
    // an event handler, where setState is allowed, and it means the ages are
    // right on the frame the panel opens instead of up to 30 seconds stale.
    setNow(Date.now());
  }, []);

  // Escape closes it, matching every other transient surface in the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unseen > 0 ? `Activity, ${unseen} new` : "Activity"
        }
        title="Activity"
        // 44px square, matching the search field's h-11 beside it. It was 36,
        // which sat visibly short against the field and is under the touch
        // target this panel holds itself to elsewhere: admin-theme.css gives
        // .adm-toolbtn a 44px floor under `pointer: coarse` for exactly this
        // reason, and this button is not a toolbtn so it never got it.
        className="adm-control relative flex h-11 w-11 items-center justify-center rounded-[var(--adm-radius-sm)]"
        style={
          {
            color: unseen > 0 ? "var(--adm-accent)" : "var(--adm-ink-2)",
            "--_bg": "transparent",
            "--_bg-hover": "var(--adm-hover)",
          } as React.CSSProperties
        }
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 3a4.6 4.6 0 0 0-4.6 4.6c0 3.2-1.1 4.3-1.6 4.9-.2.2 0 .6.3.6h11.8c.3 0 .5-.4.3-.6-.5-.6-1.6-1.7-1.6-4.9A4.6 4.6 0 0 0 10 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M8.3 15.4a1.8 1.8 0 0 0 3.4 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {unseen > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-[var(--adm-radius-pill)] px-1 font-sans text-[10px] font-bold tabular-nums"
            style={{
              background: "var(--adm-accent)",
              color: "var(--adm-bg)",
              // Only on arrival, and only once: a badge that pulses forever is
              // a thing operators learn to stop seeing.
              animation: reduced ? undefined : "adm-badge-pop 420ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away. Below the panel, above everything else, and a button
              so it is reachable without a pointer. */}
          <button
            type="button"
            aria-label="Close activity"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[45] cursor-default"
          />
          <div
            role="dialog"
            aria-label="Activity"
            className="absolute right-0 top-[calc(100%+8px)] z-[46] w-[min(92vw,560px)] rounded-[var(--adm-radius)] border p-3"
            style={{
              background: "var(--adm-panel)",
              borderColor: "var(--adm-line)",
              boxShadow: "var(--adm-shadow-card)",
              animation: reduced
                ? undefined
                : "adm-activity-in 260ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p
                className="font-sans text-[12px] font-semibold"
                style={{ color: "var(--adm-ink)" }}
              >
                Activity
              </p>
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={clearActivity}
                  className="font-sans text-[11.5px]"
                  style={{ color: "var(--adm-ink-3)" }}
                >
                  Clear
                </button>
              )}
            </div>

            {records.length === 0 ? (
              <p
                className="px-1 py-6 text-center font-sans text-[12.5px]"
                style={{ color: "var(--adm-ink-3)" }}
              >
                Nothing yet. Visits, signups, sales and goals show up here as
                they happen.
              </p>
            ) : (
              // Horizontal, snapped, and scrollable by drag, wheel or keyboard.
              // adm-scroll-x is a scoped scrollbar; overflow-y-hidden stops a
              // stray vertical scroller appearing on a one-row strip.
              <div className="adm-scroll-x flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden pb-2">
                {records.map((r) => {
                  const look = LOOK[r.kind];
                  return (
                    <div
                      key={r.id}
                      className="flex shrink-0 snap-start flex-col gap-2 rounded-[var(--adm-radius-sm)] border p-3"
                      style={{
                        width: 200,
                        borderColor: look.ring,
                        background: `color-mix(in oklab, ${look.ring}, transparent 94%)`,
                      }}
                    >
                      <span
                        aria-hidden
                        className="grid h-7 w-fit min-w-7 place-items-center rounded-[var(--adm-radius-pill)] px-1.5 font-sans text-[13px] font-semibold tabular-nums"
                        style={{
                          background: `color-mix(in oklab, ${look.ring}, transparent 82%)`,
                          color: look.tint,
                        }}
                      >
                        {r.badge}
                      </span>
                      <span
                        className="font-sans text-[12.5px] font-medium leading-snug"
                        style={{ color: "var(--adm-ink)" }}
                      >
                        {r.text}
                      </span>
                      {/* The time it arrived, both ways. The relative one is
                          what an operator reads; the clock is what they need
                          when they are reconciling against another system. */}
                      <span
                        className="mt-auto font-sans text-[11px] tabular-nums"
                        style={{ color: "var(--adm-ink-3)" }}
                      >
                        {agoLabel(r.receivedAt, now)} · {clockLabel(r.receivedAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
