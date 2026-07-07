"use client";

import { useState } from "react";

import { ticketNumber } from "@/lib/support/ticketNumber";
import type {
  Ticket,
  TicketMessage,
  TicketStatus,
} from "@/lib/support/ticketNumber";

type FullTicket = Ticket & { messages: TicketMessage[] };

const STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];
const statusTone: Record<TicketStatus, string> = {
  open: "text-emerald-300 border-emerald-400/30",
  pending: "text-amber-300 border-amber-400/30",
  resolved: "text-sky-300 border-sky-400/30",
  closed: "text-paper/40 border-paper/20",
};

export function SupportConsole({ initial }: { initial: FullTicket[] }) {
  const [tickets, setTickets] = useState<FullTicket[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial[0]?.id ?? null,
  );
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  async function refresh() {
    const res = await fetch("/api/admin/support");
    if (res.ok) {
      const data = (await res.json()) as { tickets: FullTicket[] };
      setTickets(data.tickets);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reply",
        ticketId: selected.id,
        body: reply.trim(),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setReply("");
      setNote("Reply sent and emailed to the customer.");
      await refresh();
    } else {
      setNote("Reply failed.");
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (!selected) return;
    await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", ticketId: selected.id, status }),
    });
    await refresh();
  }

  if (tickets.length === 0) {
    return (
      <p className="rounded-lg border border-paper/10 bg-night-soft/60 p-6 font-sans text-detail text-paper/60">
        No support tickets yet. When a customer submits the contact form, it
        appears here.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[320px_1fr]">
      {/* List */}
      <ul className="space-y-2">
        {tickets.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={
                "w-full rounded-lg border p-3 text-left transition-colors " +
                (t.id === selectedId
                  ? "border-paper/30 bg-paper/[0.06]"
                  : "border-paper/10 bg-night-soft/50 hover:border-paper/25")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-eyebrow text-paper/40">
                  {ticketNumber(t.id)}
                </span>
                <span
                  className={
                    "rounded-pill border px-2 py-0.5 font-sans text-eyebrow " +
                    statusTone[t.status]
                  }
                >
                  {t.status}
                </span>
              </div>
              <p className="mt-1 truncate font-sans text-detail font-medium text-paper">
                {t.subject}
              </p>
              <p className="truncate font-sans text-caption text-paper/50">
                {t.name ? `${t.name} · ` : ""}
                {t.email}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {/* Detail */}
      {selected ? (
        <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-sans text-eyebrow text-paper/40">
                {ticketNumber(selected.id)}
              </p>
              <h3 className="font-display-serif text-title text-paper">
                {selected.subject}
              </h3>
              <p className="font-sans text-caption text-paper/55">
                {selected.name ? `${selected.name} · ` : ""}
                {selected.email}
              </p>
            </div>
            <select
              value={selected.status}
              onChange={(e) => void changeStatus(e.target.value as TicketStatus)}
              className="rounded-lg border border-paper/15 bg-paper/[0.03] px-2 py-1.5 font-sans text-detail text-paper"
              aria-label="Ticket status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {selected.messages.map((m) => (
              <div
                key={m.id}
                className={
                  "rounded-lg p-3 font-sans text-detail leading-relaxed " +
                  (m.author === "staff"
                    ? "ml-8 bg-gold/[0.08] text-paper"
                    : "mr-8 bg-paper/[0.04] text-paper/85")
                }
              >
                <p className="mb-1 font-sans text-eyebrow uppercase tracking-wide text-paper/40">
                  {m.author === "staff" ? "You" : "Customer"}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <textarea
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply. It emails the customer."
              className="w-full rounded-lg border border-paper/15 bg-paper/[0.03] px-3 py-2.5 font-sans text-ui text-paper placeholder:text-paper/35 focus:border-paper/40 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={busy || !reply.trim()}
                className="tap-press rounded-pill bg-paper px-5 py-2 font-sans text-ui font-semibold text-night disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send reply"}
              </button>
              {note ? (
                <span className="font-sans text-caption text-paper/60">{note}</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
