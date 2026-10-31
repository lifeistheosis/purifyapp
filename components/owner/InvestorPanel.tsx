"use client";

// The plan: Strategy's first view, his pick B on r3-17 (2026-10-30), "the
// plan against what happened".
//
// "The question Strategy is opened with is are we on plan. One chart answers
// it, and each assumption behind it is one tap away." So the view is one
// chart, revenue a year from launch to Year 1 on a log scale: the plan
// dashed, what was counted solid, today lit, the gap between them, and the
// pace Year 1 needs in words, with Years 2 and 3 named at its edge. Under it
// three doors, Counted, The model and Markets, each the next view of this
// page. What purifyapp.net/invest shows, the plan's table and the figures
// entered by hand are folded under the doors, not gone.
//
// The counted line is today's point alone: nothing keeps revenue a month by
// month yet. The table it needs is proposed, not added
// (boards/purify-master/r18/admin-sql/strategy-monthly-revenue.sql).
//
// Two readers, one set of numbers: the investor page and this view are built
// from the same payload (lib/invest/payload.ts). MEASURED means counted,
// MODELLED means taken from the plan; a solid dot is counted, a ring is
// assumed, a dashed line is the plan.

import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { laterTargets, planChart, planSentence, usdShort, type PlanChart } from "@/lib/admin/planChart";
import type { InvestPayload } from "@/lib/invest/payload";
import { planAt } from "@/lib/invest/plan";
import { Card, Disclosure, Skeleton, StatCard, StatusDot } from "@/components/admin/primitives";

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const usd2 = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdK = (n: number) =>
  n >= 10_000 ? `$${Math.round(n / 1000).toLocaleString("en-US")}K` : `$${(Math.round(n / 100) / 10).toLocaleString("en-US")}K`;
const num = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (n: number, dp = 0) => `${(n * 100).toFixed(dp)}%`;
const date = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

/** What each door says, worked out by the dashboard that owns the model. */
export type PlanDoors = {
  counted: { accounts: number; paying: number } | null;
  model: { annual: number; scenario: string; install: number; pay: number; price: number } | null;
  markets: { name: string; delta: number; scenario: string } | null;
};

// Read once a visit and kept, so moving between Strategy's views does not
// read the database again each time (the sheet's complaint about Today).
const KEPT: { payload: InvestPayload | null; at: number } = { payload: null, at: 0 };
const KEEP_MS = 5 * 60_000;

