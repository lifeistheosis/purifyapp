"use client";

// Sustainability tab — current-month BMC raised vs goal, 12-month history,
// editable expense lines. The expense rows are the source of truth that
// the public /support page reads.

import { useEffect, useRef, useState, useTransition } from "react";
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
    /** False means no row exists for this month and the committed default is
        being shown. A goal nobody set should not look like one somebody did. */
    goalSetForMonth: boolean;
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
  // adminJson resolves null on a 403 and on a network failure alike, so
  // without this the tab sat on "Loading…" forever and told the operator a
  // request was in flight that had already failed. A panel that cannot say
  // "this did not load" is the same defect as one that says a support email
  // was sent when it was not.
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [adoptFailed, setAdoptFailed] = useState<string[] | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  // Opening the editor replaces the button that opened it, so without this a
  // keyboard operator's focus falls to <body> and they have to tab back in
  // from the top. autoFocus would do the same thing, but the lint rule against
  // it is aimed at controls that steal focus on page load; this moves focus
  // exactly once, in response to a click, which is the behaviour the rule
  // wants rather than the attribute it bans.
  const goalInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingGoal) goalInputRef.current?.focus();
  }, [editingGoal]);
  const [, startTransition] = useTransition();

  async function reload() {
    const r = await fetch("/api/admin/sustainability", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }

  useEffect(() => {
    let alive = true;
    adminJson<Payload>("/api/admin/sustainability").then((j) => {
      if (!alive) return;
      if (j) setData(j);
      else setLoadFailed(true);
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

  /**
   * Write every committed fallback line into the table in one go.
   *
   * Sequential rather than Promise.all on purpose: the route takes one action
   * per request and sortOrder has to land in list order, so racing them would
   * shuffle the rows on /support. Nine requests is fine; this runs once in the
   * life of the table.
   */
  async function adoptAll() {
    if (!data || !data.expensesFromFallback || adopting) return;
    setAdopting(true);
    setAdoptFailed(null);
    const failed: string[] = [];
    try {
      let i = 0;
      for (const row of data.expenses) {
        const r = await fetch("/api/admin/sustainability/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "expense-upsert",
            label: row.label,
            monthlyCents: row.monthly_cents,
            note: row.note ?? null,
            category: row.category ?? null,
            active: true,
            sortOrder: i,
          }),
        }).catch(() => null);
        // A partial failure is the dangerous case, not a total one. The moment
        // the first row lands, expensesFromFallback flips false and this button
        // disappears, so a row that failed silently would just be missing from
        // /support with nothing anywhere saying which. Names are collected and
        // shown; the rest are already real rows and can be added by hand.
        if (!r || !r.ok) failed.push(row.label);
        i += 1;
      }
      if (failed.length) setAdoptFailed(failed);
      startTransition(() => reload());
    } finally {
      setAdopting(false);
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

  /**
   * Was a window.prompt, sitting in the header of the 12-month history card
   * rather than next to the goal it edits, while a proper inline editor for
   * expense lines sat eighty lines below it. A prompt cannot show the current
   * value in context, cannot validate as you type, cannot be cancelled without
   * guessing, and is the one control in this panel that looks like the browser
   * rather than the product.
   */
  async function saveGoal(usdValue: string) {
    if (!data) return;
    const cents = Math.round(Number(usdValue) * 100);
    // Number("") is 0 and Number("abc") is NaN, so both are caught here.
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
    if (r.ok) {
      setEditingGoal(false);
      startTransition(() => reload());
    }
  }

  if (!data) {
    return loadFailed ? (
      <Card title="Costs could not be loaded">
        <p className="font-sans text-detail" style={{ color: "var(--adm-ink-2)" }}>
          <span className="font-mono">/api/admin/sustainability</span> did not
          answer. That is a 403 if this session is not on ADMIN_EMAILS, or a
          network failure otherwise; the request cannot tell the two apart.
          Nothing has been changed, and the public /support page is unaffected.
        </p>
      </Card>
    ) : (
      <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>
    );
  }

  const pct =
    data.current.goalCents > 0
      ? Math.min(100, Math.round((data.current.raisedCents / data.current.goalCents) * 100))
      : 0;
  const shortfallCents = Math.max(0, data.current.goalCents - data.current.raisedCents);
  // DONATIONS over costs, and nothing else. Shop net and subscription
  // revenue are not in the numerator, so this is one funding source measured
  // against the whole cost base. It was labelled "Expense coverage" and
  // hinted "Below operating cost", which reads as a verdict on the business
  // and is not one: it can sit under 100% while Purify is comfortably above
  // water on total income. Named for what it divides.
  const donationCoverageRatio =
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

      {/* The budget, next to the numbers it governs, and honest about
          whether anyone actually set it for this month. */}
      <Card
        title="Monthly goal"
        subtitle={
          data.current.goalSetForMonth
            ? `Set for ${data.current.yearMonth}. This is what /support publishes.`
            : "Not set for this month. /support is publishing the committed default from data/support/support.ts."
        }
        action={
          editingGoal ? undefined : (
            <Toolbar>
              <ToolbarButton
                variant="primary"
                onClick={() => {
                  setGoalDraft(String(data.current.goalCents / 100));
                  setEditingGoal(true);
                }}
                title="Set this month's goal"
              >
                {data.current.goalSetForMonth ? "Change goal" : "Set goal"}
              </ToolbarButton>
            </Toolbar>
          )
        }
      >
        {editingGoal ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[160px]">
              <span
                className="mb-1 block font-sans text-[11.5px]"
                style={{ color: "var(--adm-ink-3)" }}
              >
                Goal, USD per month
              </span>
              <input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                ref={goalInputRef}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveGoal(goalDraft);
                  if (e.key === "Escape") setEditingGoal(false);
                }}
                className="h-11 w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[13px] tabular-nums"
                style={{
                  background: "var(--adm-control)",
                  borderColor: "var(--adm-line-strong)",
                  color: "var(--adm-ink)",
                }}
              />
            </label>
            <Toolbar>
              <ToolbarButton variant="primary" onClick={() => saveGoal(goalDraft)}>
                Save
              </ToolbarButton>
              <ToolbarButton onClick={() => setEditingGoal(false)}>Cancel</ToolbarButton>
            </Toolbar>
          </div>
        ) : (
          <p
            className="font-sans text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
            style={{ color: "var(--adm-ink)" }}
          >
            {usd(data.current.goalCents)}
            <span
              className="ml-2 align-middle font-sans text-[13px] font-normal"
              style={{ color: "var(--adm-ink-3)" }}
            >
              against {usd(data.monthlyExpenseCents)} of costs
            </span>
          </p>
        )}
      </Card>

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
          label="Donations vs costs"
          value={`${Math.round(donationCoverageRatio * 100)}%`}
          hint={
            donationCoverageRatio >= 1
              ? "Donations alone cover costs"
              : "Donations alone do not cover costs. Shop and subscription income are not counted here."
          }
          accent={donationCoverageRatio < 1}
        />
      </div>

      <Card
        title="12-month donations history"
        subtitle="From donations_monthly snapshots. Empty if the daily cron hasn’t run."
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
            ? `Falling back to data/support/support.ts, because the expense_lines table is empty. /support is publishing these ${data.expenses.length} committed lines and saying so. Adopt them to take over.`
            : "Lives on /support. Edits propagate without a redeploy."
        }
        action={
          <Toolbar>
            {data.expensesFromFallback && (
              <ToolbarButton
                variant="primary"
                onClick={adoptAll}
                loading={adopting}
                title="Write all committed lines into the table as real rows"
              >
                {adopting ? "Adopting" : `Adopt all ${data.expenses.length}`}
              </ToolbarButton>
            )}
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
              // A fallback row used to render an inert "Fallback" pill, so the
              // panel showed nine correct lines and let you edit none of them
              // while "Add line" started blank. The only way to take over was
              // to retype all nine.
              //
              // Editing one now writes it as a real row: saveExpense already
              // drops a negative id, which turns the upsert into an insert. The
              // word is "Adopt" rather than "Edit" because that is what the
              // button does, and calling it Edit would imply the committed
              // file is what changes.
              render: (r) =>
                r.id > 0 ? (
                  <Toolbar>
                    <ToolbarButton onClick={() => setEditing(r)}>Edit</ToolbarButton>
                    <ToolbarButton variant="danger" onClick={() => deleteExpense(r.id)}>
                      Delete
                    </ToolbarButton>
                  </Toolbar>
                ) : (
                  <Toolbar>
                    <ToolbarButton
                      onClick={() => setEditing(r)}
                      title="Write this committed line into the database as a real, editable row"
                    >
                      Adopt
                    </ToolbarButton>
                  </Toolbar>
                ),
            },
          ]}
        />
        {adoptFailed && adoptFailed.length > 0 && (
          <p
            className="mb-3 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-detail"
            style={{
              borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
              background: "color-mix(in oklab, var(--adm-critical), transparent 92%)",
              color: "var(--adm-critical)",
            }}
          >
            {adoptFailed.length} line{adoptFailed.length === 1 ? "" : "s"} did not
            save: {adoptFailed.join(", ")}. Everything else is in. Add these with
            Add line.
          </p>
        )}
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
