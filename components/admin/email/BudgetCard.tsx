"use client";

// What the day has left to send, and what is going out on its own.
//
// The plan allows a fixed number of emails a day (100 on Resend Free), some of
// it held back for mail a reader is waiting on. That number used to be
// invisible: a bulk send spent the day and the next receipt failed. This puts
// it above every send button.

import type { Budget } from "@/lib/email/budget";
import type { EmailJob } from "@/lib/email/jobs";

import { Card, Pill, ToolbarButton } from "../primitives";

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function BudgetCard({
  budget,
  jobs,
  onRefresh,
  refreshing,
}: {
  budget: Budget | null;
  jobs: EmailJob[];
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const running = jobs.filter((j) => j.status === "running");
  const pct = budget ? Math.min(100, Math.round((budget.used / Math.max(1, budget.limit)) * 100)) : 0;
  const reservePct = budget ? Math.min(100 - pct, Math.round((budget.reserve / Math.max(1, budget.limit)) * 100)) : 0;

  return (
    <Card
      title="Today's email"
      subtitle={
        budget
          ? `${budget.used} of ${budget.limit} used. The count starts again at ${clock(budget.resetsAt)}.`
          : "Reading the day's count…"
      }
      action={
        <ToolbarButton onClick={onRefresh} loading={refreshing}>
          Refresh
        </ToolbarButton>
      }
    >
      {budget && (
        <div className="space-y-3">
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-[var(--adm-radius-pill)]"
            style={{ background: "var(--adm-panel-2)" }}
            role="img"
            aria-label={`${budget.used} used, ${budget.bulkLeft} left for bulk, ${budget.reserve} held back`}
          >
            <span style={{ width: `${pct}%`, background: "var(--adm-accent)" }} />
            <span style={{ width: `${100 - pct - reservePct}%`, background: "color-mix(in oklab, var(--adm-good), transparent 55%)" }} />
            <span style={{ width: `${reservePct}%`, background: "color-mix(in oklab, var(--adm-warn), transparent 55%)" }} />
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 font-sans text-[12.5px]" style={ink2}>
            <span>
              <strong style={ink}>{budget.used}</strong> sent today
            </span>
            <span>
              <strong style={ink}>{budget.bulkLeft}</strong> left for list and notice sends
            </span>
            <span>
              <strong style={ink}>{budget.reserve}</strong> held for receipts, replies and account mail
            </span>
          </div>

          {!budget.counted && (
            <p className="font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
              The send log could not be counted, so bulk sending waits. Everything a reader is waiting on still goes.
            </p>
          )}

          {running.length > 0 && (
            <ul className="space-y-1 font-sans text-[12.5px]" style={ink2}>
              {running.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-2">
                  <Pill tone="gold">going out</Pill>
                  <span style={ink}>{j.subject}</span>
                  <span style={ink3}>
                    {j.sent} of {j.total || "?"} sent
                    {j.note ? ` · ${j.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
