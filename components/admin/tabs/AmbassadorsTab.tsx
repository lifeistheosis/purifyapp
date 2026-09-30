"use client";

// Ambassadors: invited readers who share a link to the shop and earn 10% of
// the EIKON items they bring in (the owner's choices, 2026-09-30). Invite by
// the email on someone's Purify account, watch what each link does, and pay
// cleared balances by hand or turn on the automatic monthly payout. The money
// rules are lib/ambassadors; the ledger writes itself in the database.

import { useState } from "react";

import { useLiveData } from "@/lib/admin/useLiveData";
import type { Balance } from "@/lib/ambassadors/ledger";
import { formatPrice } from "@/lib/shop/format";

import { Card, DataTable, Email, Pill, StatCard, ToolbarButton } from "../primitives";

type Row = {
  id: string;
  code: string;
  name: string | null;
  email: string | null;
  status: "active" | "paused";
  rateBps: number;
  connected: boolean;
  payoutsReady: boolean;
  link: string;
  clicks30: number;
  balance: Balance;
  lastPayout: { period: string; amount_cents: number; status: string; error: string | null } | null;
  since: string;
};

type Feed = { present: boolean; autoPayouts: boolean; minPayoutCents?: number; ambassadors: Row[]; error?: string | null };

const money = (c: number) => formatPrice(c, "usd");
const ink3 = { color: "var(--adm-ink-3)" } as const;
const field = { borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" } as const;

export function AmbassadorsTab() {
  const { data, refresh } = useLiveData<Feed>("/api/admin/ambassadors", 30_000);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function act(key: string, body: Record<string, unknown>, done: (res: Record<string, unknown>) => string) {
    setBusy(key);
    setNote(null);
    const res = await fetch("/api/admin/ambassadors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    setNote(res.ok ? { tone: "ok", text: done(json) } : { tone: "bad", text: String(json.error ?? `That did not work (${res.status}).`) });
    setBusy(null);
    refresh();
  }

  function invite() {
    if (!email.trim()) return;
    void act("invite", { action: "invite", email: email.trim(), name: name.trim() || undefined }, (r) => {
      setEmail("");
      setName("");
      return `Invited. Their link: ${String(r.link ?? "")}`;
    });
  }

  const list = data?.ambassadors ?? [];
  const totals = list.reduce(
    (a, r) => ({
      clicks: a.clicks + r.clicks30,
      orders: a.orders + r.balance.conversions,
      owed: a.owed + r.balance.pendingCents + r.balance.clearedCents,
      paid: a.paid + r.balance.paidCents,
    }),
    { clicks: 0, orders: 0, owed: 0, paid: 0 },
  );

  return (
    <div className="space-y-5">
      {data && !data.present ? (
        <Card title="One step first" subtitle="The ambassador program needs its tables.">
          <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
            Run supabase/migrations/20260930_ambassadors.sql in the Supabase SQL editor. Until then no link is counted and
            nothing can be invited.
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Ambassadors" value={data ? list.length : "—"} hint={data ? `${list.filter((r) => r.status === "active").length} active` : undefined} />
        <StatCard label="Visits, 30 days" value={data ? totals.clicks : "—"} hint="counted per link, never per person" />
        <StatCard label="Orders brought in" value={data ? totals.orders : "—"} accent hint="EIKON orders, refunds left out" />
        <StatCard label="Owed" value={data ? money(totals.owed) : "—"} hint={data ? `${money(totals.paid)} paid so far` : undefined} />
      </div>

      <Card
        title="Invite an ambassador"
        subtitle="By the email on their Purify account. They get a link, a dashboard at /shop/ambassador, and 10% of the EIKON items they bring in, cleared 30 days after delivery."
      >
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            invite();
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their account email"
            className="min-w-[220px] flex-1 rounded-[var(--adm-radius-sm)] border px-2.5 py-1.5 font-sans text-[12.5px] outline-none"
            style={field}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name for their link (optional)"
            maxLength={80}
            className="min-w-[200px] flex-1 rounded-[var(--adm-radius-sm)] border px-2.5 py-1.5 font-sans text-[12.5px] outline-none"
            style={field}
          />
          <ToolbarButton variant="primary" loading={busy === "invite" || !email.trim()} onClick={invite}>
            Invite
          </ToolbarButton>
        </form>
        {note ? (
          <p
            role={note.tone === "bad" ? "alert" : "status"}
            className="mt-2 break-all font-sans text-[12px]"
            style={{ color: note.tone === "bad" ? "var(--adm-critical)" : "var(--adm-ink-2)" }}
          >
            {note.text}
          </p>
        ) : null}
      </Card>

      <Card
        title="Payouts"
        subtitle={`Cleared balances go to each ambassador's Stripe account${data?.minPayoutCents ? ` once they reach ${money(data.minPayoutCents)}` : ""}. Stripe pays from Purify's available balance, so keep enough there on the day.`}
        action={
          data?.present ? (
            <ToolbarButton loading={busy === "auto"} onClick={() => void act("auto", { action: "autoPayouts", on: !data.autoPayouts }, () => "Saved.")}>
              {data.autoPayouts ? "Turn off monthly payouts" : "Turn on monthly payouts"}
            </ToolbarButton>
          ) : null
        }
      >
        <p className="flex items-center gap-2 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          Automatic monthly payouts <Pill tone={data?.autoPayouts ? "emerald" : "neutral"}>{data?.autoPayouts ? "on" : "off"}</Pill>
          <span style={ink3}>Off means nothing is sent unless you press Pay now.</span>
        </p>
      </Card>

      <Card title="Everyone" subtitle="Links, visits and money by ambassador.">
        <DataTable<Row>
          rows={list}
          rowKey={(r) => r.id}
          empty={data ? "No ambassadors yet. Invite one above." : "Reading…"}
          csvFilename="ambassadors.csv"
          columns={[
            {
              key: "who",
              label: "Ambassador",
              render: (r) => (
                <span className="flex flex-col">
                  <span className="inline-flex items-center gap-1.5">
                    <span style={{ color: "var(--adm-ink)" }}>{r.name ?? r.code}</span>
                    {r.status === "paused" ? <Pill tone="neutral">paused</Pill> : null}
                  </span>
                  <Email value={r.email} />
                </span>
              ),
              csv: (r) => `${r.name ?? ""} <${r.email ?? ""}>`,
            },
            {
              key: "link",
              label: "Link",
              render: (r) => (
                <button type="button" className="text-left underline decoration-dotted" onClick={() => void navigator.clipboard?.writeText(r.link)}>
                  ?ref={r.code}
                </button>
              ),
              csv: (r) => r.link,
            },
            { key: "clicks", label: "Visits 30d", align: "right", render: (r) => r.clicks30, csv: (r) => r.clicks30 },
            { key: "orders", label: "Orders", align: "right", render: (r) => r.balance.conversions, csv: (r) => r.balance.conversions },
            { key: "pending", label: "Pending", align: "right", render: (r) => money(r.balance.pendingCents), csv: (r) => r.balance.pendingCents / 100 },
            { key: "cleared", label: "Cleared", align: "right", render: (r) => money(r.balance.clearedCents), csv: (r) => r.balance.clearedCents / 100 },
            { key: "paid", label: "Paid", align: "right", render: (r) => money(r.balance.paidCents), csv: (r) => r.balance.paidCents / 100 },
            {
              key: "stripe",
              label: "Stripe",
              render: (r) =>
                r.payoutsReady ? (
                  <Pill tone="emerald">ready</Pill>
                ) : r.connected ? (
                  <Pill tone="gold">checking</Pill>
                ) : (
                  <span style={ink3}>not connected</span>
                ),
              csv: (r) => (r.payoutsReady ? "ready" : r.connected ? "checking" : "none"),
            },
            {
              key: "last",
              label: "Last payout",
              render: (r) =>
                r.lastPayout ? (
                  <span title={r.lastPayout.error ?? undefined} style={{ color: r.lastPayout.status === "failed" ? "var(--adm-critical)" : undefined }}>
                    {money(r.lastPayout.amount_cents)} · {r.lastPayout.status}
                  </span>
                ) : (
                  <span style={ink3}>none</span>
                ),
              csv: (r) => (r.lastPayout ? `${r.lastPayout.amount_cents / 100} ${r.lastPayout.status}` : ""),
            },
            {
              key: "actions",
              label: "",
              align: "right",
              render: (r) => (
                <span className="inline-flex gap-1.5">
                  {r.balance.clearedCents > 0 && r.payoutsReady ? (
                    <ToolbarButton loading={busy === `pay:${r.id}`} onClick={() => void act(`pay:${r.id}`, { action: "pay", id: r.id }, (j) => `Sent ${money(Number(j.amountCents ?? 0))}.`)}>
                      Pay now
                    </ToolbarButton>
                  ) : null}
                  <ToolbarButton
                    loading={busy === `status:${r.id}`}
                    onClick={() => void act(`status:${r.id}`, { action: r.status === "active" ? "pause" : "resume", id: r.id }, () => "Saved.")}
                  >
                    {r.status === "active" ? "Pause" : "Resume"}
                  </ToolbarButton>
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
