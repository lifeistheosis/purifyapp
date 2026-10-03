"use client";

// The Revenue tab's growth cards (asked for 2026-09-30): net revenue retention
// by the month customers first bought, what a customer is worth against what
// it costs to find one, and the deal and cart-note machinery with what it led
// to. The numbers come from /api/admin/shop/growth, which sums them with
// lib/shop/retention.ts and lib/shop/cartReminders.ts.

import { useState } from "react";

import { useLiveData } from "@/lib/admin/useLiveData";
import type { NoteOutcome } from "@/lib/shop/cartReminders";
import type { CartDealConfig } from "@/lib/shop/cartDeals";
import type { Cohort, UnitEconomics } from "@/lib/shop/retention";
import { formatPrice } from "@/lib/shop/format";

import { BarChart } from "../charts";
import { Card, DataTable, Pill, StatCard, ToolbarButton } from "../primitives";

type Growth = {
  retention: { cohorts: Cohort[]; overall: Cohort | null };
  unit: UnitEconomics;
  deal: { settings: CartDealConfig; savedOrders: number; savedCents: number; fullOrders: number; fullCents: number };
  notes: {
    switches: { remindersEnabled: boolean; dealEmailEnabled: boolean; present: boolean };
    reminder: NoteOutcome;
    deal: NoteOutcome;
    unmeasured: boolean;
  };
  list: { subscribers: number | null };
};

const ink3 = { color: "var(--adm-ink-3)" } as const;
const money = (c: number) => formatPrice(c, "usd");
const pct = (r: number | null | undefined) => (r == null ? "No data yet" : `${Math.round(r * 100)}%`);
const outcome = (o: NoteOutcome) =>
  o.sent > 0
    ? `${o.sent} sent in 90 days · ${Math.round((o.recovered / o.sent) * 100)}% followed by an order`
    : "None sent yet";

