"use client";

import { useEffect, useRef, useState } from "react";

import { ticketNumber } from "@/lib/support/ticketNumber";
import type {
  Ticket,
  TicketMessage,
  TicketStatus,
} from "@/lib/support/ticketNumber";

type FullTicket = Ticket & { messages: TicketMessage[] };

const STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];
const HEART = "❤️";

// Dot color per status, for the picker + selected pill.
const statusDot: Record<TicketStatus, string> = {
  open: "bg-emerald-400",
  pending: "bg-amber-400",
  resolved: "bg-sky-400",
  closed: "bg-paper/40",
};
const statusText: Record<TicketStatus, string> = {
  open: "text-emerald-300",
  pending: "text-amber-300",
  resolved: "text-sky-300",
  closed: "text-paper/50",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A dark, styled status picker replacing the jarring native <select>. */
function StatusPicker({
  value,
  onChange,
}: {
  value: TicketStatus;
  onChange: (s: TicketStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.04] px-3 py-1.5 font-sans text-detail text-paper hover:border-paper/40"
      >
        <span className={`h-2 w-2 rounded-full ${statusDot[value]}`} aria-hidden />
        <span className={statusText[value]}>{value}</span>
        <span aria-hidden className="text-paper/40">
          ▾
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-paper/15 bg-night-soft shadow-pop"
        >
          {STATUSES.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={s === value}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={
                  "flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-detail transition-colors hover:bg-paper/[0.06] " +
                  (s === value ? "bg-paper/[0.04]" : "")
                }
              >
                <span className={`h-2 w-2 rounded-full ${statusDot[s]}`} aria-hidden />
                <span className={statusText[s]}>{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

  // Double-tap / double-click a message to toggle a heart. Optimistic: flip
  // it locally, then persist; refresh reconciles.
  async function toggleReaction(msg: TicketMessage) {
    if (!selected) return;
    const next = msg.reaction === HEART ? "" : HEART;
    setTickets((ts) =>
      ts.map((t) =>
        t.id !== selected.id
          ? t
          : {
              ...t,
              messages: t.messages.map((m) =>
                m.id === msg.id ? { ...m, reaction: next || null } : m,
              ),
            },
      ),
    );
    await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "react",
        messageId: msg.id,
        reaction: next,
      }),
    }).catch(() => {});
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
                    "inline-flex items-center gap-1.5 rounded-pill border border-paper/15 px-2 py-0.5 font-sans text-eyebrow " +
                    statusText[t.status]
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusDot[t.status]}`}
                    aria-hidden
                  />
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
            <StatusPicker value={selected.status} onChange={changeStatus} />
          </div>

          <p className="mt-3 font-sans text-eyebrow text-paper/35">
            Double-tap a message to react.
          </p>

          <div className="mt-3 space-y-3">
            {selected.messages.map((m) => (
              <div
                key={m.id}
                onDoubleClick={() => void toggleReaction(m)}
                title="Double-tap to react"
                className={
                  "group relative cursor-default select-none rounded-lg p-3 font-sans text-detail leading-relaxed " +
                  (m.author === "staff"
                    ? "ml-8 bg-gold/[0.08] text-paper"
                    : "mr-8 bg-paper/[0.04] text-paper/85")
                }
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="font-sans text-eyebrow uppercase tracking-wide text-paper/40">
                    {m.author === "staff" ? "You" : "Customer"}
                  </span>
                  <span className="font-sans text-[10px] tabular-nums text-paper/35">
                    {when(m.created_at)}
                    {m.author === "staff" ? " · Sent, emailed" : ""}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.reaction ? (
                  <span className="mt-1.5 inline-flex items-center rounded-full border border-paper/15 bg-night px-1.5 py-0.5 text-[11px] leading-none">
                    {m.reaction}
                  </span>
                ) : null}
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
