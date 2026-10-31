"use client";

/**
 * Money's Overview: came in, went out, kept. The owner's pick A on sheet
 * r3-15 (2026-10-30): "Money? Do A for money?"
 *
 * Three figures for the period: what came in (the shop, paid less refunds,
 * and Plus after the stores' cut), what went out (the cost lines, the goods
 * sold at their cost, and Stripe's fees) and what was kept. An estimate wears
 * a dashed line and the word est. Donations, typed in by hand, stand apart
 * and are in no total, as lib/admin/profit.ts rules. Then the shop's days
 * against the period before, the newest paid orders, and Revenue,
 * Subscriptions and Costs as one line each with its headline; each line
 * opens its view, which keeps its detail.
 *
 * His log is why: Money is a ten second look, and came in, went out, kept is
 * the whole answer. Every figure comes from /api/admin/money, and a part that
 * could not be read is named under the figures, never counted as nothing.
 */

import { useEffect, useState, type ReactNode } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { MONEY_PERIODS, type MoneyPeriod } from "@/lib/admin/money";
import { SENSITIVE } from "@/lib/admin/streamer";
import { formatPrice } from "@/lib/shop/format";

import { Est, Figure, GoLabel, Panel, PanelLink, Quiet, Segmented, TrendLine } from "../daily/parts";
import { Email } from "../primitives";

type Payload = {
  period: MoneyPeriod;
  label: string;
  beforeLabel: string;
  since: string;
  months: number;
  buckets: "day" | "month";
  cameIn: { cents: number | null; estimated: boolean; missing: string[]; shopCents: number | null; plusCents: number | null };
  wentOut: {
    cents: number | null;
    missing: string[];
    costLinesCents: number | null;
    goodsCents: number | null;
    goodsUnits: number | null;
    goodsUnknownUnits: number;
    feesCents: number | null;
    stripeNote: string | null;
  };
  kept: { cents: number | null; estimated: boolean; pctOfCameIn: number | null };
  donations: { cents: number | null; recorded: boolean; thisMonthCents: number | null; goalCents: number };
  chart: { current: number[]; before: number[] } | null;
  recent: { email: string | null; totalCents: number; at: string }[];
  lines: {
    revenue: { paidOrders: number | null; averageCents: number | null; refunds: number | null; openCheckouts: number | null };
    subscriptions: { paying: number; pro: number; comped: number; gifted: number; grandfathered: number } | null;
    costs: { monthlyCents: number | null; lines: number };
  };
  unread: string[];
};

function open(tab: string) {
  window.location.hash = `tab=${tab}`;
}

const usd = (cents: number) => formatPrice(cents, "usd");
const n = (v: number) => v.toLocaleString("en-US");
const plural = (k: number, one: string, many: string) => (k === 1 ? `1 ${one}` : `${n(k)} ${many}`);

/** A money figure, or the words for why there is none. Dashed when it is an estimate. */
function Money({ cents, est = false, size = 40, lit = false }: { cents: number | null; est?: boolean; size?: number; lit?: boolean }) {
  if (cents === null) {
    return (
      <span className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
        Not measured
      </span>
    );
  }
  return (
    <Figure size={size} lit={lit} sensitive>
      {est ? <Est>{usd(cents)}</Est> : usd(cents)}
    </Figure>
  );
}

function Row({ label, cents, est = false, note }: { label: ReactNode; cents: number | null; est?: boolean; note?: string }) {
  return (
    <div className="flex items-baseline gap-2.5 border-t py-2 font-sans text-[13px]" style={{ borderColor: "var(--adm-line)" }}>
      <span className="min-w-0 flex-1" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </span>
      {cents === null ? (
        <span className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {note ?? "not known"}
        </span>
      ) : (
        <span className={"font-mono text-[12.5px] " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
          {est ? <span className="adm-est">{usd(cents)}</span> : usd(cents)}
        </span>
      )}
    </div>
  );
}

function BigCard({ label, figure, children }: { label: string; figure: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-[8px] border px-[18px] pb-2 pt-4" style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)" }}>
      <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </p>
      <p className="my-3 flex min-h-[42px] items-center">{figure}</p>
      {children}
    </section>
  );
}

/** The marks under the chart: the period's first bucket, its middle, and today. */
function marksFor(p: Payload, length: number): [string, string, string] {
  const since = new Date(p.since);
  if (p.buckets === "month") {
    const at = (k: number) =>
      new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + k, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return [at(0), at(Math.floor(length / 2)), "now"];
  }
  const at = (k: number) =>
    new Date(since.getTime() + k * 86_400_000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return [at(0), at(Math.floor(length / 2)), "today"];
}

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const clock = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return same ? clock : `${d.toLocaleDateString("en-US", { weekday: "short" })} ${clock}`;
};

