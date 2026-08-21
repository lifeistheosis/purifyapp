"use client";

// Sustainability tab — current-month BMC raised vs goal, 12-month history,
// editable expense lines. The expense rows are the source of truth that
// the public /support page reads.

import { useEffect, useState, useTransition } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, DataTable, Pill, StatCard, Toolbar, ToolbarButton } from "../primitives";
import { BarChart } from "../charts";

type Expense = {
  id: number;
  label: string;
  monthly_cents: number;
  note: string | null;
  category: string | null;
  active: boolean;
  sort_order: number;
};

type Payload = {
  current: {
    yearMonth: string;
    raisedCents: number;
    supporters: number;
    goalCents: number;
    fetchedAt: string | null;
    live: boolean;
  };
  history: {
    year_month: string;
    total_cents: number;
    supporters: number;
    goal_cents: number;
  }[];
  expenses: Expense[];
  expensesFromFallback: boolean;
  monthlyExpenseCents: number;
};

function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function SustainabilityTab() {
  const [data, setData] = useState<Payload | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  async function reload() {
    const r = await fetch("/api/admin/sustainability", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }

  useEffect(() => {
    let alive = true;
    adminJson<Payload>("/api/admin/sustainability").then((j) => {
      if (alive && j) setData(j);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function saveExpense(row: Partial<Expense> & { label: string; monthly_cents: number }) {
    const r = await fetch("/api/admin/sustainability/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "expense-upsert",
        id: row.id && row.id > 0 ? row.id : undefined,
        label: row.label,
        monthlyCents: row.monthly_cents,
        note: row.note ?? null,
        category: row.category ?? null,
        active: row.active ?? true,
        sortOrder: row.sort_order ?? 0,
      }),
    });
    if (r.ok) {
      setEditing(null);
      setAdding(false);
      startTransition(() => reload());
    }
  }

  async function deleteExpense(id: number) {
    if (!confirm("Delete this expense line? It will disappear from /support.")) return;
    const r = await fetch("/api/admin/sustainability/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "expense-delete", id }),
    });
    if (r.ok) startTransition(() => reload());
  }

  async function setGoal() {
    if (!data) return;
    const current = data.current.goalCents / 100;
    const next = prompt("Monthly goal (USD)?", String(current));
    if (!next) return;
    const cents = Math.round(Number(next) * 100);
    if (!Number.isFinite(cents) || cents < 0) return;
    const r = await fetch("/api/admin/sustainability/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "goal-set",
        yearMonth: data.current.yearMonth,
        goalCents: cents,
      }),
    });
    if (r.ok) startTransition(() => reload());
  }

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  const pct =
    data.current.goalCents > 0
      ? Math.min(100, Math.round((data.current.raisedCents / data.current.goalCents) * 100))
      : 0;
  const shortfallCents = Math.max(0, data.current.goalCents - data.current.raisedCents);
  const coverageRatio =
    data.monthlyExpenseCents > 0
      ? data.current.raisedCents / data.monthlyExpenseCents
      : 0;

  return (
    <div className="space-y-6">
      {!data.current.live && (
        <Card title="BMC unreachable" accent>
          <p className="font-sans text-detail text-paper/75">
            The Buy Me a Coffee Developer API didn&rsquo;t return a value for
            this month. Check <span className="font-mono">BMC_ACCESS_TOKEN</span>{" "}
            and the /support page is currently showing the fallback figure.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label={`Raised · ${data.current.yearMonth}`}
          value={usd(data.current.raisedCents)}
          accent
          hint={`${pct}% of ${usd(data.current.goalCents)} goal`}
        />
        <StatCard
          label="Shortfall to goal"
          value={usd(shortfallCents)}
          hint={`${data.current.supporters} supporters`}
        />
        <StatCard
          label="Monthly expenses"
          value={usd(data.monthlyExpenseCents)}
          hint={`${data.expenses.filter((e) => e.active).length} active lines`}
        />
        <StatCard
          label="Expense coverage"
          value={`${Math.round(coverageRatio * 100)}%`}
          hint={
            coverageRatio >= 1
              ? "Above operating cost"
              : "Below operating cost"
          }
          accent={coverageRatio < 1}
        />
      </div>

      <Card
        title="12-month donations history"
        subtitle="From donations_monthly snapshots. Empty if the daily cron hasn’t run."
        action={
          <Toolbar>
            <ToolbarButton onClick={setGoal} title="Set this month’s goal">
              Set goal
            </ToolbarButton>
          </Toolbar>
        }
      >
        {data.history.length === 0 ? (
          <p className="font-sans text-caption text-paper/45 py-4">
            No snapshots yet. Run <span className="font-mono">/api/cron/bmc-snapshot</span> or wait for the daily job.
          </p>
        ) : (
          <BarChart
            rows={data.history.map((h) => ({
              label: h.year_month.slice(2),
              value: Math.round(h.total_cents / 100),
            }))}
          />
        )}
      </Card>

      <Card
        title={`Expense lines · ${data.expenses.length}`}
        subtitle={
          data.expensesFromFallback
            ? "Falling back to data/support/support.ts — the expense_lines table is empty. Add a line to take over."
            : "Lives on /support. Edits propagate without a redeploy."
        }
        action={
          <Toolbar>
            <ToolbarButton
              variant="primary"
              onClick={() => {
                setAdding(true);
                setEditing(null);
              }}
            >
              + Add line
            </ToolbarButton>
          </Toolbar>
        }
      >
        {adding && (
          <ExpenseEditor
            initial={{
              id: 0,
              label: "",
              monthly_cents: 0,
              note: "",
              category: "",
              active: true,
              sort_order: data.expenses.length,
            }}
            onSave={saveExpense}
            onCancel={() => setAdding(false)}
          />
        )}
        <DataTable
          rows={data.expenses}
          rowKey={(r) => String(r.id)}
          csvFilename="expense-lines.csv"
          columns={[
            {
              key: "label",
              label: "Line",
              render: (r) => (
                <div>
                  <p className="font-semibold text-paper">{r.label}</p>
                  {r.note && <p className="text-eyebrow text-paper/50 mt-0.5">{r.note}</p>}
                </div>
              ),
              csv: (r) => r.label,
            },
            {
              key: "category",
              label: "Category",
              render: (r) => r.category ?? "—",
              csv: (r) => r.category ?? "",
            },
            {
              key: "monthly",
              label: "Monthly",
              align: "right",
              render: (r) => usd(r.monthly_cents),
              csv: (r) => r.monthly_cents / 100,
            },
            {
              key: "active",
              label: "",
              render: (r) =>
                r.active ? (
                  <Pill tone="emerald">Active</Pill>
                ) : (
                  <Pill tone="neutral">Hidden</Pill>
                ),
            },
            {
              key: "actions",
              label: "",
              render: (r) =>
                r.id > 0 ? (
                  <Toolbar>
                    <ToolbarButton onClick={() => setEditing(r)}>Edit</ToolbarButton>
                    <ToolbarButton variant="danger" onClick={() => deleteExpense(r.id)}>
                      Delete
                    </ToolbarButton>
                  </Toolbar>
                ) : (
                  <Pill tone="neutral">Fallback</Pill>
                ),
            },
          ]}
        />
        {editing && (
          <ExpenseEditor
            initial={editing}
            onSave={saveExpense}
            onCancel={() => setEditing(null)}
          />
        )}
      </Card>
    </div>
  );
}

function ExpenseEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: Expense;
  onSave: (row: Expense) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [usdValue, setUsdValue] = useState(String(initial.monthly_cents / 100));
  const [note, setNote] = useState(initial.note ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [active, setActive] = useState(initial.active);
  const [sortOrder, setSortOrder] = useState(String(initial.sort_order));

  return (
    <div className="rounded-[var(--adm-radius)] border border-gold/30 bg-gold/[0.04] p-4 mb-4 grid grid-cols-1 md:grid-cols-12 gap-3">
      <input
        className="md:col-span-4 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        className="md:col-span-2 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper tabular-nums"
        placeholder="USD/mo"
        value={usdValue}
        onChange={(e) => setUsdValue(e.target.value)}
        inputMode="decimal"
      />
      <input
        className="md:col-span-2 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <input
        className="md:col-span-1 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper tabular-nums"
        placeholder="Sort"
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
        inputMode="numeric"
      />
      <label className="md:col-span-1 inline-flex items-center gap-2 font-sans text-caption text-paper/70">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active
      </label>
      <div className="md:col-span-2 flex justify-end gap-2">
        <ToolbarButton onClick={onCancel}>Cancel</ToolbarButton>
        <ToolbarButton
          variant="primary"
          onClick={() =>
            onSave({
              ...initial,
              label,
              monthly_cents: Math.round(Number(usdValue || "0") * 100),
              note: note || null,
              category: category || null,
              active,
              sort_order: Number(sortOrder || "0"),
            })
          }
        >
          Save
        </ToolbarButton>
      </div>
      <textarea
        className="md:col-span-12 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-caption text-paper/85"
        placeholder="Note (shown under the label on /support)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />
    </div>
  );
}
