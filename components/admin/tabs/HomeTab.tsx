"use client";

import { useState, type ReactNode } from "react";

import type { AttentionItem } from "@/lib/admin/attention";
import {
  figure,
  LOADING,
  moneyWeek,
  NOT_MEASURED,
  visitorWeeks,
  weekAxis,
  weekday,
} from "@/lib/admin/home";
import { SENSITIVE, useStreamerOn } from "@/lib/admin/streamer";
import { useAttention } from "@/lib/admin/useAttention";
import { useLiveData } from "@/lib/admin/useLiveData";
import { formatPrice } from "@/lib/shop/format";

import { Odometer } from "../Odometer";
import { StatusDot } from "../primitives";

/**
 * The admin's Home: the owner's pick A, "One home" (2026-10-28).
 *
 * "Today becomes the page you actually read: what needs you, then the money
 * and the visitors with a chart each, so the daily check ends there." His own
 * log is why: Today was a doorway (40 of 42 visits left within five seconds,
 * 22 of them straight to Money) and Traffic and Money were where his time
 * went. So the money and the visitors come to the first page, and the rail
 * links under each chart open the page behind it.
 *
 * NOTHING HERE IS READ FOR THE HOME ALONE. The to-do is the attention summary
 * the rail badges and the strip read, so they cannot disagree. The tiles and
 * the charts subscribe to the three URLs the activity feed in the top bar
 * already polls (overview, stats, and traffic at 90 days), and liveStore runs
 * one timer per URL, so the Home adds no request of its own.
 *
 * A figure that could not be read says so in words (lib/admin/home.ts). It is
 * never a zero, and no longer an em dash.
 */

type Overview = {
  revenueTodayCents: number | null;
  revenueSeries?: number[];
  ordersDegraded: boolean;
  /** Paying for Plus, Pro included: the "Paying" figure on Money. */
  paidPlus: number;
};
type Stats = {
  /** null means the read failed, never that nobody is here. */
  liveCount: number | null;
  today: { visitors: number | null; signups: number | null };
};
type Traffic = { points: { date: string; visitors: number }[] };

function open(tab: string) {
  window.location.hash = `tab=${tab}`;
}

const ROW_STYLE = {
  "--_bg": "transparent",
  "--_bg-hover": "var(--adm-hover)",
} as React.CSSProperties;

/** A panel in the Home's own grammar: a hairline box, a quiet title. */
function Panel({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section
      className="flex flex-col rounded-[var(--adm-radius)] border px-3.5 py-3 md:px-4 md:py-3.5"
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)", boxShadow: "var(--adm-shadow-card)" }}
    >
      <h2 className="mb-2 font-sans text-[12px] font-normal" style={{ color: "var(--adm-ink-3)" }}>
        {title}
      </h2>
      {children}
      {footer}
    </section>
  );
}

/**
 * One number, what it counts, and one grey line. The figure is set in the
 * mono face the design drew it in, and rolls through the panel's Odometer,
 * which also hides any money figure under streamer mode by itself.
 */
function Tile({ label, value, sub }: { label: string; value: number | string; sub: ReactNode }) {
  const unread = value === NOT_MEASURED;
  return (
    <div
      className="rounded-[var(--adm-radius)] border px-3 py-2.5 md:px-3.5 md:py-3"
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)", boxShadow: "var(--adm-shadow-card)" }}
    >
      <p className="font-sans text-[11.5px] leading-4" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </p>
      <p
        className={
          "mt-1.5 flex h-[30px] items-center leading-none " +
          (unread ? "font-sans text-[13px]" : "font-mono text-[24px]")
        }
        style={{ color: unread ? "var(--adm-ink-3)" : "var(--adm-ink)" }}
      >
        <Odometer value={value} />
      </p>
      <p className="mt-1 truncate font-sans text-[11px] leading-4" style={{ color: "var(--adm-ink-3)" }}>
        {sub}
      </p>
    </div>
  );
}

type Bar = { value: number; muted?: boolean; title?: string };

/**
 * Plain bars, as the design drew them: no axis and no grid, because each
 * panel answers one question by shape (is this week up on the last, which day
 * sold) and the page behind the link has the axes. A day with nothing is a
 * hairline, so it reads as nothing rather than as missing.
 */
function Bars({ bars, label }: { bars: Bar[]; label: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div role="img" aria-label={label} className="flex h-[86px] items-end gap-1">
      {bars.map((b, i) => (
        <span
          key={i}
          title={b.title}
          className="min-w-0 flex-1 rounded-t-[2px]"
          style={{
            height: `max(1px, ${((b.value / max) * 100).toFixed(2)}%)`,
            background: b.muted ? "var(--adm-line-strong)" : "var(--adm-ink)",
          }}
        />
      ))}
    </div>
  );
}

function Axis({ marks }: { marks: [string, string, string] }) {
  return (
    <div aria-hidden className="mt-1.5 flex justify-between font-mono text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
      {marks.map((m, i) => (
        <span key={i}>{m}</span>
      ))}
    </div>
  );
}

/** Where a chart would be, when its series has not come, or could not. */
function NoChart({ loading }: { loading: boolean }) {
  return (
    <p className="flex h-[86px] items-center font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
      {loading ? "Loading." : `${NOT_MEASURED}. The read did not answer.`}
    </p>
  );
}

function OpenLink({ tab, children }: { tab: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => open(tab)}
      className="mt-2.5 self-start rounded-[var(--adm-radius-xs)] font-sans text-[12px] underline-offset-[3px] hover:underline"
      style={{ color: "var(--adm-ink-2)" }}
    >
      {children}
    </button>
  );
}

const count = (n: number) => n.toLocaleString("en-US");

