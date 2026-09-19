"use client";

// The Investors tab: the plan purifyapp.net/invest shows, and where Purify
// actually stands against it.
//
// Two readers, one set of numbers. The investor page and this tab are built
// from the same payload (lib/invest/payload.ts), so nothing here can say one
// thing while the page says another. What this tab adds is what only the
// owner needs: ahead or behind, by how much, and what the next milestone asks
// of every month between now and then.
//
// Same rule as the rest of the owner dashboard: MEASURED means counted,
// MODELLED means taken from the plan, and the plan's inputs sit next to its
// targets rather than behind a disclosure.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, Skeleton, StatCard } from "@/components/admin/primitives";
import { planAt } from "@/lib/invest/plan";
import type { InvestPayload } from "@/lib/invest/payload";

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const usd2 = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdK = (n: number) =>
  n >= 10_000
    ? `$${Math.round(n / 1000).toLocaleString("en-US")}K`
    : `$${(Math.round(n / 100) / 10).toLocaleString("en-US")}K`;
const num = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (n: number, dp = 0) => `${(n * 100).toFixed(dp)}%`;
const date = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

function Tag({ kind }: { kind: "measured" | "modelled" | "entered" }) {
  const map = {
    measured: { text: "Measured", fg: "var(--adm-good)" },
    modelled: { text: "Plan", fg: "var(--adm-warn)" },
    entered: { text: "Entered by hand", fg: "var(--adm-ink-3)" },
  } as const;
  const t = map[kind];
  return (
    <span
      className="ml-2 rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[10.5px] font-medium align-middle"
      style={{ color: t.fg, background: `color-mix(in oklab, ${t.fg}, transparent 88%)` }}
    >
      {t.text}
    </span>
  );
}

