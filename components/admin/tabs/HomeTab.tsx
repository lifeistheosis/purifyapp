"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { AttentionItem } from "@/lib/admin/attention";
import { figure, LOADING, moneyWeek, NOT_MEASURED, weekday } from "@/lib/admin/home";
import { useLayout } from "@/lib/admin/layoutPreference";
import {
  agoWords,
  clockOf,
  groupFeed,
  lineWords,
  MARK_SEEN,
  paceWord,
  readerRows,
  sinceTotals,
  type SinceEvent,
} from "@/lib/admin/since";
import { SENSITIVE } from "@/lib/admin/streamer";
import { TIMELINE_FLOOR } from "@/lib/admin/timeline";
import { loadOlder, moveLine, useTimeline } from "@/lib/admin/timelineStore";
import { useAttention } from "@/lib/admin/useAttention";
import { trafficUrl } from "@/lib/admin/trafficChart";
import { agoLabel, useLiveData } from "@/lib/admin/useLiveData";
import { formatPrice } from "@/lib/shop/format";

import { Chevron, FigureCard, Figure, GoLabel, LiveDot, Panel, PanelLink, Quiet, Spark } from "../daily/parts";
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
 * THE TIMELINE NEVER RESETS (the owner, 2026-11-04: "I don't want it to just
 * keep resetting and deleting ... I want a visual log that just doesn't go
 * away"). It used to start at the end of his last visit, so every visit
 * emptied it. Now it is the log itself (lib/admin/timelineStore.ts, the same
 * one the bell reads): this week first, the week before as he scrolls or
 * presses Show more, every row at the time it happened, and what is new on
 * top every minute. Where he last looked is a line drawn in the log; the
 * totals count what is above it. "Mark all as seen" moves the line to now and
 * the usage log keeps the press, so the next visit starts from there.
 *
 * The goals read themselves every half minute, so the bars move while he
 * watches and the next hour's targets arrive at the top of the hour, and each
 * says how its target was set.
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
  /** How the target was set, in a sentence (lib/admin/hourlyBaseline.ts). */
  explanation?: string;
};
type GoalsPayload = { goals: Goal[]; minutesIntoHour: number };

/** The goals read again this often, so the hour's bars move while he watches. */
const GOALS_POLL_MS = 30_000;

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
 * Asks for the week before when the foot of the log comes into view, so
 * scrolling down keeps the log going; Show more beside it does the same by
 * hand.
 */
function useLoadOlderAtFoot(enabled: boolean) {
  const foot = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = foot.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadOlder();
    }, { rootMargin: "240px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return foot;
}

/** The day the log goes back to, in words: "May 1". */
const FLOOR_WORDS = new Date(TIMELINE_FLOOR).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

