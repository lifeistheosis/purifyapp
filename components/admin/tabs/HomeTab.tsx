"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { AttentionItem } from "@/lib/admin/attention";
import { adminJson } from "@/lib/admin/fetchJson";
import { figure, LOADING, moneyWeek, NOT_MEASURED } from "@/lib/admin/home";
import {
  agoWords,
  clockOf,
  groupFeed,
  lineWords,
  MARK_SEEN,
  paceWord,
  readerRows,
  sinceTotals,
  type Line,
  type SinceEvent,
} from "@/lib/admin/since";
import { SENSITIVE } from "@/lib/admin/streamer";
import { useAttention } from "@/lib/admin/useAttention";
import { useLiveData } from "@/lib/admin/useLiveData";
import { formatPrice } from "@/lib/shop/format";

import { useAdminFetch } from "../adminFetch";
import { FigureCard, Figure, GoLabel, LiveDot, Panel, PanelLink, Quiet, Spark } from "../daily/parts";
import { StatusDot } from "../primitives";

/**
 * The admin's Home: the owner's pick for Home on sheet r3-15 (2026-10-30),
 * B and A mixed: "for the home, do I guess a mix of B and A".
 *
 * A's few numbers come first (revenue today, visitors today, on the site now,
 * paying for Plus, new readers, each with its two weeks as a line), then this
 * hour's goals, pulled up from Goals. Under them B: what changed since he last
 * looked, as a line of totals and then a row for each order, member, request,
 * ticket and tick of the board, each row a door to the page behind it. What
 * still waits on him stands beside the feed until it is done.
 *
 * His log is why: Home is a five second look on the way to Money, and what
 * changed since he last looked is what a five second look is for.
 *
 * WHERE THE LINE COMES FROM: his own use log, read by /api/admin/since
 * (lib/admin/since.ts says how). The page keeps that line for the whole visit
 * and asks for it again by time, so the feed does not shift under him; "Mark
 * all as seen" moves it to now, and the usage log keeps the press, so the
 * next visit starts from there. Nothing is deleted.
 *
 * A figure that could not be read says so in words, never a zero.
 */

type Overview = {
  revenueTodayCents: number | null;
  revenueSeries?: number[];
  ordersDegraded: boolean;
  /** Paying for Plus, Pro included. */
  paidPlus: number;
  paidPro: number;
};
type Stats = {
  /** null means the read failed, never that nobody is here. */
  liveCount: number | null;
  sessions?: { country: string | null }[];
  today: { visitors: number | null; signups: number | null };
};
type Traffic = { points: { date: string; visitors: number; signups: number }[] };

type Goal = {
  id: string;
  metric: "visitors" | "pageviews" | "signups" | "revenue_cents";
  target: number | null;
  paused?: boolean;
  progress: { value: number; target: number; minutesElapsed: number };
};
type GoalsPayload = { goals: Goal[]; minutesIntoHour: number };

type SincePayload = {
  line: string;
  basis: Line["basis"];
  now: string;
  events: SinceEvent[];
  orderCents: number;
  readers: { count: number | null; times: string[] };
  unread: string[];
};

const GOAL_LABEL: Record<Goal["metric"], string> = {
  visitors: "Visitors",
  pageviews: "Page views",
  signups: "Signups",
  revenue_cents: "Revenue",
};

function open(tab: string) {
  window.location.hash = `tab=${tab}`;
}

const count = (n: number) => n.toLocaleString("en-US");

/** The country most of the readers on the site now are in, or null. */
function mostIn(sessions: { country: string | null }[] | undefined): string | null {
  const tally = new Map<string, number>();
  for (const s of sessions ?? []) if (s.country) tally.set(s.country, (tally.get(s.country) ?? 0) + 1);
  let best: [string, number] | null = null;
  for (const e of tally) if (!best || e[1] > best[1]) best = e;
  return best ? best[0] : null;
}

/**
 * The feed's own read: the line from his log on the first ask, then the same
 * line by time on every refresh, so the rows do not shift under him; a new
 * time when he marks all as seen.
 */