const muted = { color: "var(--adm-ink-3)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;

export function InvestorPanel() {
  const [data, setData] = useState<InvestPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    adminJson<InvestPayload>("/api/owner/investor").then((d) => {
      if (!alive) return;
      if (d) setData(d);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return failed ? (
      <Card title="Investors">
        <p className="font-sans text-[12.5px]" style={muted}>
          The investor numbers did not load. Reloading tells you whether it was the network or the
          server.
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
  const today = live ? planAt(new Date(live.asOf)) : null;
  const repaid = manual.deal.paidOutToInvestor;
  const repaidShare = Math.min(1, repaid / manual.deal.amount);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="max-w-[72ch] font-sans text-[12.5px] leading-snug" style={muted}>
          Everything below is what purifyapp.net/invest shows, from the same code. The page
          refreshes within the hour; this tab reads fresh
          {live ? `, as of ${date(live.asOf)}` : ""}.
        </p>
        <a
          href="/invest"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[var(--adm-radius-pill)] border px-3 py-1 font-sans text-[12.5px] font-medium"
          style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink)" }}
        >
          Open the investor page &#8599;
        </a>
      </div>

      {pace && live ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Revenue a year, today" value={usd(pace.actual)} hint="subscriptions and shop, measured" accent />
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

          <Card
            title="What the next milestone asks for"
            subtitle="The plan's pace, set against today's measured revenue."
          >
            {pace.next && pace.next.monthlyGrowthNeeded !== null ? (
              <p className="max-w-[70ch] font-sans text-[14px] leading-relaxed" style={{ color: "var(--adm-ink)" }}>
                To reach {usdK(pace.next.target)} a year by {date(pace.next.ends)}, revenue has to grow{" "}
                <strong>{pct(pace.next.monthlyGrowthNeeded)} a month</strong>, every month, for the next{" "}
                {Math.ceil(pace.next.monthsLeft)} months.
                <Tag kind="modelled" />
              </p>
            ) : (
              <p className="font-sans text-[13px]" style={muted}>
                No revenue measured yet, so there is no rate to grow from.
              </p>
            )}
            {today ? (
              <div className="mt-4 grid gap-2 font-sans text-[12.5px] sm:grid-cols-2">
                <p style={ink2}>
                  Subscriptions: {usd(live.runRate.subscriptions)} a year
                  <Tag kind="measured" /> against {usd(today.subscriptions)} planned
                </p>
                <p style={ink2}>
                  Shop: {usd(live.runRate.shop)} a year
                  <Tag kind="measured" /> against {usd(today.shop)} planned
                </p>
              </div>
            ) : null}
            <p className="mt-3 max-w-[72ch] font-sans text-caption leading-snug" style={muted}>
              Revenue a year is subscriptions at list price (monthly revenue times twelve) plus the
              shop&#8217;s paid orders in the last 30 days times twelve, before store fees.
            </p>
          </Card>
        </>
      ) : (
        <Card title="Live numbers unavailable">
          <p className="font-sans text-[12.5px]" style={muted}>
            The live read failed, so the investor page is showing the figures printed in it. The
            plan below is unaffected.
          </p>
        </Card>
      )}

      <Card title="The plan" subtitle="Revenue a year at the end of each year since launch, with what each target takes.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse font-sans text-[12.5px] tabular-nums">
            <thead>
              <tr style={muted}>
                {["Year", "Subscriptions", "Members", "Shop", "Orders a month", "Total", "Share of reachable"].map((h) => (
                  <th key={h} className="border-b py-2 pr-3 text-left font-medium" style={{ borderColor: "var(--adm-line)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.years.map((y) => (
                <tr key={y.year} style={{ color: "var(--adm-ink)" }}>
                  <td className="border-b py-2 pr-3" style={{ borderColor: "var(--adm-line)" }}>
                    {y.label}
                    <span className="ml-1" style={muted}>
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
        <p className="mt-3 max-w-[72ch] font-sans text-caption leading-snug" style={muted}>
          Members at {usd(plan.memberPricePerYear)} a year each, shop orders at {usd(plan.averageOrder)} each,
          and the share of the {num(plan.reachablePractising)} practising Orthodox who can use Purify in English
          today. The targets live in lib/invest/plan.ts, the one place both this tab and the investor page read.
          <Tag kind="modelled" />
        </p>
      </Card>

      {live ? (
        <Card title="What the investor page shows right now" subtitle="Counted from the database, the same reads the page makes.">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Accounts" value={num(live.accounts.total)} hint={`${num(live.accounts.new30)} new in 30 days`} />
            <StatCard
              label="Page views"
              value={`${num(live.pageviews.total / 1000)}K`}
              hint={`${num(live.pageviews.last14 / 1000)}K in the last 14 days`}
            />
            <StatCard label="Countries" value={num(live.audience.countries)} hint={`${pct(live.audience.usShare30)} of 30-day visits from the US`} />
            <StatCard label="Paying members" value={num(live.subscriptions.paying)} hint={`${usd2(live.subscriptions.mrrCents / 100)} a month`} />
            <StatCard label="In carts" value={usd(live.shop.cartValueCents / 100)} hint={`${num(live.shop.cartItems)} items across ${num(live.shop.carts)} carts`} />
            <StatCard
              label="Paid shop orders"
              value={usd2(live.shop.paidCents / 100)}
              hint={`${num(live.shop.paidOrders)} orders, ${usd2(live.shop.paid30Cents / 100)} in 30 days`}
            />
            <StatCard
              label="Median margin"
              value={live.shop.medianMargin === null ? "None yet" : pct(live.shop.medianMargin)}
              hint="list price over supplier cost"
            />
            <StatCard
              label="Growth since May"
              value={live.accounts.atFirstMonthEnd > 0 ? `${Math.round(live.accounts.total / live.accounts.atFirstMonthEnd)}x` : "None yet"}
              hint={`from ${num(live.accounts.atFirstMonthEnd)} at the end of the launch month`}
            />
          </div>
        </Card>
      ) : null}

      <Card title="Entered by hand" subtitle="Figures nothing in the app can count. Change them in lib/invest/manual.ts.">
        <ul className="space-y-2 font-sans text-[12.5px]" style={ink2}>
          <li>
            Organic views on the cover: {manual.organicViewsHeadline}
            <Tag kind="entered" />
          </li>
          <li>
            TikTok, {manual.tiktok.window}: {num(manual.tiktok.views)} views, {num(manual.tiktok.likes)} likes,{" "}
            {num(manual.tiktok.shares)} shares
            <Tag kind="entered" />
          </li>
          <li>
            App Store rating: {manual.appStoreRating.toFixed(1)}
            <Tag kind="entered" />
          </li>
          <li>
            The deal: {usd(manual.deal.amount)} for {manual.deal.stakeUntilRepaid}% until repaid, then{" "}
            {manual.deal.stakeForGood}% for good
            <Tag kind="entered" />
          </li>
        </ul>
        <div className="mt-4">
          <p className="mb-1 font-sans text-[12.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
            Paid out to the investor: {usd(repaid)} of {usd(manual.deal.amount)}
            <span className="ml-2" style={muted}>
              {repaidShare >= 1
                ? `repaid, his stake is now ${manual.deal.stakeForGood}%`
                : `his stake drops to ${manual.deal.stakeForGood}% at ${usd(manual.deal.amount)}`}
            </span>
          </p>
          <span
            className="block h-2 overflow-hidden rounded-[var(--adm-radius-pill)]"
            style={{ background: "var(--adm-panel-2)" }}
          >
            <span
              className="block h-full"
              style={{ width: `${Math.max(1, repaidShare * 100)}%`, background: "var(--adm-accent)" }}
            />
          </span>
        </div>
      </Card>
    </div>
  );
}