function GoalRow({ goal, minutes }: { goal: Goal; minutes: number }) {
  const money = goal.metric === "revenue_cents";
  const value = goal.progress.value;
  const target = goal.target;
  const shown = (n: number) => (money ? formatPrice(Math.round(n), "usd") : count(Math.round(n)));
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  // Pace bars, his pick B on sheet r3-34: the mark is where the hour should
  // be by now; the fill lights when it is there or past it.
  const share = Math.min(60, minutes) / 60;
  const pace = target ? share * 100 : null;
  const expected = target ? target * share : null;
  const met = Boolean(target) && value >= (target ?? Infinity);
  const ahead = expected !== null && value >= expected;
  const early = minutes < 12;
  const word = paceWord(value, target, minutes);
  const status = met ? "Met" : !target || early ? word : ahead ? "Ahead of pace" : "Behind pace";
  return (
    <div className="min-w-0 py-2.5">
      <div className="flex items-baseline gap-2 font-sans text-[13px]">
        <span style={{ color: "var(--adm-ink)" }}>{GOAL_LABEL[goal.metric]}</span>
        <span className={"ml-auto font-mono text-[12.5px] " + (money ? SENSITIVE : "")} style={{ color: "var(--adm-ink)" }}>
          {shown(value)}
        </span>
        {target ? (
          <span className={"font-mono text-[11.5px] " + (money ? SENSITIVE : "")} style={{ color: "var(--adm-ink-3)" }}>
            of {shown(target)}
          </span>
        ) : null}
      </div>
      <div className="relative mt-2 h-[7px] rounded-[4px]" style={{ background: "var(--adm-panel-2)" }} aria-hidden>
        <i
          className="absolute inset-y-0 left-0 rounded-[4px] transition-[width] duration-500"
          style={{
            width: `${pct.toFixed(1)}%`,
            background: met || (ahead && !early) ? "var(--adm-ink)" : "var(--adm-ink-3)",
            boxShadow: met || (ahead && !early) ? "var(--adm-lit-soft)" : undefined,
          }}
        />
        {pace !== null && !met ? (
          // Where the hour should be by now.
          <i className="absolute -top-1 h-[15px] w-[2px] rounded-[1px]" style={{ left: `${pace.toFixed(1)}%`, background: "var(--adm-ink)" }} />
        ) : null}
      </div>
      <p className="mt-1.5 flex gap-2 font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
        <span>{status}</span>
        {expected !== null && !met && !early ? (
          <span className={"ml-auto " + (money ? SENSITIVE : "")} style={{ color: "var(--adm-ink-2)" }}>
            should be {shown(expected)} by now
          </span>
        ) : null}
      </p>
      {goal.explanation ? (
        <p className="mt-0.5 font-sans text-[10.5px] leading-snug" style={{ color: "var(--adm-ink-3)", opacity: 0.85 }}>
          {goal.explanation}
        </p>
      ) : null}
    </div>
  );
}

/** Where he last looked: a line drawn in the log, never the start of it. */
function LookedLine({ words }: { words: string }) {
  return (
    <div
      role="separator"
      aria-label={`You last looked ${words}`}
      className="relative z-[1] my-1.5 flex items-center gap-2 font-sans text-[11.5px]"
      style={{ color: "var(--adm-ink)", background: "var(--adm-panel)" }}
    >
      <span className="h-px w-3.5 shrink-0" style={{ background: "var(--adm-ink)", boxShadow: "var(--adm-lit-soft)" }} />
      <span className="shrink-0">You last looked {words}</span>
      <span className="h-px flex-1" style={{ background: "var(--adm-ink)", boxShadow: "var(--adm-lit-soft)" }} />
    </div>
  );
}

