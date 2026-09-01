"use client";

import { useCallback, useMemo, useState } from "react";

import { Card, Pill, StatCard, ToolbarButton } from "../primitives";
import { useAdminFetch } from "../adminFetch";
import { gradePrice, priceForMargin, unitEconomics, type PriceBand } from "@/lib/shop/pricing";
import { STALE_AFTER_DAYS, type RankedRecheck } from "@/lib/shop/recheck";

/**
 * The sourcing worklist: what to go and price-check, and what it is worth.
 *
 * ── It is a queue, not a report ─────────────────────────────────────────
 *
 * The catalogue view already lists every product. This lists only the ones
 * where going and looking would change something, most valuable first, with
 * the supplier link right there and a one-tap way to record what was found.
 * A list of everything is a thing you scroll; a short list of what matters is
 * a thing you finish.
 *
 * ── Nothing here fetches a supplier price ───────────────────────────────
 *
 * CLAUDE.md rule 8: the agent is the pipeline. Copy the checklist, do the
 * looking, record the answers. The value is in knowing WHICH forty products
 * out of the catalogue are worth an hour, and that is arithmetic this can do.
 */

type Payload = {
  queue: RankedRecheck[];
  totalProducts: number;
  dueCount: number;
  volumeWindowDays: number;
  limit: number;
  truncated: boolean;
  error?: string;
  missing?: boolean;
};

const BAND_TONE: Record<PriceBand, "rose" | "gold" | "emerald" | "neutral"> = {
  loss: "rose",
  thin: "gold",
  healthy: "emerald",
  strong: "emerald",
  unknown: "neutral",
};

