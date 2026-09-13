"use client";

import { useEffect, useRef, useState, useId } from "react";

import { cn } from "@/lib/cn";
import { ticketNumber } from "@/lib/support/ticketNumber";
import type {
  Ticket,
  TicketMessage,
  TicketStatus,
} from "@/lib/support/ticketNumber";
import { Email } from "./primitives";

type FullTicket = Ticket & { messages: TicketMessage[] };

const STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];
const HEART = "❤️";

// Dot color per status, for the picker + selected pill.
const statusDot: Record<TicketStatus, string> = {
  open: "bg-[var(--adm-good)]",
  pending: "bg-[var(--adm-warn)]",
  resolved: "bg-[var(--adm-s2)]",
  closed: "bg-paper/40",
};
const statusText: Record<TicketStatus, string> = {
  open: "text-[color:var(--adm-good)]",
  pending: "text-[color:var(--adm-warn)]",
  resolved: "text-[color:var(--adm-s2)]",
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
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Opening puts the cursor on the CURRENT status, not on the first option, so
  // the first arrow press moves one step from where the ticket already is.
  // Done in the open path rather than in an effect keyed on `open`, because a
  // setState in an effect body is a cascading render.
  function openPicker() {
    setCursor(Math.max(0, STATUSES.indexOf(value)));
    setOpen(true);
  }

  // Arrow keys, Enter and Escape, because the trigger says aria-haspopup
  //="listbox" and a widget that announces itself as a listbox has to behave
  // like one. This closed on mousedown ONLY: a keyboard operator could open it
  // and had no way to close it again, and the popup stayed open behind them
  // after they tabbed away.
  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown") {
        // Enter and Space are left alone: the trigger is a <button>, so the
        // browser already turns both into a click, and handling them here
        // would open and immediately toggle shut.
        e.preventDefault();
        openPicker();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(STATUSES.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(STATUSES[cursor]);
      setOpen(false);
    } else if (e.key === "Tab") {
      // Not prevented: Tab should leave. It just must not leave this behind.
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        onKeyDown={onKey}
        // role="combobox" on the trigger is the select-only combobox pattern.
        // It is also what makes aria-activedescendant legal here: a plain
        // button does not support it, so the cursor had nowhere to be
        // announced from.
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${STATUSES[cursor]}` : undefined}
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
          id={listId}
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night-soft shadow-pop"
        >
          {/* The option is the row, for the same reason as in TabSearch: a
              <button role="option"> is an interactive element inside an
              option, which made every status separately tabbable while the
              widget claimed a single listbox cursor. */}
          {STATUSES.map((s, i) => (
            // See TabSearch: the keys belong to the combobox trigger, which
            // is where focus stays. An option that handled its own would have
            // to be focusable, which is the nesting this replaced.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={s}
              id={`${listId}-${s}`}
              role="option"
              aria-selected={s === value}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              onPointerEnter={() => setCursor(i)}
              className={
                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-sans text-detail transition-colors hover:bg-paper/[0.06] " +
                (i === cursor ? "bg-paper/[0.08] " : s === value ? "bg-paper/[0.04] " : "")
              }
            >
              <span className={`h-2 w-2 rounded-full ${statusDot[s]}`} aria-hidden />
              <span className={statusText[s]}>{s}</span>
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
  // On phones the two panes stack: the list shows first, tapping a ticket
  // slides in the thread, and a back affordance returns to the list. On md+
  // both panes are always visible, so this flag only gates the mobile view.
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  function openTicket(id: string) {
    setSelectedId(id);
    setNote(null);
    setMobileThreadOpen(true);
  }

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
      <p className="rounded-[var(--adm-radius)] border border-paper/10 bg-night-soft/60 p-8 text-center font-sans text-detail text-paper/60">
        No support tickets yet. When a customer submits the contact form, it
        appears here.
      </p>
    );
  }

  return (
    <div className="md:grid md:grid-cols-[340px_1fr] md:gap-6">
      {/* List — full width on phones; hidden there once a thread is open. */}
      <ul
        className={cn(
          "space-y-2.5",
          mobileThreadOpen ? "hidden md:block" : "block",
        )}
      >
        {tickets.map((t) => {
          const active = t.id === selectedId;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => openTicket(t.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "w-full rounded-[var(--adm-radius)] border p-4 text-left transition-all duration-200",
                  active
                    ? "border-gold/30 bg-gold/[0.05] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"
                    : "border-paper/10 bg-night-soft/40 hover:border-paper/25 hover:bg-night-soft/60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-eyebrow tabular-nums text-paper/40">
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
                <p className="mt-2 truncate font-sans text-ui font-medium text-paper">
                  {t.subject}
                </p>
                <p className="mt-0.5 truncate font-sans text-caption text-paper/50">
                  {t.name ? `${t.name} · ` : ""}
                  <Email value={t.email} />
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Detail — full width on phones; hidden there until a thread is open. */}
      {selected ? (
        <div
          key={selected.id}
          className={cn(
            "admin-fade-in mt-4 rounded-[var(--adm-radius)] border border-paper/10 bg-night-soft/60 p-5 md:mt-0 md:p-6",
            mobileThreadOpen ? "block" : "hidden md:block",
          )}
        >
          {/* Mobile back affordance to the ticket list. */}
          <button
            type="button"
            onClick={() => setMobileThreadOpen(false)}
            className="mb-4 inline-flex items-center gap-1.5 font-sans text-detail font-medium text-paper/60 hover:text-paper md:hidden"
          >
            <span aria-hidden>←</span> Tickets
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-sans text-eyebrow tabular-nums text-paper/40">
                {ticketNumber(selected.id)}
              </p>
              <h3 className="mt-0.5 font-display-serif text-title text-paper">
                {selected.subject}
              </h3>
              <p className="mt-1 font-sans text-caption text-paper/55">
                {selected.name ? `${selected.name} · ` : ""}
                <Email value={selected.email} />
              </p>
            </div>
            <StatusPicker value={selected.status} onChange={changeStatus} />
          </div>

          <p className="mt-4 font-sans text-eyebrow text-paper/35">
            Double-tap a message to react.
          </p>

          <div className="mt-3 space-y-3">
            {selected.messages.map((m, i) => (
              <div
                key={m.id}
                onDoubleClick={() => void toggleReaction(m)}
                title="Double-tap to react"
                style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
                className={cn(
                  "admin-fade-in group relative max-w-[85%] cursor-default select-none rounded-[var(--adm-radius-sm)] px-4 py-3 font-sans text-detail leading-relaxed md:max-w-[80%]",
                  m.author === "staff"
                    ? "ml-auto rounded-br-md bg-gold/[0.1] text-paper"
                    : "mr-auto rounded-bl-md border border-paper/10 bg-paper/[0.03] text-paper/85",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
                    {m.author === "staff" ? "You" : "Customer"}
                  </span>
                  <span className="font-sans text-[10px] tabular-nums text-paper/35">
                    {when(m.created_at)}
                    {m.author === "staff" ? " · Sent, emailed" : ""}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.reaction ? (
                  <span className="heart-pop mt-1.5 inline-flex items-center rounded-full border border-paper/15 bg-night px-1.5 py-0.5 text-[11px] leading-none">
                    {m.reaction}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-white/6 pt-4">
            <textarea
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply. It emails the customer."
              className="w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-paper/[0.03] px-3.5 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:border-paper/40 focus:outline-none focus:ring-1 focus:ring-paper/20"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
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