/** The week of money as seven columns, today lit (Home B, money leads). */
function WeekColumns({ days }: { days: { day: string; cents: number }[] }) {
  const top = Math.max(1, ...days.map((d) => d.cents));
  return (
    <div className={"mt-3 flex h-[62px] items-end gap-1.5 " + SENSITIVE} aria-hidden>
      {days.map((d, i) => {
        const today = i === days.length - 1;
        return (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-[4px]"
              style={{
                height: Math.max(3, Math.round((d.cents / top) * 44)),
                background: today ? "var(--adm-ink)" : "var(--adm-line-strong)",
                boxShadow: today ? "var(--adm-lit-soft)" : undefined,
              }}
            />
            <span className="font-mono text-[9.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {weekday(d.day).slice(0, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Home B, money leads (sheet r3-32): what came in today, large, with its
 * week as columns, then the site's live count as one row that opens Traffic.
 * His log is why: he opened the admin on Money 42 times in 50.
 */
function MoneyLead({
  revenue,
  week,
  paid,
  live,
  visitorsToday,
}: {
  revenue: string;
  week: { days: { day: string; cents: number }[]; totalCents: number } | null;
  paid: ReactNode;
  live: ReactNode;
  visitorsToday: ReactNode;
}) {
  const unread = revenue === NOT_MEASURED || revenue === LOADING;
  return (
    <div className="space-y-2.5">
      <Panel pad="px-4 pt-3.5 pb-3">
        <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Came in today
        </p>
        <div className="mt-1 flex items-end gap-3">
          {unread ? (
            <Quiet className="py-2">{revenue}</Quiet>
          ) : (
            <Figure size={42} lit sensitive>
              {revenue}
            </Figure>
          )}
          {week ? (
            <span className={"ml-auto pb-1 text-right font-sans text-[12px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
              {formatPrice(week.totalCents, "usd")} this week
            </span>
          ) : null}
        </div>
        {week ? <WeekColumns days={week.days} /> : null}
        <div className="mt-2.5 flex items-center gap-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
          <span>
            Plus <b className="font-mono font-medium" style={{ color: "var(--adm-ink)" }}>{paid}</b> paying
          </span>
          <span className="ml-auto">
            <PanelLink onClick={() => open("overview")}>Open Money</PanelLink>
          </span>
        </div>
      </Panel>
      <button
        type="button"
        onClick={() => open("traffic")}
        className="adm-control flex min-h-[50px] w-full items-center gap-3 rounded-[8px] border px-4 text-left"
        style={
          { borderColor: "var(--adm-line)", background: "var(--adm-panel)", "--_bg-hover": "var(--adm-hover)" } as React.CSSProperties
        }
      >
        <LiveDot />
        <span className="font-sans text-[13.5px]" style={{ color: "var(--adm-ink)" }}>
          <b className="font-mono font-medium">{live}</b> on the site now
        </span>
        <span className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {visitorsToday} today
        </span>
        <span className="ml-auto" style={{ color: "var(--adm-ink-3)" }}>
          <Chevron />
        </span>
      </button>
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
  const traffic = useLiveData<Traffic>(trafficUrl(), 300_000);
  // The goals keep themselves: read every half minute, so the bars move while
  // he watches and the next hour's targets arrive at the top of the hour (the
  // owner, 2026-11-04: "self-updating in terms of its goals"). One shared
  // timer for the whole panel (lib/admin/liveStore.ts), paused when hidden.
  const goals = useLiveData<GoalsPayload>("/api/admin/hourly-goals", GOALS_POLL_MS);
  // His own A and B for the top of Home, picked in Settings.
  const layout = useLayout("home");
  // The clock, moved on each minute in a timer callback rather than read
  // during render, so the log's day headings stay true on a page left open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const tl = useTimeline();
  const foot = useLoadOlderAtFoot(tl.status === "ready" && tl.more && !tl.loadingMore && !tl.moreFailed);

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

  // ── The timeline ───────────────────────────────────────────────────────
  const ready = tl.status === "ready";
  const lineAt = tl.line?.at ?? null;
  const lineMs = lineAt ? Date.parse(lineAt) : NaN;
  const isNew = (at: string) => Number.isFinite(lineMs) && Date.parse(at) > lineMs;
  const events: SinceEvent[] = ready ? [...tl.events, ...readerRows(tl.readerTimes, now)] : [];
  const groups = groupFeed(events, now);
  // The line falls before the first row he has seen: at or before it.
  const firstSeen = groups.flatMap((g) => g.rows).find((e) => !isNew(e.at)) ?? null;
  const fresh = tl.events.filter((e) => isNew(e.at));
  const freshReaders = tl.readerTimes.filter(isNew);
  const freshCents = fresh.reduce((a, e) => a + (e.kind === "order" ? (e.cents ?? 0) : 0), 0);
  const totals = ready && lineAt ? sinceTotals(fresh, freshReaders.length, freshCents) : null;
  const totalItems = totals
    ? [
        { value: formatPrice(totals.orderCents, "usd"), label: totals.orders === 1 ? "1 order" : `${count(totals.orders)} orders`, sensitive: true },
        { value: totals.readers === null ? "?" : count(totals.readers), label: "new readers" },
        { value: count(totals.members), label: totals.members === 1 ? "new Plus member" : "new Plus members" },
        { value: count(totals.requests), label: totals.requests === 1 ? "request for a check or seal" : "requests for a check or seal" },
        { value: count(totals.tickets), label: totals.tickets === 1 ? "support ticket" : "support tickets" },
      ]
    : [];
  const basis = tl.line?.basis ?? null;
  const showLine = Boolean(lineAt) && basis !== "day";
  const lineText = lineAt ? lineWords(lineAt, now) : "";
  const newCount = fresh.length + (freshReaders.length > 0 ? 1 : 0);
  const lineNote = !ready
    ? tl.status === "failed"
      ? "The timeline could not be read just now."
      : "Reading the timeline."
    : !lineAt || basis === "day"
      ? "Everything, newest first. Your use log gave no earlier visit to draw a line at."
      : `${newCount === 0 ? "Nothing new" : "New above the line"} since you last looked, ${lineWords(lineAt, now)}${
          basis === "mark" ? ", when you marked all as seen" : ""
        }: ${agoWords(lineAt, now.getTime())}.`;

  // ── Still waiting on you ───────────────────────────────────────────────
  const todo: AttentionItem[] = [...summary.faults, ...summary.queues];
  const gaps = summary.unmeasured;
  const checking = summary.state === "checking" && todo.length === 0;

  return (
    <div className="space-y-3.5">
      {/* His own A and B (sheet r3-32), picked in Settings: B, money leads,
          or A, the numbers first. */}
      {layout === "b" ? (
        <MoneyLead
          revenue={revenue}
          week={week}
          paid={typeof paid === "number" ? count(paid) : paid}
          live={typeof live === "number" ? count(live) : live}
          visitorsToday={typeof visitorsToday === "number" ? count(visitorsToday) : visitorsToday}
        />
      ) : null}
      {/* A's numbers. On a phone they are rows in one box, as the sheet drew
          them; from md they are the five cards. Both render and the
          breakpoint picks one. */}
      <div className={layout === "a" ? "hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-5" : "hidden"}>
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
        className={layout === "a" ? "divide-y rounded-[12px] border px-3.5 md:hidden" : "hidden"}
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
        {goals.failing && !goals.data ? (
          <Quiet className="pb-2">The hour&apos;s goals could not be read just now.</Quiet>
        ) : !goals.data ? (
          <Quiet className="pb-2">Reading the hour.</Quiet>
        ) : watched.length === 0 ? (
          <Quiet className="pb-2">No goal is watched for the hour. Open Goals to watch one.</Quiet>
        ) : (
          <>
            <div className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-4">
              {watched.map((g) => (
                <GoalRow key={g.id} goal={g} minutes={minutes} />
              ))}
            </div>
            <p className="pb-1.5 pt-0.5 font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
              Targets set themselves each hour from that hour in past weeks. Updated {agoLabel(goals.lastSynced, now.getTime())}, by itself.
            </p>
          </>
        )}
      </Panel>

      {/* The timeline: everything that happened, newest first, with the
          line where he last looked drawn in it. */}
      <section aria-labelledby="adm-since-head" className="pt-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="adm-since-head" className="font-sans text-[19px] font-semibold tracking-[-0.01em]" style={{ color: "var(--adm-ink)" }}>
              Timeline
            </h2>
            <p className="mt-0.5 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {lineNote}
            </p>
          </div>
          {ready && newCount > 0 ? (
            <button
              type="button"
              onClick={() => moveLine(new Date().toISOString())}
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

        {totals && newCount > 0 ? (
          <Panel className="mt-3" pad="px-4 py-3.5 lg:px-0">
            <Totals items={totalItems} />
          </Panel>
        ) : null}

        <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Panel pad="px-3 pt-1 pb-2.5 md:px-4">
            {!ready ? (
              <Quiet className="py-3">{tl.status === "failed" ? "The timeline could not be read just now." : "Reading the timeline."}</Quiet>
            ) : groups.length === 0 ? (
              <Quiet className="py-3">Nothing has happened in this week yet.</Quiet>
            ) : (
              <div className="relative">
                {/* The thread the marks hang on. */}
                <span
                  aria-hidden
                  className="absolute bottom-6 top-8 w-px"
                  style={{ left: 11, background: "var(--adm-line-strong)" }}
                />
                {groups.map((g) => (
                  <div key={g.label}>
                    {/* At the start of a part of the day, the line goes above
                        its heading, so the heading sits with the rows under it. */}
                    {g.rows[0] === firstSeen && showLine ? <LookedLine words={lineText} /> : null}
                    <p
                      className="relative z-[1] mb-0.5 mt-3 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color: "var(--adm-ink-2)", background: "var(--adm-panel)" }}
                    >
                      {g.label}
                    </p>
                    <ul>
                      {g.rows.map((e, i) => (
                        <li key={`${e.kind}-${e.at}-${i}`}>
                          {e === firstSeen && showLine && i > 0 ? <LookedLine words={lineText} /> : null}
                          <button
                            type="button"
                            onClick={() => open(e.tab)}
                            className="adm-control relative flex min-h-[46px] w-full items-start gap-3 rounded-[6px] py-1.5 pl-1 pr-1 text-left"
                            style={{ "--_bg": "transparent", "--_bg-hover": "var(--adm-hover)" } as React.CSSProperties}
                          >
                            {/* On the rail: lit while it is new to him, an open
                                ring once he has seen it. */}
                            <span className="relative z-[1] mt-[19px] grid w-[14px] shrink-0 place-items-center">
                              <span
                                className="block h-[8px] w-[8px] rounded-full"
                                style={
                                  isNew(e.at)
                                    ? { background: "var(--adm-ink)", boxShadow: "var(--adm-lit-soft)" }
                                    : { background: "var(--adm-panel)", border: "1.5px solid var(--adm-ink-3)" }
                                }
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-mono text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                                {clockOf(new Date(e.at))}
                                {e.mark === "wait" ? " · waits on you" : ""}
                              </span>
                              <span className={"mt-0.5 block font-sans text-[14px] font-medium " + (e.money ? SENSITIVE : "")} style={{ color: "var(--adm-ink)" }}>
                                {e.title}
                              </span>
                              <span
                                className={"mt-0.5 block truncate font-sans text-[12px] " + (e.sensitive ? SENSITIVE : "")}
                                style={{ color: "var(--adm-ink-3)" }}
                              >
                                {e.detail}
                              </span>
                            </span>
                            <span className="hidden self-center sm:flex">
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
            {/* The foot of the log: the week before loads as it comes into
                view, or by hand. */}
            {ready ? (
              <div ref={foot} className="mt-2 flex flex-wrap items-center gap-3 border-t pt-2.5" style={{ borderColor: "var(--adm-line)" }}>
                <p className="min-w-0 flex-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                  {tl.loadingMore
                    ? "Reading the week before."
                    : tl.moreFailed
                      ? "The week before could not be read just now."
                      : tl.more && tl.oldest
                        ? `Back to ${lineWords(tl.oldest, now)}. Older weeks load as you scroll.`
                        : `That is everything, back to ${FLOOR_WORDS}.`}
                  {tl.full.length > 0 ? ` A busy week shows the newest 200 of ${tl.full.join(", ")}.` : ""}
                </p>
                {tl.more && !tl.loadingMore ? (
                  <button
                    type="button"
                    onClick={loadOlder}
                    className="adm-control inline-flex min-h-11 items-center rounded-[6px] border px-3 font-sans text-[12.5px] md:min-h-[36px]"
                    style={
                      {
                        borderColor: "var(--adm-line-strong)",
                        color: "var(--adm-ink-2)",
                        "--_bg": "transparent",
                        "--_bg-hover": "var(--adm-panel-2)",
                      } as React.CSSProperties
                    }
                  >
                    {tl.moreFailed ? "Try again" : "Show more"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {ready && tl.unread.length > 0 ? (
              <p className="mt-2 flex items-center gap-2 border-t pt-2 font-sans text-[12px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}>
                <StatusDot tone="idle" />
                {`Not read just now: ${tl.unread.join(", ")}. The timeline may be missing rows from them.`}
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
