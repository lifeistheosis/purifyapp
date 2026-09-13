"use client";

// Overview, below the hero: the rest of the panel in one number each, the
// recent paid orders, and the 30-day revenue chart.
//
// WHAT LEFT THIS FILE, AND WHY. It used to open with seven KpiCards in two
// headed rows ("At a glance", "Subscribers"), two of them accented, above the
// widgets. Every one of those figures was already on screen at a heavier
// weight: the hero directly above carries revenue, visitors and new users at
// 30px with a sparkline, and the rail carries revenue today and paid
// subscribers. So the eye met the same fact three times at three sizes and
// nothing stood out. Now the hero is the only 30px, this row is the only
// 23px, and there is no accent below the hero at all: accent means selection
// or a primary action in primitives.tsx, and a number is neither.
//
// The two figures the hero does not carry (orders paid, paid subscribers)
// lead the "Elsewhere" row through OverviewWidgets' `leading` slot, at the
// same weight as the widgets beside them.
//
// TWO CHART TREES. Above lg the chart is open, as before. Below lg it is
// folded in a Disclosure under the orders list, because on a phone a
// 30-day area chart is the last thing the first screen needs. Both render
// and the breakpoint picks one; DataTable set that precedent.

import { useLiveData } from "@/lib/admin/useLiveData";
import { Card, ChartFrame, Disclosure, Email, KpiCard } from "../primitives";
import { OverviewWidgets } from "../OverviewWidgets";
import { AreaChart, SERIES_COLORS } from "../charts";
import { formatPrice } from "@/lib/shop/format";
import { SENSITIVE } from "@/lib/admin/streamer";

type Overview = {
  /** null when shop_orders could not be read. */
  revenueTodayCents: number | null;
  revenue30Cents: number | null;
  revenueSeries: number[];
  ordersDegraded: boolean;
  /** null when the count could not be taken. */
  ordersTotal: number | null;
  ordersPaid: number | null;
  ordersPending: number | null;
  ordersCancelled: number | null;
  newUsers30: number | null;
  paidPlus: number;
  paidPro: number;
  comped: number;
  recent: {
    id: string;
    email: string | null;
    totalCents: number;
    createdAt: string;
  }[];
};

const DASH = "—";

function money(cents: number): string {
  return formatPrice(cents, "usd");
}

/** A count, or the dash for one that could not be taken. Never a zero it cannot stand behind. */
const count = (v: number | null | undefined): string | number =>
  v === null || v === undefined ? DASH : v;

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CommerceOverviewTab() {
  // useLiveData, not a hand-rolled setInterval. This is the DEFAULT tab, so
  // its timer starts on every admin open, and a bare interval keeps firing
  // in a hidden window. The hook stops on document.hidden and reads at once
  // on return. The shell and the attention hook subscribe to this same URL;
  // liveStore collapses all three into one timer.
  const { data, loading } = useLiveData<Overview>("/api/admin/overview", 30_000);
  // Three placeholders, three facts: a count while it loads is "…", a count
  // the route never delivered is a dash, and a count that arrived is itself.
  // "…" for ever on a failed read looked like a panel still thinking.
  const pending = !data && loading;

  const series = data?.revenueSeries ?? [];
  const degraded = data?.ordersDegraded ?? false;

  const chart = (
    <AreaChart
      labels={series.map((_, i) => `${30 - i}d`)}
      series={[
        {
          name: "Net revenue",
          color: SERIES_COLORS[0],
          data: series.map((c) => Math.round(c / 100)),
        },
      ]}
    />
  );
  // Unmeasured is not empty. A route that never answered has no series, a
  // degraded read sends an empty one, and "No revenue in the last 30 days"
  // would be a claim about a table that was not read in either case.
  const unread = !data;
  const chartEmpty = unread || degraded || series.every((v) => v === 0);
  const chartEmptyCopy = unread
    ? pending
      ? "…"
      : "The orders could not be read, so this chart is unmeasured."
    : degraded
      ? "The orders table did not answer, so this chart is unmeasured."
      : "No revenue in the last 30 days.";

  return (
    <div className="space-y-6">
      <OverviewWidgets
        leading={
          <>
            <KpiCard
              label="Orders paid"
              value={data ? count(data.ordersPaid) : pending ? "…" : DASH}
              hint={
                data
                  ? `${count(data.ordersPending)} pending, ${count(data.ordersCancelled)} cancelled`
                  : undefined
              }
            />
            <KpiCard
              label="Paid subscribers"
              subtitle="Plus, incl. Pro"
              value={data ? data.paidPlus : pending ? "…" : DASH}
              hint={data ? `${data.paidPro} Pro, ${data.comped} comped` : undefined}
            />
          </>
        }
      />

      <Card title="Recent paid orders">
        {data?.recent && data.recent.length > 0 ? (
          <ul className="divide-y divide-paper/[0.06]">
            {data.recent.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 py-2.5 font-sans text-detail"
              >
                <span className="text-paper/85 truncate">
                  <Email value={o.email} fallback="Guest" />
                </span>
                <span className="flex items-center gap-3 shrink-0 tabular-nums">
                  {/* Under the streamer mask, like every other money figure
                      on this screen. These eight were bare spans, so a stream
                      showed real order totals while the cards around them
                      blurred. */}
                  <span className={`text-paper font-semibold ${SENSITIVE}`}>
                    {money(o.totalCents)}
                  </span>
                  <span className="text-paper/45">{ago(o.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-sans text-detail text-paper/45">
            {data
              ? degraded
                ? "The orders table did not answer."
                : "No paid orders yet."
              : pending
                ? "…"
                : "The orders could not be read."}
          </p>
        )}
      </Card>

      <div className="hidden lg:block">
        <ChartFrame
          title="Net revenue, last 30 days"
          subtitle="Paid orders minus refunds, by UTC day."
          isEmpty={chartEmpty}
          empty={chartEmptyCopy}
        >
          {chart}
        </ChartFrame>
      </div>
      <div className="lg:hidden">
        <Disclosure title="Net revenue by day, last 30 days" hint="Paid orders minus refunds, by UTC day">
          {chartEmpty ? (
            <p className="py-6 text-center font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
              {chartEmptyCopy}
            </p>
          ) : (
            chart
          )}
        </Disclosure>
      </div>
    </div>
  );
}