function useSince(askedAt: string | null) {
  const [got, setGot] = useState<{
    data: SincePayload | null;
    failed: boolean;
    /** Where the first line came from: his visit, his last mark, or the last day. */
    firstBasis: Line["basis"] | null;
  } | null>(null);
  const [tick, setTick] = useState(0);
  // The line the first answer gave, kept for every refresh after it. Read and
  // written only in the effect and its callback, never during render.
  const pin = useRef<string | null>(null);

  useEffect(() => {
    const at = askedAt ?? pin.current;
    let alive = true;
    void adminJson<SincePayload>(at ? `/api/admin/since?at=${encodeURIComponent(at)}` : "/api/admin/since").then((d) => {
      if (!alive) return;
      if (d && !pin.current) pin.current = d.line;
      setGot((prev) =>
        d
          ? { data: d, failed: false, firstBasis: prev?.firstBasis ?? d.basis }
          : { data: prev?.data ?? null, failed: true, firstBasis: prev?.firstBasis ?? null },
      );
    });
    return () => {
      alive = false;
    };
  }, [askedAt, tick]);

  // A fresh look every two minutes while the page is on screen.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, 120_000);
    return () => window.clearInterval(id);
  }, []);

  return { data: got?.data ?? null, failed: got?.failed ?? false, loading: got === null, firstBasis: got?.firstBasis ?? null };
}

/** A mark of the admin's own: solid for done, a ring for waiting on him, a plain dot for news. */
function FeedDot({ mark }: { mark: SinceEvent["mark"] }) {
  return <StatusDot tone={mark === "good" ? "good" : mark === "wait" ? "wait" : "idle"} />;
}

function GoalRow({ goal, minutes }: { goal: Goal; minutes: number }) {
  const money = goal.metric === "revenue_cents";
  const value = goal.progress.value;
  const target = goal.target;
  const shown = (n: number) => (money ? formatPrice(Math.round(n), "usd") : count(Math.round(n)));
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const pace = target ? Math.min(100, (Math.min(60, minutes) / 60) * 100) : null;
  const word = paceWord(value, target, minutes);
  return (
    <div className="min-w-0 py-2">
      <div className="flex items-baseline gap-2 font-sans text-[13px]">
        <span style={{ color: "var(--adm-ink)" }}>{GOAL_LABEL[goal.metric]}</span>
        <span className={"ml-auto font-mono text-[12.5px] " + (money ? SENSITIVE : "")} style={{ color: "var(--adm-ink)" }}>
          {shown(value)}
        </span>
        {target ? (
          <span className={"text-[11.5px] " + (money ? SENSITIVE : "")} style={{ color: "var(--adm-ink-3)" }}>
            of {shown(target)}
          </span>
        ) : null}
      </div>
      <div className="relative mt-[7px] h-[6px] rounded-[3px]" style={{ background: "var(--adm-panel-2)" }} aria-hidden>
        <i
          className="absolute inset-y-0 left-0 rounded-[3px]"
          style={{ width: `${pct.toFixed(1)}%`, background: "var(--adm-ink)", boxShadow: word === "reached" ? "var(--adm-lit-soft)" : undefined }}
        />
        {pace !== null ? (
          // Where the hour usually is by now: the grey tick.
          <i className="absolute -top-[3px] h-[12px] w-[1.5px]" style={{ left: `${pace.toFixed(1)}%`, background: "var(--adm-ink-3)" }} />
        ) : null}
      </div>
      <p className="mt-[5px] font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
        {word}
      </p>
    </div>
  );
}

