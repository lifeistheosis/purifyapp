"use client";

/**
 * Money > Subscriptions > Over time (admin item A2): who joined and who left
 * each week, which free trials paid, what Plus brought in each day, and who
 * is in a free trial now, from the RevenueCat events the webhook keeps
 * (lib/admin/plusHistory.ts says what each word counts).
 *
 * It shows only the weeks and days the events cover. Before the first kept
 * event nothing was kept, which is not the same as no Plus, so those weeks
 * are left out rather than drawn as zeros.
 */

import type { PlusDay, PlusHistoryPayload, PlusWeek } from "@/app/api/admin/plus-history/route";
import { SENSITIVE } from "@/lib/admin/streamer";
import { formatPrice } from "@/lib/shop/format";

import { useAdminFetch } from "../adminFetch";
import { BarChart } from "../charts";
import { Card, ChartFrame, DataTable, Skeleton, StatCard } from "../primitives";

const ink2 = { color: "var(--adm-ink-2)" } as const;

const usd = (cents: number) => formatPrice(cents, "usd");

/** "9 Nov", in UTC, as every day in the admin is. */
const dayLabel = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** A date under the first bar and every fifth back from today, so thirty days read on a phone too. */
const ticked = (i: number, count: number) => i === 0 || (count - 1 - i) % 5 === 0;

const note = "max-w-[72ch] font-sans text-[12.5px] leading-[1.55]";

const COLUMNS: { key: string; label: string; value: (w: PlusWeek) => number; money?: boolean }[] = [
  { key: "joined", label: "Joined", value: (w) => w.joined },
  { key: "trials", label: "Trials", value: (w) => w.trials },
  { key: "trialsPaid", label: "Trials paid", value: (w) => w.trialsPaid },
  { key: "trialsEnded", label: "Trials ended", value: (w) => w.trialsEnded },
  { key: "left", label: "Left", value: (w) => w.left },
  { key: "renewalOff", label: "Renewal off", value: (w) => w.renewalOff },
  { key: "cardFailed", label: "Card failed", value: (w) => w.cardFailed },
  { key: "refunds", label: "Refunds", value: (w) => w.refunds },
  { key: "afterStoreCents", label: "Came in", value: (w) => w.afterStoreCents, money: true },
];

function Weeks({ weeks }: { weeks: PlusWeek[] }) {
  return (
    <DataTable<PlusWeek>
      rows={[...weeks].reverse()}
      rowKey={(w) => w.week}
      csvFilename="plus-by-week.csv"
      empty="No week yet."
      columns={[
        { key: "week", label: "Week of", render: (w) => dayLabel(w.week), csv: (w) => w.week },
        ...COLUMNS.map((c) => ({
          key: c.key,
          label: c.label,
          align: "right" as const,
          render: (w: PlusWeek) =>
            c.money ? <span className={`${SENSITIVE} tabular-nums`}>{usd(c.value(w))}</span> : <span className="tabular-nums">{c.value(w)}</span>,
          csv: (w: PlusWeek) => (c.money ? (c.value(w) / 100).toFixed(2) : c.value(w)),
        })),
      ]}
    />
  );
}

function Days({ days }: { days: PlusDay[] }) {
  return (
    <ChartFrame
      title="Came in each day"
      subtitle="Plus after the store, in US dollars, refunds taken off. UTC days."
      isEmpty={days.every((d) => d.afterStoreCents === 0)}
      empty="Nothing has come in through Plus in these days."
      sensitive
    >
      <BarChart
        orientation="vertical"
        height={200}
        rows={days.map((d, i) => ({
          label: dayLabel(d.day),
          tick: ticked(i, days.length) ? dayLabel(d.day) : "",
          value: Math.round(d.afterStoreCents) / 100,
        }))}
      />
    </ChartFrame>
  );
}

/** "Set aside in these days: 2 bought with test money and 1 RevenueCat grant, none of them counted." */
function setAsideLine({ test, grants }: { test: number; grants: number }): string {
  const parts = [
    test > 0 ? `${test} bought with test money` : null,
    grants > 0 ? `${grants} RevenueCat ${grants === 1 ? "grant" : "grants"}` : null,
  ].filter(Boolean);
  return `Set aside in these days: ${parts.join(" and ")}, none of them counted.`;
}

export function PlusOverTime() {
  const { data, error } = useAdminFetch<PlusHistoryPayload>("/api/admin/plus-history");
  if (error) return <p className={note} style={ink2}>{error}</p>;
  if (!data) return <Skeleton h={240} />;

  if (data.state === "absent") {
    return (
      <Card title="Plus over time">
        <p className={note} style={ink2}>
          This waits for its table (docs/1.9-build/sql/plus-events.sql), on your OK. From the day it is there, every
          purchase, renewal, cancel and refund RevenueCat sends is kept, and this page shows who joined and who left each
          week, which free trials paid, who is in a free trial now, and what Plus brought in each day. A free trial then
          stops counting as a paying member everywhere in the admin.
        </p>
      </Card>
    );
  }
  if (data.state === "unavailable") {
    return (
      <p className={note} style={ink2}>
        The kept events could not be read just now. Nothing is lost: RevenueCat&rsquo;s events are kept as they arrive.
      </p>
    );
  }
  if (!data.since) {
    return (
      <Card title="Plus over time">
        <p className={note} style={ink2}>
          The table is there and no event has arrived yet. The first purchase, renewal or cancel RevenueCat sends will
          show here.
        </p>
      </Card>
    );
  }

  const t = data.last30;
  const sinceDay = dayLabel(data.since.slice(0, 10));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Joined" value={t.joined} accent hint="began paying, 30 days" />
        <StatCard label="Left" value={t.left} hint="a paid membership ended" />
        <StatCard label="Trials paid" value={t.trialsPaid} hint={`of ${t.trialsPaid + t.trialsEnded} trials that ended, 30 days`} />
        <StatCard label="In a free trial" value={data.inTrial} hint="Plus, nothing paid yet" />
        <StatCard label="Came in" value={usd(t.afterStoreCents)} hint="after the store, 30 days" />
      </div>

      <Days days={data.days} />

      <Card title="Week by week" subtitle="Monday to Sunday, UTC, newest first.">
        <Weeks weeks={data.weeks} />
      </Card>

      <p className={note} style={ink2}>
        Kept since {sinceDay}; nothing before it was kept, so earlier weeks are left out rather than shown as empty.
        Joined counts a paid first purchase and a free trial&rsquo;s first charge. Left is a paid membership that ended;
        renewal off is a member who turned renewal off and keeps Plus to the end of what they paid for. Came in is what
        members paid less refunds, after the store: RevenueCat&rsquo;s take-home share for Google Play and the App Store
        (its estimate of the commission and the tax), and Plus on the website at its whole price, since Stripe&rsquo;s fees
        come off in Money.
        {data.setAside.test + data.setAside.grants > 0 ? ` ${setAsideLine(data.setAside)}` : ""}
      </p>
    </div>
  );
}
