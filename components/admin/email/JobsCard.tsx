"use client";

// The sends that are still going out, a share a day, and the controls for
// them: who goes first, how many a day, pause, send today's share now, stop.
//
// A send larger than a day used to mean pressing Send again every morning.
// This is where that job lives once it has been confirmed once.

import { useState } from "react";

import { JOB_ORDER_LABEL, JOB_ORDERS, type JobOrder } from "@/lib/email/audienceOrder";
import type { EmailJob } from "@/lib/email/jobs";

import { Card, Pill, ToolbarButton } from "../primitives";
import { Select } from "../Select";

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

const TONE: Record<EmailJob["status"], "gold" | "emerald" | "neutral" | "rose"> = {
  running: "gold",
  paused: "neutral",
  done: "emerald",
  expired: "neutral",
  cancelled: "rose",
};

const STATE_WORD: Record<EmailJob["status"], string> = {
  running: "going out",
  paused: "paused",
  done: "finished",
  expired: "window closed",
  cancelled: "stopped",
};

const AUDIENCE_WORD: Record<string, string> = {
  all_accounts: "every account",
  shop_offers: "New in the shop",
  product_updates: "What is new in the library",
};

export function JobsCard({ jobs, ready, onChange }: { jobs: EmailJob[]; ready: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/email/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(data?.error ?? `That did not work (${res.status}).`);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setConfirmStop(null);
    }
  }

  if (!ready) {
    return (
      <Card title="Going out" subtitle="Sends that take more than one day.">
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
          This needs supabase/migrations/20260919_ops_board.sql. Until it is applied, a send reaches as far as one
          day&apos;s budget and stops.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Going out"
      subtitle="Each of these sends its share every day until everyone owed it has it. Nobody is ever sent the same one twice."
    >
      {error && (
        <p role="alert" className="mb-3 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
          {error}
        </p>
      )}

      {jobs.length === 0 ? (
        <p className="font-sans text-[12.5px]" style={ink3}>
          Nothing is going out. Start one from Send.
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => {
            const open = j.status === "running" || j.status === "paused";
            const left = Math.max(0, (j.total || 0) - j.sent);
            return (
              <li
                key={j.id}
                className="rounded-[var(--adm-radius)] border p-3"
                style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={TONE[j.status]}>{STATE_WORD[j.status]}</Pill>
                  <span className="font-sans text-[13px] font-semibold" style={ink}>
                    {j.subject}
                  </span>
                  <span className="font-sans text-[12px]" style={ink3}>
                    to {AUDIENCE_WORD[j.audience] ?? j.audience}
                  </span>
                </div>

                <p className="mt-1.5 font-sans text-[12.5px]" style={ink2}>
                  {j.sent} sent{j.total ? ` of ${j.total}` : ""}
                  {left > 0 ? `, ${left} still to go` : j.total ? ", everyone has it" : ""}
                  {j.failed ? `, ${j.failed} failed` : ""}
                  {j.last_run_at ? ` · last sent ${new Date(j.last_run_at).toLocaleString()}` : ""}
                </p>
                {j.note && (
                  <p className="mt-1 font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
                    {j.note}
                  </p>
                )}

                {open && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select<JobOrder>
                      value={j.audience_order}
                      onChange={(order) => patch(j.id, { order })}
                      options={JOB_ORDERS.map((o) => ({ value: o, label: JOB_ORDER_LABEL[o] }))}
                      ariaLabel="Who gets it first"
                      size="sm"
                      className="w-auto"
                    />
                    <label className="flex items-center gap-1.5 font-sans text-[12px]" style={ink3}>
                      <span>Most a day</span>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        defaultValue={j.per_day ?? ""}
                        placeholder="all"
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === "" ? null : Number(raw);
                          if (next === (j.per_day ?? null)) return;
                          if (next !== null && (!Number.isInteger(next) || next < 1)) return;
                          void patch(j.id, { perDay: next });
                        }}
                        className="w-16 rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12px] tabular-nums outline-none"
                        style={{
                          borderColor: "var(--adm-line-strong)",
                          background: "var(--adm-control)",
                          color: "var(--adm-ink)",
                        }}
                      />
                    </label>
                    <ToolbarButton
                      loading={busy === j.id}
                      onClick={() => patch(j.id, { action: j.status === "running" ? "pause" : "resume" })}
                    >
                      {j.status === "running" ? "Pause" : "Resume"}
                    </ToolbarButton>
                    <ToolbarButton loading={busy === j.id} onClick={() => patch(j.id, { action: "run_now" })}>
                      Send today&apos;s share now
                    </ToolbarButton>
                    {confirmStop === j.id ? (
                      <>
                        <ToolbarButton variant="danger" loading={busy === j.id} onClick={() => patch(j.id, { action: "cancel" })}>
                          Stop it for good
                        </ToolbarButton>
                        <ToolbarButton onClick={() => setConfirmStop(null)}>Keep it</ToolbarButton>
                      </>
                    ) : (
                      <ToolbarButton onClick={() => setConfirmStop(j.id)}>Stop</ToolbarButton>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