export function InvestorPanel({ doors }: { doors?: PlanDoors }) {
  const [data, setData] = useState<InvestPayload | null>(KEPT.payload);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => setNow(new Date()), 0);
    if (!KEPT.payload || Date.now() - KEPT.at > KEEP_MS) {
      adminJson<InvestPayload>("/api/owner/investor").then((d) => {
        if (!alive) return;
        if (d) {
          KEPT.payload = d;
          KEPT.at = Date.now();
          setData(d);
        } else setFailed(true);
      });
    }
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  if (!data || !now) {
    return failed ? (
      <Card title="The plan">
        <p className="font-sans text-[12.5px]" style={ink3}>
          The plan&apos;s numbers did not load. Reloading tells you whether it was the network or the server.
        </p>
      </Card>
    ) : (
      <div className="space-y-3">
        <Skeleton w="100%" h={90} />
        <Skeleton w="100%" h={220} />
      </div>
    );
  }

  const { live, plan, pace, manual } = data;
  const actual = live ? live.runRate.total : null;
  const wide = planChart({ now, actual, width: 760, height: 300 });
  const narrow = planChart({ now, actual, width: 360, height: 250, compact: true });
  const sentence = planSentence(pace);
  const [lead, ...rest] = sentence.split(". ");
  const today = live ? planAt(new Date(live.asOf)) : null;
  const repaid = manual.deal.paidOutToInvestor;
  const repaidShare = Math.min(1, repaid / manual.deal.amount);

  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 font-sans text-[12px]" style={ink3}>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone="good" /> counted
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone="wait" /> assumed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-3.5 border-t border-dashed" style={{ borderColor: "var(--adm-ink-2)" }} /> the plan
        </span>
      </p>

      <section className="rounded-[var(--adm-radius)] border px-4 pb-3 pt-3.5" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="font-sans text-[13.5px] font-semibold" style={ink}>
            Revenue a year, to the next milestone
            <span className="ml-2 hidden font-normal md:inline" style={ink3}>
              on a log scale, where steady growth is a straight line
            </span>
          </p>
          <p className="hidden font-sans text-[13px] md:block" style={ink2}>
            <span className="font-semibold" style={ink}>
              {lead.endsWith(".") ? lead : `${lead}.`}
            </span>{" "}
            {rest.join(". ")}
          </p>
        </div>
        <div className="mt-2 hidden md:block">
          <PlanSvg chart={wide} />
        </div>
        <div className="mt-2 md:hidden">
          <PlanSvg chart={narrow} compact />
        </div>
        <p className="mt-2 font-sans text-[13px] md:hidden" style={ink2}>
          <span className="font-semibold" style={ink}>
            {lead.endsWith(".") ? lead : `${lead}.`}
          </span>{" "}
          {rest.join(". ")}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t pt-2 font-sans text-[11.5px]" style={{ borderColor: "var(--adm-line)", ...ink3 }}>
          <span>
            Counted: today&apos;s point alone, until a figure a month is kept. The plan: lib/invest/plan.ts.
          </span>
          <span>{laterTargets()}</span>
        </div>
      </section>

      <nav aria-label="What the plan rests on" className="grid gap-3 md:grid-cols-3">
        <Door
          href="#tab=owner-today"
          tone="good"
          name="Counted"
          line={doors?.counted ? `${num(doors.counted.accounts)} accounts, ${num(doors.counted.paying)} paying` : "Accounts and paying members"}
          sub={
            doors?.counted && doors.counted.paying > 0
              ? `1 in ${num(doors.counted.accounts / doors.counted.paying)} accounts pays`
              : "counted, not assumed"
          }
        />
        <Door
          href="#tab=owner-model"
          tone="wait"
          name="The model"
          line={doors?.model ? `${usdShort(doors.model.annual)} a year at ${doors.model.scenario}` : "What the assumptions say"}
          sub={
            doors?.model
              ? `install ${pct(doors.model.install, 0)}, pay ${pct(doors.model.pay, 0)}, ${usd(doors.model.price)} a member`
              : "every input on the same screen"
          }
        />
        <Door
          href="#tab=owner-markets"
          tone="wait"
          name="Markets"
          line={doors?.markets ? `${doors.markets.name} would add the most` : "Where the reach could come from"}
          sub={doors?.markets ? `about ${usdShort(doors.markets.delta)} a year at ${doors.markets.scenario}` : "each language, run with and without it"}
        />
      </nav>

      <Disclosure title="The plan in full, and what the investor page shows" hint="The targets, the live counts, and the figures entered by hand.">
        <div className="space-y-5">
          <p className="max-w-[72ch] font-sans text-[12.5px] leading-snug" style={ink3}>
            Everything here is what purifyapp.net/invest shows, from the same code. The page refreshes within the hour; this
            reads fresh{live ? `, as of ${date(live.asOf)}` : ""}.{" "}
            <a href="/invest" target="_blank" rel="noopener noreferrer" className="underline underline-offset-[3px]" style={ink2}>
              Open the investor page
            </a>
          </p>

          {pace && live ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Revenue a year, today" value={usd(pace.actual)} hint="subscriptions and shop, counted" accent />
              <StatCard label="The plan for today" value={usd(pace.planned)} hint="where the plan expects to be" />
              <StatCard
                label="Against the plan"
                value={`${pace.gap >= 0 ? "+" : "-"}${usd(Math.abs(pace.gap))}`}
                hint={pace.status === "on plan" ? "on plan, within 5%" : pace.status}
              />
              <StatCard
                label={pace.next ? `Next: ${pace.next.label}` : "Plan complete"}
                value={pace.next ? usdK(pace.next.target) : usdK(pace.actual)}
                hint={pace.next ? `a year by ${date(pace.next.ends)}` : undefined}
              />
            </div>
          ) : null}
          {today && live ? (
            <p className="font-sans text-[12.5px]" style={ink2}>
              Subscriptions {usd(live.runRate.subscriptions)} a year counted, against {usd(today.subscriptions)} planned. Shop{" "}
              {usd(live.runRate.shop)} a year counted, against {usd(today.shop)} planned. Revenue a year is subscriptions at list
              price (monthly revenue times twelve) plus the shop&apos;s paid orders in the last 30 days times twelve, before store
              fees.
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse font-sans text-[12.5px] tabular-nums">
              <thead>
                <tr style={ink3}>
                  {["Year", "Subscriptions", "Members", "Shop", "Orders a month", "Total", "Share of reachable"].map((h) => (
                    <th key={h} className="border-b py-2 pr-3 text-left font-medium" style={{ borderColor: "var(--adm-line)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan.years.map((y) => (
                  <tr key={y.year} style={ink}>
                    <td className="border-b py-2 pr-3" style={{ borderColor: "var(--adm-line)" }}>
                      {y.label}
                      <span className="ml-1" style={ink3}>
                        {date(y.ends)}
                      </span>
                    </td>
                    <td className="border-b py-2 pr-3" style={{ borderColor: "var(--adm-line)" }}>{usdK(y.subscriptions)}</td>
                    <td className="border-b py-2 pr-3" style={{ borderColor: "var(--adm-line)" }}>{num(y.members)}</td>
                    <td className="border-b py-2 pr-3" style={{ borderColor: "var(--adm-line)" }}>{usdK(y.shop)}</td>
                    <td className="border-b py-2 pr-3" style={{ borderColor: "var(--adm-line)" }}>{num(y.ordersPerMonth)}</td>
                    <td className="border-b py-2 pr-3 font-semibold" style={{ borderColor: "var(--adm-line)" }}>{usdK(y.total)}</td>
                    <td className="border-b py-2 pr-3" style={{ borderColor: "var(--adm-line)" }}>{pct(y.shareOfReachable, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-[72ch] font-sans text-[12px] leading-snug" style={ink3}>
            Members at {usd(plan.memberPricePerYear)} a year each, shop orders at {usd(plan.averageOrder)} each, and the share of
            the {num(plan.reachablePractising)} practising Orthodox who can use Purify in English today. The targets live in
            lib/invest/plan.ts, the one place this view and the investor page read.
          </p>

          {live ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Accounts" value={num(live.accounts.total)} hint={`${num(live.accounts.new30)} new in 30 days`} />
              <StatCard label="Page views" value={`${num(live.pageviews.total / 1000)}K`} hint={`${num(live.pageviews.last14 / 1000)}K in the last 14 days`} />
              <StatCard label="Countries" value={num(live.audience.countries)} hint={`${pct(live.audience.usShare30)} of 30-day visits from the US`} />
              <StatCard label="Paying members" value={num(live.subscriptions.paying)} hint={`${usd2(live.subscriptions.mrrCents / 100)} a month`} />
              <StatCard label="In carts" value={usd(live.shop.cartValueCents / 100)} hint={`${num(live.shop.cartItems)} items across ${num(live.shop.carts)} carts`} />
              <StatCard label="Paid shop orders" value={usd2(live.shop.paidCents / 100)} hint={`${num(live.shop.paidOrders)} orders, ${usd2(live.shop.paid30Cents / 100)} in 30 days`} />
              <StatCard label="Median margin" value={live.shop.medianMargin === null ? "None yet" : pct(live.shop.medianMargin)} hint="list price over supplier cost" />
              <StatCard
                label="Growth since May"
                value={live.accounts.atFirstMonthEnd > 0 ? `${Math.round(live.accounts.total / live.accounts.atFirstMonthEnd)}x` : "None yet"}
                hint={`from ${num(live.accounts.atFirstMonthEnd)} at the end of the launch month`}
              />
            </div>
          ) : (
            <p className="font-sans text-[12.5px]" style={ink3}>
              The live read failed, so the investor page is showing the figures printed in it. The plan above is unaffected.
            </p>
          )}

          <div>
            <p className="mb-1 font-sans text-[12.5px] font-semibold" style={ink}>
              Entered by hand
            </p>
            <ul className="space-y-1 font-sans text-[12.5px]" style={ink2}>
              <li>Organic views on the cover: {manual.organicViewsHeadline}</li>
              <li>
                TikTok, {manual.tiktok.window}: {num(manual.tiktok.views)} views, {num(manual.tiktok.likes)} likes,{" "}
                {num(manual.tiktok.shares)} shares
              </li>
              <li>App Store rating: {manual.appStoreRating.toFixed(1)}</li>
              <li>
                The deal: {usd(manual.deal.amount)} for {manual.deal.stakeUntilRepaid}% until repaid, then {manual.deal.stakeForGood}% for
                good. Paid out to the investor: {usd(repaid)} of {usd(manual.deal.amount)}
                {repaidShare >= 1
                  ? `, repaid: his stake is now ${manual.deal.stakeForGood}%.`
                  : `; his stake drops to ${manual.deal.stakeForGood}% at ${usd(manual.deal.amount)}.`}
              </li>
            </ul>
            <p className="mt-1 font-sans text-[11.5px]" style={ink3}>
              Change these in lib/invest/manual.ts.
            </p>
          </div>
        </div>
      </Disclosure>
    </div>
  );
}

/** One door: what a view of this page says, and the way into it. */
function Door({ href, tone, name, line, sub }: { href: string; tone: "good" | "wait"; name: string; line: string; sub: string }) {
  return (
    <a
      href={href}
      className="adm-control flex min-h-11 items-center gap-3 rounded-[var(--adm-radius)] border px-4 py-3"
      style={
        {
          "--_bd": "var(--adm-line)",
          "--_bg": "var(--adm-panel)",
          "--_bg-hover": "var(--adm-panel-2)",
          borderColor: "var(--adm-line)",
        } as React.CSSProperties
      }
    >
      <StatusDot tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[12px]" style={ink3}>
          {name}
        </span>
        <span className="block font-sans text-[13.5px] font-semibold" style={ink}>
          {line}
        </span>
        <span className="block font-sans text-[12px]" style={ink3}>
          {sub}
        </span>
      </span>
      <span aria-hidden style={ink3}>
        ›
      </span>
    </a>
  );
}

/** The chart, drawn from lib/admin/planChart.ts on the admin's tokens. */
function PlanSvg({ chart, compact = false }: { chart: PlanChart; compact?: boolean }) {
  const { box, today, end } = chart;
  const font = { fontFamily: "var(--font-mono)", fontSize: compact ? 10 : 11 } as const;
  const gap = today.gap;
  const gapWord = gap === null ? "" : `${usdShort(Math.abs(gap))} ${gap < 0 ? "behind" : "ahead"}`;
  const label = (x: number, y: number, text: string, anchor: "start" | "end" | "middle", strong = false) => (
    <text x={x} y={y} textAnchor={anchor} style={{ ...font, fill: strong ? "var(--adm-ink)" : "var(--adm-ink-3)" }}>
      {text}
    </text>
  );
  const describe = `Revenue a year on a log scale. The plan expects ${usdShort(today.planned)} today${
    today.actual !== null ? `; counted, ${usdShort(today.actual)}; ${gapWord}` : ""
  }; ${end.label}.`;
  return (
    <svg viewBox={`0 0 ${chart.width} ${chart.height}`} width="100%" role="img" aria-label={describe} className="block">
      {chart.yTicks.map((t) => (
        <g key={t.usd}>
          <line x1={box.left} x2={box.right} y1={t.y} y2={t.y} stroke="var(--adm-line)" strokeWidth={1} />
          {label(box.left - 8, t.y + 4, t.label, "end")}
        </g>
      ))}
      {chart.xTicks.map((t, i) => (
        <g key={`${t.label}${i}`}>
          {i > 0 && t.label !== "Today" ? <line x1={t.x} x2={t.x} y1={box.top} y2={box.bottom} stroke="var(--adm-line)" strokeWidth={1} /> : null}
          {label(t.x, box.bottom + 18, t.label, i === 0 ? "start" : i === chart.xTicks.length - 1 ? "end" : "middle", t.label === "Today")}
        </g>
      ))}
      {/* Today: a hairline down the chart. */}
      <line x1={today.x} x2={today.x} y1={box.top} y2={box.bottom} stroke="var(--adm-line-strong)" strokeWidth={1} strokeDasharray="2 3" />
      {/* The plan, dashed. */}
      <path d={chart.planPath} fill="none" stroke="var(--adm-ink-2)" strokeWidth={1.5} strokeDasharray="5 4" />
      {/* What was counted, solid, once there is more than today's point. */}
      {chart.countedPath ? <path d={chart.countedPath} fill="none" stroke="var(--adm-ink)" strokeWidth={2} /> : null}
      {/* The gap between them at today. */}
      {today.actualAt ? (
        <line x1={today.x} x2={today.x} y1={today.plannedAt.y} y2={today.actualAt.y} stroke="var(--adm-ink)" strokeWidth={1.5} />
      ) : null}
      {/* The plan's point today: a ring. */}
      <circle cx={today.plannedAt.x} cy={today.plannedAt.y} r={4} fill="var(--adm-bg)" stroke="var(--adm-ink-2)" strokeWidth={1.5} />
      {/* Year 1: a ring at the edge. */}
      <circle cx={end.x} cy={end.y} r={5} fill="var(--adm-bg)" stroke="var(--adm-ink-2)" strokeWidth={1.5} />
      {label(end.x - 8, end.y - 10, compact ? usdShort(end.target) : end.label, "end")}
      {/* Today, counted: the one lit thing. */}
      {today.actualAt ? (
        <circle
          cx={today.actualAt.x}
          cy={today.actualAt.y}
          r={5}
          fill="var(--adm-ink)"
          style={{ filter: "drop-shadow(0 0 5px color-mix(in oklab, var(--adm-ink), transparent 35%))" }}
        />
      ) : null}
      {label(today.x - 10, today.plannedAt.y - 8, compact ? `plan ${usdShort(today.planned)}` : `${usdShort(today.planned)}, the plan for today`, "end")}
      {today.actualAt && today.actual !== null ? (
        <>
          {gap !== null ? label(today.x + 10, (today.plannedAt.y + today.actualAt.y) / 2 + 4, gapWord, "start", true) : null}
          {label(
            today.x + 10,
            today.actualAt.y + (gap !== null && gap < 0 ? 16 : -8),
            compact ? `${usdShort(today.actual)} today` : `${usdShort(today.actual)} today, counted`,
            "start",
            true,
          )}
        </>
      ) : null}
    </svg>
  );
}