function Totals({ items }: { items: { value: ReactNode; label: string; sensitive?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0">
      {items.map((t, i) => (
        <div
          key={t.label}
          className={"min-w-0 lg:px-[18px] " + (i > 0 ? "lg:border-l" : "")}
          style={{ borderColor: "var(--adm-line)" }}
        >
          <Figure size={22} sensitive={t.sensitive}>
            {t.value}
          </Figure>
          <p className="mt-1 truncate font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {t.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function HomeTab() {
  const { summary, refresh } = useAttention();
  const overview = useLiveData<Overview>("/api/admin/overview", 60_000);
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);
  const traffic = useLiveData<Traffic>("/api/admin/traffic?range=90d", 300_000);
  // Read once as the Home opens: the hour's goals cost four counts a metric,
  // and a slow hour is not a fault worth polling for.
  const goals = useAdminFetch<GoalsPayload>("/api/admin/hourly-goals");
  // The clock, read once: a render that reads the clock is not pure.
  const [now] = useState(() => new Date());
  const [askedAt, setAskedAt] = useState<string | null>(null);
  const since = useSince(askedAt);

  // ── A's numbers ────────────────────────────────────────────────────────
  const money = overview.data && !overview.data.ordersDegraded ? overview.data : null;
  const week = money ? moneyWeek(money.revenueSeries ?? [], now) : null;
  const revenue =
    money && money.revenueTodayCents !== null
      ? formatPrice(money.revenueTodayCents, "usd")
      : overview.loading
        ? LOADING
        : NOT_MEASURED;
  const points = traffic.data?.points ?? [];
  const last14 = points.slice(-14);
  const yesterday = points.length >= 2 ? points[points.length - 2].visitors : null;
  const signupsWeek = points.length >= 7 ? points.slice(-7).reduce((a, p) => a + p.signups, 0) : null;
  const visitorsToday = figure(stats.data?.today?.visitors, stats.loading);
  const live = figure(stats.data?.liveCount, stats.loading);
  const paid = figure(overview.data?.paidPlus, overview.loading);
  const signups = figure(stats.data?.today?.signups, stats.loading);
  const most = mostIn(stats.data?.sessions);

  const numbers = [
    {
      key: "revenue",
      label: "Revenue today",
      value: revenue,
      sub: week ? `${formatPrice(week.totalCents, "usd")} over 7 days` : "net, UTC day",
      spark: money ? <Spark label="Revenue, the last 14 days" values={(money.revenueSeries ?? []).slice(-14)} /> : null,
      sensitive: true,
    },
    {
      key: "visitors",
      label: "Visitors today",
      value: typeof visitorsToday === "number" ? count(visitorsToday) : visitorsToday,
      sub: yesterday !== null ? `${count(yesterday)} yesterday` : "UTC day",
      spark: last14.length > 1 ? <Spark label="Visitors, the last 14 days" values={last14.map((p) => p.visitors)} /> : null,
    },
    {
      key: "live",
      label: "On the site now",
      value: typeof live === "number" ? count(live) : live,
      sub: "in the last 90 seconds",
      spark: most ? (
        <p className="flex h-[26px] items-end font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
          the most in {most}
        </p>
      ) : null,
      live: true,
      lit: true,
    },
    {
      key: "plus",
      label: "Paying for Plus",
      value: typeof paid === "number" ? count(paid) : paid,
      // No history of members is kept (entitlements holds the state, not its
      // changes), so there is no "this week" here, only who pays now.
      sub: overview.data ? `${count(overview.data.paidPro)} of them Pro` : "Plus and Pro",
      spark: null,
    },
    {
      key: "readers",
      label: "New readers",
      value: typeof signups === "number" ? count(signups) : signups,
      sub: signupsWeek !== null ? `${count(signupsWeek)} this week` : "accounts made today",
      spark: last14.length > 1 ? <Spark label="New readers, the last 14 days" values={last14.map((p) => p.signups)} /> : null,
    },
  ];

  // ── This hour ──────────────────────────────────────────────────────────
  const watched = (goals.data?.goals ?? []).filter((g) => !g.paused);
  const minutes = goals.data?.minutesIntoHour ?? now.getUTCMinutes();

  // ── Since you last looked ──────────────────────────────────────────────
  const s = since.data;
  const events: SinceEvent[] = s ? [...s.events, ...readerRows(s.readers.times, now)] : [];
  const groups = groupFeed(events, now);
  const totals = s ? sinceTotals(s.events, s.readers.count, s.orderCents) : null;
  const totalItems = totals
    ? [
        { value: formatPrice(totals.orderCents, "usd"), label: totals.orders === 1 ? "1 order" : `${count(totals.orders)} orders`, sensitive: true },
        { value: totals.readers === null ? "?" : count(totals.readers), label: "new readers" },
        { value: count(totals.members), label: totals.members === 1 ? "new Plus member" : "new Plus members" },
        { value: count(totals.requests), label: totals.requests === 1 ? "request for a check or seal" : "requests for a check or seal" },
        { value: count(totals.tickets), label: totals.tickets === 1 ? "support ticket" : "support tickets" },
      ]
    : [];
  const basis = askedAt ? "mark" : (since.firstBasis ?? s?.basis ?? null);
  const lineNote = !s
    ? since.failed
      ? "The feed could not be read just now."
      : "Reading your use log."
    : basis === "day"
      ? "Your use log gave no earlier visit, so this is the last 24 hours."
      : askedAt
        ? `Marked as seen at ${clockOf(new Date(askedAt))}.`
        : `${lineWords(s.line, now)}, ${basis === "mark" ? "when you last marked all as seen" : "from your use log"}: ${agoWords(s.line, now.getTime())}.`;

  // ── Still waiting on you ───────────────────────────────────────────────
  const todo: AttentionItem[] = [...summary.faults, ...summary.queues];
  const gaps = summary.unmeasured;
  const checking = summary.state === "checking" && todo.length === 0;

  return (
    <div className="space-y-3.5">
      {/* A's numbers. On a phone they are rows in one box, as the sheet drew
          them; from md they are the five cards. Both render and the
          breakpoint picks one. */}
      <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-5">
        {numbers.map((n) => (
          <FigureCard
            key={n.key}
            label={n.label}
            value={n.value}
            sub={n.sub}
            live={n.live}
            lit={n.lit}
            sensitive={n.sensitive}
            unread={n.value === NOT_MEASURED || n.value === LOADING}
            extra={n.spark ? <div className={n.sensitive ? SENSITIVE : ""}>{n.spark}</div> : <div className="h-[26px]" />}
          />
        ))}
      </div>
      <ul
        className="divide-y rounded-[12px] border px-3.5 md:hidden"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
      >
        {numbers.map((n) => (
          <li key={n.key} className="flex min-h-[60px] items-center gap-3 border-[color:var(--adm-line)]">
            {n.live ? <LiveDot /> : null}
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[13.5px]" style={{ color: "var(--adm-ink)" }}>
                {n.label}
              </span>
              <span className="mt-0.5 block truncate font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                {n.sub}
              </span>
            </span>
            {n.value === NOT_MEASURED || n.value === LOADING ? (
              <span className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {n.value}
              </span>
            ) : (
              <Figure size={22} lit={n.lit} sensitive={n.sensitive}>
                {n.value}
              </Figure>
            )}
          </li>
        ))}
      </ul>

      {/* This hour, pulled up from Goals: each watched metric against where
          the hour usually is by now (the grey tick). */}
      <Panel
        title={`This hour, ${minutes} ${minutes === 1 ? "minute" : "minutes"} in`}
        action={<PanelLink onClick={() => open("goals")}>Open Goals</PanelLink>}
        pad="px-4 pt-3.5 pb-1.5"
      >
        {goals.error ? (
          <Quiet className="pb-2">The hour&apos;s goals could not be read just now.</Quiet>
        ) : !goals.data ? (
          <Quiet className="pb-2">Reading the hour.</Quiet>
        ) : watched.length === 0 ? (
          <Quiet className="pb-2">No goal is watched for the hour. Open Goals to watch one.</Quiet>
        ) : (
          <div className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-4">
            {watched.map((g) => (
              <GoalRow key={g.id} goal={g} minutes={minutes} />
            ))}
          </div>
        )}
      </Panel>

      {/* B: what changed since he last looked. */}
      <section aria-labelledby="adm-since-head" className="pt-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="adm-since-head" className="font-sans text-[19px] font-semibold tracking-[-0.01em]" style={{ color: "var(--adm-ink)" }}>
              Since you last looked
            </h2>
            <p className="mt-0.5 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {lineNote}
            </p>
          </div>
          {s ? (
            <button
              type="button"
              onClick={() => setAskedAt(new Date().toISOString())}
              className="adm-control inline-flex min-h-11 items-center gap-1.5 rounded-[6px] border px-3 font-sans text-[12.5px] md:min-h-[36px]"
              style={
                {
                  borderColor: "var(--adm-line-strong)",
                  color: "var(--adm-ink-2)",
                  "--_bg": "transparent",
                  "--_bg-hover": "var(--adm-panel-2)",
                } as React.CSSProperties
              }
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4.5 10.4 8.2 14l7.3-8" />
              </svg>
              {MARK_SEEN}
            </button>
          ) : null}
        </div>

        {totals ? (
          <Panel className="mt-3" pad="px-4 py-3.5 lg:px-0">
            <Totals items={totalItems} />
          </Panel>
        ) : null}

        <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Panel pad="px-3 pt-1 pb-2.5 md:px-4">
            {!s ? (
              <Quiet className="py-3">{since.failed ? "The feed could not be read just now." : "Reading what changed."}</Quiet>
            ) : groups.length === 0 ? (
              <Quiet className="py-3">Nothing new since then.</Quiet>
            ) : (
              <div className="relative">
                {/* The thread the marks hang on. */}
                <span
                  aria-hidden
                  className="absolute bottom-6 top-8 w-px"
                  style={{ left: "calc(54px + 12px + 7px)", background: "var(--adm-line-strong)" }}
                />
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-0.5 mt-3 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)", paddingLeft: 80 }}>
                      {g.label}
                    </p>
                    <ul>
                      {g.rows.map((e, i) => (
                        <li key={`${e.kind}-${e.at}-${i}`}>
                          <button
                            type="button"
                            onClick={() => open(e.tab)}
                            className="adm-control relative flex min-h-[46px] w-full items-center gap-3 rounded-[6px] pr-1 text-left"
                            style={{ "--_bg": "transparent", "--_bg-hover": "var(--adm-hover)" } as React.CSSProperties}
                          >
                            <span className="w-[54px] shrink-0 text-right font-mono text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                              {clockOf(new Date(e.at))}
                            </span>
                            <span className="relative z-[1] grid w-[14px] shrink-0 place-items-center">
                              <span className="rounded-full" style={{ boxShadow: "0 0 0 4px var(--adm-panel)" }}>
                                <FeedDot mark={e.mark} />
                              </span>
                            </span>
                            <span className="min-w-0 flex-1 py-1.5">
                              <span className={"block font-sans text-[13.5px] " + (e.money ? SENSITIVE : "")} style={{ color: "var(--adm-ink)" }}>
                                {e.title}
                              </span>
                              <span
                                className={"mt-0.5 block truncate font-sans text-[12px] " + (e.sensitive ? SENSITIVE : "")}
                                style={{ color: "var(--adm-ink-3)" }}
                              >
                                {e.detail}
                              </span>
                            </span>
                            <span className="hidden sm:flex">
                              <GoLabel>{e.go}</GoLabel>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {s && s.unread.length > 0 ? (
              <p className="mt-2 flex items-center gap-2 border-t pt-2 font-sans text-[12px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}>
                <StatusDot tone="idle" />
                {`Not read just now: ${s.unread.join(", ")}. The feed may be missing rows from them.`}
              </p>
            ) : null}
          </Panel>

          <Panel title="Still waiting on you" pad="px-4 pt-3.5 pb-1.5">
            {checking ? (
              <Quiet className="pb-2.5">Checking the queues.</Quiet>
            ) : todo.length === 0 && gaps.length === 0 ? (
              <Quiet className="pb-2.5">Nothing needs you right now.</Quiet>
            ) : (
              <ul className="divide-y">
                {todo.map((item) => (
                  <li key={item.id} className="border-[color:var(--adm-line)]">
                    <button
                      type="button"
                      onClick={() => open(item.go.tab)}
                      title={item.cls === "queue" ? item.body : undefined}
                      className="adm-control -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 rounded-[6px] px-2 py-2 text-left"
                      style={{ "--_bg": "transparent", "--_bg-hover": "var(--adm-hover)" } as React.CSSProperties}
                    >
                      <StatusDot tone={item.cls === "fault" ? "bad" : "wait"} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-[13.5px]" style={{ color: "var(--adm-ink)" }}>
                          {item.label}
                        </span>
                        <span className="mt-0.5 block font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                          {item.cls === "fault" ? item.body : item.go.label}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {gaps.length > 0 ? (
                  <li className="flex min-h-11 items-center gap-2.5 border-[color:var(--adm-line)] py-2">
                    <StatusDot tone="idle" />
                    <p className="min-w-0 flex-1 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                      {gaps.length === 1
                        ? "1 check did not answer, so this list may be missing something."
                        : `${gaps.length} checks did not answer, so this list may be missing something.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => gaps.forEach((g) => g.retryUrl && refresh(g.retryUrl))}
                      className="adm-control min-h-11 shrink-0 rounded-[6px] border px-3 font-sans text-[12.5px]"
                      style={
                        {
                          borderColor: "var(--adm-line-strong)",
                          color: "var(--adm-ink-2)",
                          "--_bg": "transparent",
                          "--_bg-hover": "var(--adm-panel-2)",
                        } as React.CSSProperties
                      }
                    >
                      Retry
                    </button>
                  </li>
                ) : null}
              </ul>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
