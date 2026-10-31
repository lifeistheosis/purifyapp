"use client";

// The one queue (his pick A for Community on r3-17, 2026-10-30): one row per
// thing, oldest first, the oldest lit, its buttons on the row. A removal
// waits ten seconds with Undo before it is written. The rows and their
// actions are lib/admin/communityQueue.ts; the waiting is usePendingRemovals.

import { useState } from "react";

import type { QueueAction, QueueRow } from "@/lib/admin/communityQueue";

import { StatusDot, ToolbarButton } from "../primitives";
import { LIT, agoWords, ink, ink2, ink3 } from "../tools/look";

export function QueueList({
  rows,
  busy,
  errors,
  decided,
  waiting,
  onAction,
  onUndo,
}: {
  rows: QueueRow[];
  busy: string | null;
  errors: Record<string, string>;
  decided: Record<string, string>;
  /** Seconds left on a removal held for Undo, by row key; null when none waits. */
  waiting: (key: string) => number | null;
  onAction: (row: QueueRow, action: QueueAction) => void;
  onUndo: (key: string) => void;
}) {
  const firstOpen = rows.find((r) => waiting(r.key) === null && !decided[r.key])?.key ?? null;
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <QueueItem
          key={row.key}
          row={row}
          lit={row.key === firstOpen}
          busy={busy}
          error={errors[row.key] ?? null}
          decided={decided[row.key] ?? null}
          seconds={waiting(row.key)}
          onAction={onAction}
          onUndo={onUndo}
        />
      ))}
    </ul>
  );
}

function QueueItem({
  row,
  lit,
  busy,
  error,
  decided,
  seconds,
  onAction,
  onUndo,
}: {
  row: QueueRow;
  lit: boolean;
  busy: string | null;
  error: string | null;
  decided: string | null;
  seconds: number | null;
  onAction: (row: QueueRow, action: QueueAction) => void;
  onUndo: (key: string) => void;
}) {
  const [written, setWritten] = useState(false);
  const who = row.who ? [row.who.name ?? "A reader", row.who.handle ? `@${row.who.handle}` : null].filter(Boolean).join(" ") : null;

  // Held for Undo: quiet and dashed, the countdown and Undo on the row.
  if (seconds !== null) {
    return (
      <li
        className="flex flex-wrap items-center gap-3 rounded-[var(--adm-radius)] border border-dashed px-4 py-3"
        style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-panel-2)" }}
        role="status"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[12px]" style={ink3}>
            {row.what}
            {who ? ` · ${who}` : ""}
          </p>
          <p className="mt-0.5 font-sans text-[13px]" style={ink}>
            {seconds > 0 ? `Removed. It is written in ${seconds} ${seconds === 1 ? "second" : "seconds"}.` : "Removed. Writing it now."}
          </p>
        </div>
        {/* Undo while it waits; once it is being written there is nothing to take back here. */}
        {seconds > 0 ? <ToolbarButton onClick={() => onUndo(row.key)}>Undo</ToolbarButton> : null}
      </li>
    );
  }

  if (decided) {
    return (
      <li className="rounded-[var(--adm-radius)] border px-4 py-3" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }} role="status">
        <p className="flex items-center gap-2 font-sans text-[12.5px]" style={ink2}>
          <StatusDot tone="good" />
          {decided}
        </p>
      </li>
    );
  }

  const primary = row.actions.filter((a) => a.tone === "primary");
  const rest = row.actions.filter((a) => a.tone !== "primary");

  return (
    <li
      className="rounded-[var(--adm-radius)] border px-4 py-3"
      style={lit ? { ...LIT, background: "var(--adm-panel)" } : { borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="pt-[5px]">
            <StatusDot tone="wait" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[12px]" style={ink3}>
              {row.what} · {agoWords(row.at)}
            </p>
            {who ? (
              <p className="adm-sensitive mt-0.5 font-sans text-[13px] font-semibold" style={ink}>
                {who}
              </p>
            ) : null}
            <p className="mt-1 whitespace-pre-wrap break-words font-sans text-[13.5px] leading-[1.5]" style={ink}>
              {row.text || <span style={ink3}>No words.</span>}
            </p>
            {row.written ? (
              written ? (
                <div className="mt-2 rounded-[var(--adm-radius-sm)] px-3 py-2" style={{ background: "var(--adm-panel-2)" }}>
                  <p className="font-sans text-[11.5px]" style={ink3}>
                    As written
                  </p>
                  <p className="adm-sensitive mt-0.5 whitespace-pre-wrap break-words font-sans text-[13px]" style={ink2}>
                    {row.written}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setWritten(true)}
                  className="mt-1 min-h-11 font-sans text-[12px] underline underline-offset-[3px] md:min-h-0"
                  style={ink2}
                >
                  Show what was written
                </button>
              )
            ) : null}
            {row.reasons ? (
              <p className="mt-1 font-sans text-[12px]" style={ink3}>
                {row.reasons}
              </p>
            ) : null}
            {row.note ? (
              <p className="mt-1 font-sans text-[12px]" style={ink3}>
                {row.note}
              </p>
            ) : null}
            {row.more ? (
              <details className="mt-1">
                <summary className="min-h-11 cursor-pointer font-sans text-[12px] md:min-h-0" style={ink2}>
                  Ingredients and method
                </summary>
                <p className="mt-1 whitespace-pre-line font-sans text-[12.5px]" style={ink2}>
                  {row.more}
                </p>
              </details>
            ) : null}
            {row.picture ? (
              <a href={row.picture} target="_blank" rel="noopener noreferrer" className="mt-2 block w-28 overflow-hidden rounded-[var(--adm-radius-sm)] border" style={{ borderColor: "var(--adm-line)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.picture} alt="Sent with it" className="aspect-[4/3] w-full object-cover" />
              </a>
            ) : null}
            {error ? (
              <p role="alert" className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-critical)" }}>
                {error}
              </p>
            ) : null}
          </div>
        </div>
        {/* The buttons on the row: on a phone the move first and full width,
            the others beside each other under it, as the sheet draws it. */}
        <div className="grid shrink-0 grid-cols-2 gap-2 md:flex md:items-center">
          {rest.map((a) => (
            <ToolbarButton
              key={a.id}
              variant={a.tone === "danger" ? "danger" : "default"}
              loading={busy === row.key + a.id}
              onClick={() => onAction(row, a)}
            >
              {a.label}
            </ToolbarButton>
          ))}
          {primary.map((a) => (
            <span key={a.id} className="order-first col-span-2 grid md:order-none md:inline-flex">
              <ToolbarButton variant="primary" loading={busy === row.key + a.id} onClick={() => onAction(row, a)}>
                {a.label}
              </ToolbarButton>
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}
