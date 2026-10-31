"use client";

// Ambassadors, the last part of Community, kept small (his pick A on r3-17,
// 2026-10-30: "What is owed and who to pay, with Pay now asking first").
//
// Invited readers share a link to the shop and earn 10% of the EIKON items
// they bring in (the owner's choices, 2026-09-30). The money rules are
// lib/ambassadors; the ledger writes itself in the database. Pay now sends
// real money through Stripe, so it asks first, with the amount and whom it
// goes to; the route records who pressed it (ambassador.pay in the audit log).

import { useState } from "react";

import { useLiveData } from "@/lib/admin/useLiveData";
import type { Balance } from "@/lib/ambassadors/ledger";
import { formatPrice } from "@/lib/shop/format";

import { Email, Modal, ToolbarButton } from "../primitives";

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
const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;
const line = { borderColor: "var(--adm-line)" } as const;
const field = { borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" } as const;

export function AmbassadorsPart() {
  const { data, refresh } = useLiveData<Feed>("/api/admin/ambassadors", 30_000);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [paying, setPaying] = useState<Row | null>(null);

  async function act(key: string, body: Record<string, unknown>, done: (res: Record<string, unknown>) => string) {
    setBusy(key);
    setNote(null);
    try {
      const res = await fetch("/api/admin/ambassadors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
      setNote(res.ok ? { tone: "ok", text: done(json) } : { tone: "bad", text: String(json.error ?? `That did not work (${res.status}).`) });
    } catch {
      setNote({ tone: "bad", text: "The network dropped. Nothing was sent." });
    } finally {
      setBusy(null);
      refresh();
    }
  }

  function invite() {
    if (!email.trim()) return;
    void act("invite", { action: "invite", email: email.trim(), name: name.trim() || undefined }, (r) => {
      setEmail("");
      setName("");
      setInviting(false);
      return `Invited. Their link: ${String(r.link ?? "")}`;
    });
  }

  const list = data?.ambassadors ?? [];
  const owed = list.reduce((a, r) => a + r.balance.pendingCents + r.balance.clearedCents, 0);
  const paid = list.reduce((a, r) => a + r.balance.paidCents, 0);
  const active = list.filter((r) => r.status === "active").length;

  return (
    <div className="space-y-4">
      {data && !data.present ? (
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
          The ambassador program needs its tables: run supabase/migrations/20260930000000_ambassadors.sql in the Supabase SQL
          editor. Until then no link is counted and nothing can be invited.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 font-sans text-[13px] leading-[1.55]" style={ink2}>
          {data ? (
            <>
              <span className="font-semibold" style={ink}>
                {money(owed)} owed
              </span>{" "}
              to {list.length} {list.length === 1 ? "ambassador" : "ambassadors"} ({active} active), {money(paid)} paid so far.
              Monthly payouts are {data.autoPayouts ? "on" : "off"}
              {data.autoPayouts ? "." : ": nothing is sent unless you press Pay now."}
            </>
          ) : (
            "Reading the ambassadors."
          )}
        </p>
        {data?.present ? (
          <ToolbarButton loading={busy === "auto"} onClick={() => void act("auto", { action: "autoPayouts", on: !data.autoPayouts }, () => "Saved.")}>
            {data.autoPayouts ? "Turn off monthly payouts" : "Turn on monthly payouts"}
          </ToolbarButton>
        ) : null}
      </div>

      {list.length > 0 ? (
        <ul className="rounded-[var(--adm-radius)] border" style={{ ...line, background: "var(--adm-panel)" }}>
          {list.map((r, i) => {
            const owes = r.balance.pendingCents + r.balance.clearedCents;
            return (
              <li key={r.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 ${i ? "border-t" : ""}`} style={line}>
                <div className="min-w-[12rem] flex-1">
                  <p className="font-sans text-[13px] font-semibold" style={ink}>
                    {r.name ?? r.code}
                    {r.status === "paused" ? (
                      <span className="ml-2 font-normal" style={ink3}>
                        paused
                      </span>
                    ) : null}
                  </p>
                  <p className="font-sans text-[12px]" style={ink3}>
                    <Email value={r.email} /> · {r.clicks30} visits in 30 days · {r.balance.conversions}{" "}
                    {r.balance.conversions === 1 ? "order" : "orders"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-sans text-[13px] font-semibold" style={ink}>
                    {money(owes)}
                  </p>
                  <p className="font-sans text-[11.5px]" style={ink3}>
                    {money(r.balance.clearedCents)} cleared
                    {r.lastPayout ? ` · last ${money(r.lastPayout.amount_cents)} ${r.lastPayout.status}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.balance.clearedCents > 0 && r.payoutsReady ? (
                    <ToolbarButton loading={busy === `pay:${r.id}`} onClick={() => setPaying(r)}>
                      Pay now
                    </ToolbarButton>
                  ) : !r.payoutsReady ? (
                    <span className="font-sans text-[11.5px]" style={ink3}>
                      {r.connected ? "Stripe is checking them" : "Stripe not connected"}
                    </span>
                  ) : null}
                  <ToolbarButton
                    loading={busy === `status:${r.id}`}
                    onClick={() => void act(`status:${r.id}`, { action: r.status === "active" ? "pause" : "resume", id: r.id }, () => "Saved.")}
                  >
                    {r.status === "active" ? "Pause" : "Resume"}
                  </ToolbarButton>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(r.link)}
                    className="min-h-11 px-1 font-sans text-[12px] underline underline-offset-[3px]"
                    style={ink2}
                    title={r.link}
                  >
                    Copy link
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : data ? (
        <p className="font-sans text-[12.5px]" style={ink3}>
          No ambassadors yet.
        </p>
      ) : null}

      {note ? (
        <p
          role={note.tone === "bad" ? "alert" : "status"}
          className="break-all font-sans text-[12px]"
          style={{ color: note.tone === "bad" ? "var(--adm-critical)" : "var(--adm-ink-2)" }}
        >
          {note.text}
        </p>
      ) : null}

      {inviting ? (
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
            className="h-11 min-w-[220px] flex-1 rounded-[var(--adm-radius-sm)] border px-2.5 font-sans text-[12.5px] outline-none"
            style={field}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name for their link (optional)"
            maxLength={80}
            className="h-11 min-w-[200px] flex-1 rounded-[var(--adm-radius-sm)] border px-2.5 font-sans text-[12.5px] outline-none"
            style={field}
          />
          <ToolbarButton variant="primary" loading={busy === "invite" || !email.trim()} onClick={invite}>
            Invite
          </ToolbarButton>
          <ToolbarButton onClick={() => setInviting(false)}>Cancel</ToolbarButton>
        </form>
      ) : data?.present ? (
        <button
          type="button"
          onClick={() => setInviting(true)}
          className="min-h-11 font-sans text-[12.5px] underline underline-offset-[3px]"
          style={ink2}
        >
          Invite an ambassador
        </button>
      ) : null}
      <p className="font-sans text-[11.5px] leading-[1.5]" style={ink3}>
        By the email on their Purify account: they get a link, a page at /shop/ambassador, and 10% of the EIKON items they bring
        in, cleared 30 days after delivery{data?.minPayoutCents ? `, and paid once it reaches ${money(data.minPayoutCents)}` : ""}.
      </p>

      {paying ? (
        <Modal
          title={`Pay ${paying.name ?? paying.code} ${money(paying.balance.clearedCents)}?`}
          subtitle="Real money, through Stripe, now."
          onClose={() => setPaying(null)}
        >
          <div className="space-y-4">
            <p className="font-sans text-[13px] leading-[1.6]" style={ink2}>
              Stripe sends {money(paying.balance.clearedCents)}, the balance that has cleared, from Purify&apos;s available
              balance to {paying.name ?? paying.code}&apos;s Stripe account. It cannot be taken back from here, and the audit
              log records that you sent it.
            </p>
            <div className="flex justify-end gap-2">
              <ToolbarButton onClick={() => setPaying(null)}>Cancel</ToolbarButton>
              <ToolbarButton
                variant="primary"
                loading={busy === `pay:${paying.id}`}
                onClick={() => {
                  const r = paying;
                  setPaying(null);
                  void act(`pay:${r.id}`, { action: "pay", id: r.id }, (j) => `Sent ${money(Number(j.amountCents ?? 0))}.`);
                }}
              >
                Pay {money(paying.balance.clearedCents)}
              </ToolbarButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