const REASON_TEXT: Record<RankedRecheck["reason"], string> = {
  "loss-making": "Losing money",
  "never-checked": "Never checked",
  "thin-and-selling": "Thin, and selling",
  stale: "Stale",
  fresh: "Fresh",
};

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export function SourcingTab() {
  const [showAll, setShowAll] = useState(false);
  const { data, error, reload } = useAdminFetch<Payload>(
    `/api/admin/shop/sourcing${showAll ? "?all=1" : ""}`,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const queue = useMemo(() => data?.queue ?? [], [data]);

  /**
   * Record what was found. `null` cost means the supplier no longer lists it,
   * which is the single most valuable thing a check can discover and the one a
   * price-only field could not express.
   */
  const record = useCallback(
    async (
      productId: string,
      costCents: number | null,
      outcome: "ok" | "changed" | "unavailable",
    ) => {
      setBusy(productId);
      setNote(null);
      try {
        const r = await fetch("/api/admin/shop/sourcing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, costCents, outcome }),
        });
        const body = (await r.json().catch(() => null)) as { error?: string } | null;
        if (!r.ok) {
          setNote(body?.error ?? "That didn't save.");
          return;
        }
        setDrafts((d) => {
          const next = { ...d };
          delete next[productId];
          return next;
        });
        reload();
      } catch {
        setNote("That didn't save.");
      } finally {
        setBusy(null);
      }
    },
    [reload],
  );

  /** The queue as text, for handing to whoever is doing the looking. */
  const copyChecklist = useCallback(() => {
    const lines = queue.map((r) => {
      const cost = r.costCents === null ? "cost unknown" : `cost ${usd(r.costCents)}`;
      return `- ${r.title} — ${usd(r.priceCents)}, ${cost}, ${REASON_TEXT[r.reason]} — ${r.supplierUrl ?? "NO SUPPLIER URL"}`;
    });
    void navigator.clipboard
      ?.writeText(lines.join("\n") || "Nothing to recheck.")
      .then(() => setNote(`Copied ${lines.length} rows.`))
      .catch(() => setNote("Clipboard refused. Select the rows instead."));
  }, [queue]);

  const blocked = queue.filter((r) => r.blocked).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Due a check" value={data?.dueCount ?? "—"} accent />
        <StatCard
          label="Products tracked"
          value={data?.totalProducts ?? "—"}
          hint={`stale after ${STALE_AFTER_DAYS} days`}
        />
        <StatCard
          label="Losing money"
          value={queue.filter((r) => r.band === "loss").length}
          hint="after payment fees"
        />
        <StatCard
          label="No supplier link"
          value={blocked}
          hint={blocked > 0 ? "cannot be checked yet" : undefined}
        />
      </div>

      {(error ?? note) && (
        <p
          role="alert"
          className="font-sans text-detail"
          style={{ color: error ? "var(--adm-critical)" : "var(--adm-ink-2)" }}
        >
          {error ?? note}
        </p>
      )}

      <Card
        title="Price checks due"
        subtitle={`Most valuable first. Staleness weighted by what a wrong cost would cost: a thin margin selling ${data?.volumeWindowDays ?? 90} days' worth outranks an old check on something nobody buys`}
        action={
          <div className="flex flex-wrap gap-1.5">
            <ToolbarButton onClick={copyChecklist} title="Copy the queue as a checklist">
              Copy list
            </ToolbarButton>
            <ToolbarButton onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Only what's due" : "Show everything"}
            </ToolbarButton>
          </div>
        }
      >
        {queue.length === 0 ? (
          <p className="font-sans text-detail text-paper/40">
            {data
              ? "Nothing due. Every sourced product has been checked recently and none is losing money."
              : "Loading…"}
          </p>
        ) : (
          <ul className="space-y-2">
            {queue.map((r) => {
              const econ = unitEconomics(r.priceCents, r.costCents);
              const grade = gradePrice(econ);
              const suggested =
                r.costCents !== null ? priceForMargin(r.costCents, 0.5) : null;
              const draft = drafts[r.productId] ?? "";
              return (
                <li
                  key={r.productId}
                  className="rounded-[var(--adm-radius-sm)] border p-3"
                  style={{ borderColor: "var(--adm-line)" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-detail text-paper/90">{r.title}</p>
                      <p className="mt-0.5 font-sans text-[11.5px] text-paper/45 tabular-nums">
                        {usd(r.priceCents)}
                        {r.costCents !== null ? ` · cost ${usd(r.costCents)}` : " · cost unknown"}
                        {` · fee ${usd(econ.feeCents)}`}
                        {r.unitsSold > 0 ? ` · ${r.unitsSold} sold` : ""}
                        {` · ${Math.round(r.ageDays) >= 3650 ? "never checked" : `${Math.round(r.ageDays)}d ago`}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <Pill tone={BAND_TONE[r.band]}>{grade.label}</Pill>
                      <Pill tone="neutral">{REASON_TEXT[r.reason]}</Pill>
                    </div>
                  </div>

                  {/* The sentence, not just the badge. The action differs by
                      cause: fees eating a small sale is fixed by pricing,
                      a thin margin on a large one is fixed at the supplier. */}
                  <p className="mt-1.5 font-sans text-[11.5px] text-paper/55">
                    {grade.reason}
                    {suggested !== null && r.band !== "strong"
                      ? ` ${usd(suggested)} would make it 50%.`
                      : ""}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {r.supplierUrl ? (
                      <a
                        href={r.supplierUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-[var(--adm-radius-sm)] border px-2.5 py-1 font-sans text-[12px]"
                        style={{ borderColor: "var(--adm-line)", color: "var(--adm-accent)" }}
                      >
                        Open supplier
                      </a>
                    ) : (
                      <Pill tone="rose">No supplier link</Pill>
                    )}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={draft}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [r.productId]: e.target.value }))
                      }
                      placeholder="new cost"
                      className="h-8 w-[110px] rounded-[var(--adm-radius-sm)] border px-2 font-sans text-[12.5px] tabular-nums outline-none"
                      style={{
                        background: "var(--adm-control)",
                        borderColor: "var(--adm-line)",
                        color: "var(--adm-ink)",
                      }}
                    />
                    <ToolbarButton
                      variant="primary"
                      loading={busy === r.productId}
                      title="Record this cost and stamp the check"
                      onClick={() => {
                        const cents = Math.round(Number(draft) * 100);
                        if (!draft.trim() || !Number.isFinite(cents) || cents < 0) {
                          setNote("Enter the cost in dollars first, like 9.00.");
                          return;
                        }
                        void record(
                          r.productId,
                          cents,
                          cents === r.costCents ? "ok" : "changed",
                        );
                      }}
                    >
                      Save cost
                    </ToolbarButton>
                    <ToolbarButton
                      loading={busy === r.productId}
                      title="Confirm the cost is still right, without changing it"
                      onClick={() => void record(r.productId, r.costCents, "ok")}
                    >
                      Still right
                    </ToolbarButton>
                    <ToolbarButton
                      variant="danger"
                      loading={busy === r.productId}
                      // The last known cost is deliberately kept. Knowing what
                      // it used to be is what makes the disappearance legible.
                      title="The supplier no longer lists this"
                      onClick={() => void record(r.productId, null, "unavailable")}
                    >
                      Gone
                    </ToolbarButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {data?.truncated && (
          <p className="mt-3 font-sans text-[12px] text-paper/40">
            Showing the top {data.limit} of {data.dueCount} due. Work these,
            then reload for the next batch.
          </p>
        )}
      </Card>
    </div>
  );
}