export function MoneyOverviewTab() {
  const [period, setPeriod] = useState<MoneyPeriod>("month");
  const [got, setGot] = useState<{ period: MoneyPeriod; data: Payload | null } | null>(null);

  useEffect(() => {
    let alive = true;
    void adminJson<Payload>(`/api/admin/money?period=${period}`).then((d) => {
      if (alive) setGot({ period, data: d });
    });
    return () => {
      alive = false;
    };
  }, [period]);

  const p = got?.period === period ? got.data : null;
  const loading = got?.period !== period;
  const failed = !loading && !p;

  const missingNotes: string[] = [];
  if (p) {
    if (p.cameIn.missing.length > 0) missingNotes.push(`Came in leaves out ${p.cameIn.missing.join(" and ")}, which could not be read.`);
    if (p.wentOut.missing.length > 0) {
      missingNotes.push(
        `Went out leaves out ${p.wentOut.missing.join(", ")}${p.wentOut.stripeNote ? ` (${p.wentOut.stripeNote.charAt(0).toLowerCase()}${p.wentOut.stripeNote.slice(1)})` : ""}.`,
      );
    }
  }

  const rev = p?.lines.revenue;
  const subs = p?.lines.subscriptions;
  const costs = p?.lines.costs;
  const viewLines: { tab: string; name: string; line: string }[] = p
    ? [
        {
          tab: "revenue",
          name: "Revenue",
          line:
            rev && rev.paidOrders !== null
              ? [
                  `${plural(rev.paidOrders, "paid order", "paid orders")} ${p.period === "month" ? "this month" : `in ${p.label}`}${
                    rev.averageCents !== null ? `, ${usd(rev.averageCents)} on average` : ""
                  }`,
                  rev.openCheckouts !== null ? `${plural(rev.openCheckouts, "checkout", "checkouts")} still open` : null,
                  rev.refunds ? plural(rev.refunds, "refund", "refunds") : null,
                ]
                  .filter(Boolean)
                  .join("; ")
              : "The orders could not be read just now",
        },
        {
          tab: "subscriptions",
          name: "Subscriptions",
          line: subs
            ? `${n(subs.paying)} paying, ${n(subs.pro)} of them Pro; and ${n(subs.comped)} comped, ${n(subs.gifted)} gifted, ${n(subs.grandfathered)} grandfathered`
            : "Who pays could not be read just now",
        },
        {
          tab: "costs",
          name: "Costs",
          line:
            costs && costs.monthlyCents !== null
              ? `${usd(costs.monthlyCents)} a month over ${plural(costs.lines, "line", "lines")}${
                  p.donations.thisMonthCents !== null
                    ? `; donations ${usd(p.donations.thisMonthCents)} of the ${usd(p.donations.goalCents)} goal, typed in by hand`
                    : ""
                }`
              : "The cost lines could not be read just now",
        },
      ]
    : [];

  return (
    <div className="space-y-3.5">
      <div className="hidden justify-end md:flex">
        <Segmented<MoneyPeriod> label="Period" options={MONEY_PERIODS} value={period} onChange={setPeriod} />
      </div>
      <div className="md:hidden">
        <Segmented<MoneyPeriod>
          label="Period"
          options={MONEY_PERIODS.map(([id, l]) => [id, id === "12m" ? "12 mo" : l] as const)}
          value={period}
          onChange={setPeriod}
          stretch
          tall
        />
      </div>

      {failed ? (
        <Panel>
          <Quiet>The money could not be read just now. Revenue, Subscriptions and Costs below still open.</Quiet>
        </Panel>
      ) : null}

      {/* The three figures. Cards from md; on a phone, rows in one box. */}
      <div className="hidden gap-3.5 md:grid md:grid-cols-3">
        <BigCard label={`Came in, ${p?.label ?? "…"}`} figure={p ? <Money cents={p.cameIn.cents} est={p.cameIn.estimated} /> : <Quiet>Reading.</Quiet>}>
          <Row label="The shop, paid less refunds" cents={p?.cameIn.shopCents ?? null} />
          <Row label="Plus, after the stores' cut" cents={p?.cameIn.plusCents ?? null} est />
        </BigCard>
        <BigCard label="Went out" figure={p ? <Money cents={p.wentOut.cents} /> : <Quiet>Reading.</Quiet>}>
          <Row label="The cost lines (Costs)" cents={p?.wentOut.costLinesCents ?? null} />
          <Row
            label="The goods sold, at cost"
            cents={p?.wentOut.goodsCents ?? null}
            note={p && p.wentOut.goodsUnknownUnits > 0 ? "costs missing" : undefined}
          />
          <Row label="Stripe's fees" cents={p?.wentOut.feesCents ?? null} note={p?.wentOut.stripeNote ? "not read" : undefined} />
        </BigCard>
        <BigCard label="Kept" figure={p ? <Money cents={p.kept.cents} est={p.kept.estimated} lit /> : <Quiet>Reading.</Quiet>}>
          <div className="flex items-baseline gap-2.5 border-t py-2 font-sans text-[13px]" style={{ borderColor: "var(--adm-line)" }}>
            <span style={{ color: "var(--adm-ink-3)" }}>
              {p?.kept.pctOfCameIn !== null && p?.kept.pctOfCameIn !== undefined ? `${p.kept.pctOfCameIn}% of what came in` : "Of what came in: not known"}
            </span>
          </div>
          <Row
            label="Donations, typed in by hand, apart"
            cents={p ? p.donations.cents : null}
            note={p && !p.donations.recorded ? "none recorded" : undefined}
          />
        </BigCard>
      </div>
      <ul className="divide-y rounded-[12px] border px-3.5 md:hidden" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
        {[
          {
            k: "in",
            name: "Came in",
            sub: p ? `shop ${p.cameIn.shopCents !== null ? usd(p.cameIn.shopCents) : "not read"}, Plus ${p.cameIn.plusCents !== null ? `${usd(p.cameIn.plusCents)} est.` : "not read"}` : "Reading.",
            fig: p ? <Money cents={p.cameIn.cents} est={p.cameIn.estimated} size={25} /> : null,
          },
          { k: "out", name: "Went out", sub: "costs, goods, Stripe's fees", fig: p ? <Money cents={p.wentOut.cents} size={25} /> : null },
          {
            k: "kept",
            name: "Kept",
            sub: p && p.donations.cents !== null ? `donations ${usd(p.donations.cents)} apart` : "donations apart",
            fig: p ? <Money cents={p.kept.cents} est={p.kept.estimated} size={30} lit /> : null,
          },
        ].map((r) => (
          <li key={r.k} className="flex min-h-[62px] items-center gap-3 border-[color:var(--adm-line)]">
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[13.5px]" style={{ color: "var(--adm-ink)", fontWeight: r.k === "kept" ? 600 : 400 }}>
                {r.name}
              </span>
              <span className={"mt-0.5 block truncate font-sans text-[12px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
                {r.sub}
              </span>
            </span>
            {r.fig}
          </li>
        ))}
      </ul>

      {missingNotes.length > 0 ? (
        <div className="space-y-1 px-1">
          {missingNotes.map((m) => (
            <Quiet key={m}>{m}</Quiet>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          title={
            p
              ? p.buckets === "month"
                ? `The shop, net by month: ${p.label}, with ${p.beforeLabel} dashed`
                : `The shop, net by day: ${p.label}, with ${p.beforeLabel} dashed`
              : "The shop, net by day"
          }
          pad="px-4 pt-3.5 pb-3"
        >
          {!p ? (
            <Quiet className="py-6">{loading ? "Reading." : "Not read."}</Quiet>
          ) : !p.chart ? (
            <Quiet className="py-6">The orders could not be read just now.</Quiet>
          ) : (
            <div className={SENSITIVE}>
              <TrendLine
                height={132}
                label={`The shop's net ${p.buckets === "month" ? "by month" : "by day"}, ${p.label}: ${p.chart.current.map((c) => usd(c)).join(", ")}`}
                values={p.chart.current}
                before={p.chart.before}
                marks={marksFor(p, p.chart.current.length)}
              />
            </div>
          )}
        </Panel>
        <Panel title="Recent paid orders" action={<PanelLink onClick={() => open("orders")}>Orders</PanelLink>} pad="px-4 pt-3.5 pb-1.5">
          {!p ? (
            <Quiet className="pb-2">{loading ? "Reading." : "Not read."}</Quiet>
          ) : p.recent.length === 0 ? (
            <Quiet className="pb-2">No paid orders {p.period === "month" ? "this month" : `in ${p.label}`}.</Quiet>
          ) : (
            <ul>
              {p.recent.slice(0, 4).map((o, i) => (
                <li key={`${o.at}-${i}`} className="flex min-h-[36px] items-center gap-3 border-t font-sans text-[12.5px] first:border-t-0" style={{ borderColor: "var(--adm-line)" }}>
                  <span className="min-w-0 flex-1 truncate" style={{ color: "var(--adm-ink-2)" }}>
                    <Email value={o.email} fallback="no address" />
                  </span>
                  <span className={"font-mono " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
                    {usd(o.totalCents)}
                  </span>
                  <span className="w-[66px] shrink-0 text-right text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                    {when(o.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Each view as one line with its headline; the line opens the view. */}
      <ul className="divide-y rounded-[8px] border px-4" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
        {(p ? viewLines : [
          { tab: "revenue", name: "Revenue", line: "" },
          { tab: "subscriptions", name: "Subscriptions", line: "" },
          { tab: "costs", name: "Costs", line: "" },
        ]).map((l) => (
          <li key={l.tab} className="border-[color:var(--adm-line)]">
            <button type="button" onClick={() => open(l.tab)} className="flex min-h-11 w-full items-center gap-3 py-2 text-left font-sans">
              <span className="w-[110px] shrink-0 text-[13.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
                {l.name}
              </span>
              <span className={"min-w-0 flex-1 text-[13px] " + SENSITIVE} style={{ color: "var(--adm-ink-2)" }}>
                {l.line}
              </span>
              <GoLabel />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
