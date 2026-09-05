"use client";

// Everything Stripe has, in the Revenue tab. Totals across every movement,
// then the rows, newest first, with CSV. Read live from Stripe through
// /api/admin/revenue/stripe; see lib/billing/stripeLedger.ts for why the
// panel had no view of this before.

import { useState } from "react";
import { useLiveData } from "@/lib/admin/useLiveData";
import { formatPrice } from "@/lib/shop/format";
import type { Ledger, LedgerRow } from "@/lib/billing/stripeLedger";
import { Card, DataTable, Email, FilterChips, Pill, StatCard, Toolbar } from "./primitives";

const RANGES = [
  { id: "all", label: "All time" },
  { id: "ytd", label: "Year to date" },
  { id: "90d", label: "90 days" },
  { id: "30d", label: "30 days" },
  { id: "7d", label: "7 days" },
] as const;

type Range = (typeof RANGES)[number]["id"];

const MATCH_LABEL: Record<LedgerRow["match"], string> = {
  "shop-order": "Shop order",
  subscription: "Subscription",
  refund: "Refund",
  payout: "Payout",
  fee: "Fee",
  other: "Unmatched",
};

const money = (cents: number, currency = "usd") => formatPrice(cents, currency);

function signed(cents: number, currency: string) {
  const s = money(Math.abs(cents), currency);
  return cents < 0 ? `−${s}` : s;
}

export function StripeLedgerCard() {
  const [range, setRange] = useState<Range>("all");
  const { data, failing } = useLiveData<Ledger>(
    `/api/admin/revenue/stripe?range=${range}`,
    60_000,
  );

  if (data && !data.configured) {
    return (
      <Card title="Stripe ledger" subtitle="Every movement of money Stripe has recorded.">
        <p className="font-sans text-[12.5px] leading-[1.6]" style={{ color: "var(--adm-ink-2)" }}>
          STRIPE_SECRET_KEY is not set on this server, so there is nothing to read.
          Checkout needs the same key; set it once on Render and this card fills in.
        </p>
      </Card>
    );
  }

  const s = data?.summary;
  const currency = data?.rows[0]?.currency ?? "usd";

  return (
    <Card
      title={`Stripe ledger${s ? ` · ${s.count}` : ""}`}
      subtitle="Every movement of money Stripe has recorded: charges, refunds, fees, payouts. Read live, cached a minute. Unmatched means a payment the books cannot place."
      action={
        <Toolbar>
          <FilterChips
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
            active={range}
            onChange={(v) => setRange(v)}
          />
        </Toolbar>
      }
    >
      {data?.error && (
        <p className="mb-4 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          Stripe did not answer: {data.error}
        </p>
      )}
      {failing && !data && (
        <p className="mb-4 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Reading Stripe…
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Charged" value={s ? money(s.chargesCents, currency) : "—"} accent />
        <StatCard label="Refunded" value={s ? money(s.refundsCents, currency) : "—"} />
        <StatCard label="Stripe fees" value={s ? money(s.feesCents, currency) : "—"} />
        <StatCard label="Paid out" value={s ? money(s.payoutsCents, currency) : "—"} />
        <StatCard label="Subscriptions" value={s ? money(s.subscriptionsCents, currency) : "—"} hint="charges with an invoice, net of refunds" />
        <StatCard
          label="Unmatched"
          value={s ? money(s.unmatchedCents, currency) : "—"}
          hint={s ? `${s.unmatchedCount} charge${s.unmatchedCount === 1 ? "" : "s"} the books cannot place` : undefined}
        />
      </div>

      <DataTable<LedgerRow>
        columns={[
          {
            key: "created",
            label: "When",
            render: (r) => (
              <span className="tabular-nums">
                {new Date(r.created).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            ),
            csv: (r) => r.created,
          },
          {
            key: "type",
            label: "Type",
            render: (r) => (
              <span className="inline-flex items-center gap-2">
                <Pill tone={r.match === "refund" ? "rose" : r.match === "other" ? "gold" : r.match === "payout" || r.match === "fee" ? "neutral" : "emerald"}>
                  {MATCH_LABEL[r.match]}
                </Pill>
                <span className="text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>{r.type}</span>
              </span>
            ),
            csv: (r) => `${MATCH_LABEL[r.match]} (${r.type})`,
          },
          {
            key: "description",
            label: "Description",
            render: (r) => (
              <span className="inline-flex max-w-[40ch] flex-col leading-tight">
                <span className="truncate" title={r.description}>{r.description || <span style={{ color: "var(--adm-ink-3)" }}>none</span>}</span>
                <span className="text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                  {r.email ? <Email value={r.email} /> : null}
                  {r.email && r.ref ? " · " : null}
                  {r.ref ? <span className="tabular-nums">{r.ref}</span> : null}
                </span>
              </span>
            ),
            csv: (r) => r.description,
          },
          { key: "amount", label: "Gross", align: "right", render: (r) => <span className="tabular-nums">{signed(r.amount, r.currency)}</span>, csv: (r) => r.amount },
          { key: "fee", label: "Fee", align: "right", render: (r) => <span className="tabular-nums">{r.fee ? signed(-r.fee, r.currency) : "—"}</span>, csv: (r) => r.fee },
          { key: "net", label: "Net", align: "right", render: (r) => <span className="tabular-nums font-semibold" style={{ color: "var(--adm-ink)" }}>{signed(r.net, r.currency)}</span>, csv: (r) => r.net },
        ]}
        rows={data?.rows ?? []}
        rowKey={(r) => r.id}
        csvFilename={`stripe-ledger-${range}.csv`}
        empty={data ? "Stripe has recorded nothing in this range." : "Loading…"}
      />
    </Card>
  );
}