export function ShopGrowthCards() {
  const { data, refresh } = useLiveData<Growth>("/api/admin/shop/growth", 120_000);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function flip(key: "remindersEnabled" | "dealEmailEnabled", on: boolean) {
    setSaving(key);
    setError(null);
    const res = await fetch("/api/admin/shop/growth", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: on }),
    });
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) setError(body?.error ?? `That did not save (${res.status}).`);
    setSaving(null);
    refresh();
  }

  const cohorts = data?.retention.cohorts ?? [];
  const overall = data?.retention.overall ?? null;
  const unit = data?.unit;
  const sw = data?.notes.switches;

  return (
    <div className="space-y-6">
      <Card
        title="Revenue retention, by first month"
        subtitle="Each group is the customers whose first order fell in that month. Retention is what they have spent since, less refunds and deal discounts, over what their first orders came to. Over 100% means the group has spent more than it started with."
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Net revenue retention" value={overall ? pct(overall.nrr) : "—"} accent hint={overall ? `${overall.customers} customers` : undefined} />
          <StatCard label="Came back and bought" value={overall ? money(overall.expansionCents) : "—"} hint="later orders, same customers" />
          <StatCard label="Given back" value={overall ? money(overall.contractionCents) : "—"} hint="partial refunds and deal discounts" />
          <StatCard label="Lost" value={overall ? money(overall.churnCents) : "—"} hint="orders refunded in full" />
        </div>
        {cohorts.length > 0 ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <BarChart
              orientation="vertical"
              rows={cohorts.map((c) => ({ label: c.month, value: c.nrr == null ? 0 : Math.round(c.nrr * 100) }))}
            />
            <DataTable<Cohort>
              rows={cohorts}
              rowKey={(c) => c.month}
              csvFilename="retention.csv"
              columns={[
                { key: "month", label: "First month", render: (c) => c.month, csv: (c) => c.month },
                { key: "n", label: "Customers", align: "right", render: (c) => c.customers, csv: (c) => c.customers },
                { key: "base", label: "First orders", align: "right", render: (c) => money(c.baselineCents), csv: (c) => c.baselineCents / 100 },
                { key: "nrr", label: "Retention", align: "right", render: (c) => pct(c.nrr), csv: (c) => (c.nrr == null ? "" : c.nrr) },
              ]}
            />
          </div>
        ) : (
          <p className="mt-4 font-sans text-[12.5px]" style={ink3}>
            {data ? "No paid orders yet, so no groups to follow." : "Reading orders…"}
          </p>
        )}
      </Card>

      <Card
        title="Customer cost and lifetime value"
        subtitle="Lifetime value is net revenue per customer so far, before costs. Cost per customer is this month's ad and marketing spend from the Costs tab, over the customers who first bought in the last 30 days."
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Customers" value={unit ? unit.customers : "—"} hint={unit ? `${unit.newCustomers30d} new in 30 days` : undefined} />
          <StatCard label="Lifetime value" value={unit?.ltvCents != null ? money(unit.ltvCents) : "—"} accent hint="net revenue per customer" />
          <StatCard
            label="Cost per new customer"
            value={unit ? (unit.cacCents != null ? money(unit.cacCents) : unit.acquisitionMonthlyCents > 0 ? "No new customers" : "Not recorded") : "—"}
            hint={unit && unit.acquisitionMonthlyCents > 0 ? `${money(unit.acquisitionMonthlyCents)} a month on ads` : "add ad spend in Costs, category Ads"}
          />
          <StatCard
            label="Value to cost"
            value={unit?.ratio != null ? `${unit.ratio.toFixed(1)}×` : "—"}
            hint="lifetime value over cost; 3× or better is healthy"
          />
        </div>
      </Card>

      <Card
        title="Deals and cart notes"
        subtitle="The shop's automatic offers, whether each is on, and what followed. A note counts as followed when the reader paid for an order within a week, which includes people who would have come back anyway."
      >
        {error ? (
          <p role="alert" className="mb-3 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
            {error}
          </p>
        ) : null}
        {sw && !sw.present ? (
          <p className="mb-3 font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
            The two cart-note switches need supabase/migrations/20260930000100_cart_reminders.sql. Until it runs, no note is sent.
          </p>
        ) : null}
        <ul className="divide-y divide-[var(--adm-line)]">
          <Row
            title="Cart deal"
            on={data?.deal.settings.enabled ?? false}
            detail={
              data
                ? `${data.deal.settings.percent}% off a piece left in a cart ${data.deal.settings.afterDays} days, for ${data.deal.settings.windowHours} hours, never under its margin floor. Set in the Shop tab.`
                : "…"
            }
            result={
              data
                ? `${data.deal.savedOrders} order${data.deal.savedOrders === 1 ? "" : "s"} won by the deal (${money(data.deal.savedCents)}) · ${data.deal.fullOrders} at full price (${money(data.deal.fullCents)})`
                : ""
            }
          />
          <Row
            title="Cart reminder"
            on={sw?.remindersEnabled ?? false}
            detail="One plain note a day after a signed-in reader leaves a cart: it is still there. No discount, no deadline."
            result={data ? outcome(data.notes.reminder) : ""}
            action={
              sw?.present ? (
                <ToolbarButton loading={saving === "remindersEnabled"} onClick={() => void flip("remindersEnabled", !sw.remindersEnabled)}>
                  {sw.remindersEnabled ? "Turn off" : "Turn on"}
                </ToolbarButton>
              ) : null
            }
          />
          <Row
            title="Deal note"
            on={sw?.dealEmailEnabled ?? false}
            detail="A note when the cart deal opens on something in a reader's cart, with the real percentage and when it ends. Needs the cart deal on."
            result={data ? outcome(data.notes.deal) : ""}
            action={
              sw?.present ? (
                <ToolbarButton loading={saving === "dealEmailEnabled"} onClick={() => void flip("dealEmailEnabled", !sw.dealEmailEnabled)}>
                  {sw.dealEmailEnabled ? "Turn off" : "Turn on"}
                </ToolbarButton>
              ) : null
            }
          />
          <Row
            title="Leaving the shop"
            on
            detail="On a computer, a reader about to leave the shop is offered the New in the shop email, once a month at most. Cart notes only reach this list."
            result={data?.list.subscribers != null ? `${data.list.subscribers} readers on New in the shop` : ""}
          />
        </ul>
      </Card>
    </div>
  );
}

function Row({
  title,
  on,
  detail,
  result,
  action,
}: {
  title: string;
  on: boolean;
  detail: string;
  result: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-sans text-[13px] font-semibold" style={{ color: "var(--adm-ink)" }}>
          {title}
          <Pill tone={on ? "emerald" : "neutral"}>{on ? "on" : "off"}</Pill>
        </p>
        <p className="mt-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
          {detail}
        </p>
        {result ? (
          <p className="mt-1 font-sans text-[12px] tabular-nums" style={ink3}>
            {result}
          </p>
        ) : null}
      </div>
      {action}
    </li>
  );
}