export function HomeTab() {
  const { summary, refresh } = useAttention();
  const overview = useLiveData<Overview>("/api/admin/overview", 60_000);
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);
  const traffic = useLiveData<Traffic>("/api/admin/traffic?range=90d", 300_000);
  // A native tooltip cannot be blurred, so the money bars drop theirs while
  // streamer mode covers the chart.
  const streaming = useStreamerOn();
  // The days under the money bars. The overview series carries no dates, so
  // they are counted back from the clock, read once here because a render
  // that reads the clock is not pure.
  const [now] = useState(() => new Date());

  // ── Needs you ──────────────────────────────────────────────────────────
  const todo: AttentionItem[] = [...summary.faults, ...summary.queues];
  const gaps = summary.unmeasured;
  const checking = summary.state === "checking" && todo.length === 0;

  // ── The four numbers ───────────────────────────────────────────────────
  // Money is measured only when the route answered AND its orders read was
  // sound; a degraded read is said, never printed as a day with no sales.
  const money = overview.data && !overview.data.ordersDegraded ? overview.data : null;
  const week = money ? moneyWeek(money.revenueSeries ?? [], now) : null;
  const revenue =
    money && money.revenueTodayCents !== null
      ? formatPrice(money.revenueTodayCents, "usd")
      : overview.loading
        ? LOADING
        : NOT_MEASURED;
  const paid = figure(overview.data?.paidPlus, overview.loading);
  const live = figure(stats.data?.liveCount, stats.loading);
  const visitorsToday = stats.data?.today?.visitors;
  const signups = figure(stats.data?.today?.signups, stats.loading);

  // ── The two weeks ──────────────────────────────────────────────────────
  const visitors = traffic.data ? visitorWeeks(traffic.data.points ?? []) : [];
  const visitorAxis = weekAxis(visitors);
  const moneyAxis = week ? weekAxis(week.days) : null;

  return (
    <div className="space-y-3">
      <Panel title="Needs you">
        {checking ? (
          <p className="py-1 font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
            Checking the queues.
          </p>
        ) : todo.length === 0 && gaps.length === 0 ? (
          <p className="py-1 font-sans text-[13.5px]" style={{ color: "var(--adm-ink-2)" }}>
            Nothing needs you right now.
          </p>
        ) : (
          // The hairline colour is set on each row: a divide utility draws
          // the row's own border, and a colour on the list would not reach it.
          <ul className="divide-y">
            {todo.map((item) => (
              <li key={item.id} className="border-[color:var(--adm-line)]">
                {/* The whole line opens the page that clears it, and says
                    where it goes on the right. A fault keeps its sentence
                    under it, because "Supabase probe failed" alone does not
                    say what is at stake; a queue's count says it all. */}
                <button
                  type="button"
                  onClick={() => open(item.go.tab)}
                  title={item.cls === "queue" ? item.body : undefined}
                  className="adm-control -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 rounded-[var(--adm-radius-sm)] px-2 py-2 text-left"
                  style={ROW_STYLE}
                >
                  <StatusDot tone={item.cls === "fault" ? "bad" : "wait"} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-[13.5px]" style={{ color: "var(--adm-ink)" }}>
                      {item.label}
                    </span>
                    {item.cls === "fault" ? (
                      <span className="mt-0.5 block font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                        {item.body}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                    {item.go.label}
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
                  className="adm-control h-11 shrink-0 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]"
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

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile
          label="Revenue today"
          value={revenue}
          sub={
            week ? (
              <>
                <span className={SENSITIVE}>{formatPrice(week.totalCents, "usd")}</span> over 7 days
              </>
            ) : (
              "net, UTC day"
            )
          }
        />
        <Tile label="Paid subscribers" value={paid} sub="Plus and Pro" />
        <Tile
          label="On the site now"
          value={live}
          sub={typeof visitorsToday === "number" ? `${count(visitorsToday)} today` : "in the last 90 seconds"}
        />
        <Tile label="New readers" value={signups} sub="accounts made today" />
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Visitors, last 7 days (the week before in grey)"
          footer={<OpenLink tab="traffic">Open Traffic</OpenLink>}
        >
          {visitors.length > 0 && visitorAxis ? (
            <>
              <Bars
                label={`Visitors each day: ${visitors
                  .map((d) => `${weekday(d.day)} ${count(d.visitors)}, a week before ${count(d.weekBefore)}`)
                  .join("; ")}. Today is still counting.`}
                bars={visitors.flatMap((d) => [
                  { value: d.weekBefore, muted: true, title: `${weekday(d.day)} the week before: ${count(d.weekBefore)}` },
                  { value: d.visitors, title: `${weekday(d.day)}: ${count(d.visitors)}` },
                ])}
              />
              <Axis marks={visitorAxis} />
            </>
          ) : (
            <NoChart loading={traffic.loading} />
          )}
        </Panel>

        <Panel title="Money, last 7 days" footer={<OpenLink tab="overview">Open Money</OpenLink>}>
          {week && moneyAxis ? (
            // The shape of a revenue week is legible on a stream even with
            // every figure blurred, so the chart itself is covered.
            <div className={SENSITIVE}>
              <Bars
                label={`Money each day: ${week.days
                  .map((d) => `${weekday(d.day)} ${formatPrice(d.cents, "usd")}`)
                  .join("; ")}. Today is still counting.`}
                bars={week.days.map((d) => ({
                  value: Math.max(0, d.cents),
                  title: streaming ? undefined : `${weekday(d.day)}: ${formatPrice(d.cents, "usd")}`,
                }))}
              />
              <Axis marks={moneyAxis} />
            </div>
          ) : (
            <NoChart loading={overview.loading} />
          )}
        </Panel>
      </div>
    </div>
  );
}
