"use client";

// Sustainability tab — current-month BMC raised vs goal, 12-month history,
// editable expense lines. The expense rows are the source of truth that
// the public /support page reads.

import { useEffect, useRef, useState, useTransition } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, DataTable, Pill, StatCard, Toolbar, ToolbarButton } from "../primitives";
import { BarChart } from "../charts";
import {
  CADENCES,
  CADENCE_LABEL,
  CADENCE_UNIT,
  asCadence,
  monthlyFrom,
  type Cadence,
} from "@/lib/support/cadence";

type Expense = {
  id: number;
  label: string;
  /** Normalized to a month by the write route. Yearly is amortized, one time
   *  is 0. Every total in the panel and on /support sums THIS. */
  monthly_cents: number;
  /** As billed, in the cadence's own period. What the operator typed. */
  amount_cents: number;
  cadence: Cadence;
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
  /** The expense read itself failed. Distinct from an empty table, because an
   *  empty table offers Adopt all and a failed read must not. */
  expensesUnavailable?: boolean;
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
  const [saveFailed, setSaveFailed] = useState<string | null>(null);

  /**
   * The pending row order, or null when it matches what the server sent.
   *
   * Held locally rather than written on every drop because the operator is
   * likely to move three rows in a row, and each move would otherwise be a
   * round trip that reorders the list under their hands mid-gesture. Null is
   * the "nothing to save" state, which is also what makes the Save order
   * button appear and disappear without a second flag.
   */
  const [pendingOrder, setPendingOrder] = useState<Expense[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderFailed, setOrderFailed] = useState<string | null>(null);

  async function saveOrder(rows: Expense[]) {
    setSavingOrder(true);
    setOrderFailed(null);
    try {
      const r = await fetch("/api/admin/sustainability/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expense-reorder",
          ids: rows.map((x) => x.id),
        }),
      }).catch(() => null);
      if (r && r.ok) {
        setPendingOrder(null);
        startTransition(() => reload());
      } else {
        setOrderFailed("The new order did not save. The rows are unchanged on /support.");
      }
    } finally {
      setSavingOrder(false);
    }
  }
  const [editingGoal, setEditingGoal] = useState(false);
  const [editingRaised, setEditingRaised] = useState(false);
  const [raisedDraft, setRaisedDraft] = useState("");
  const [raisedError, setRaisedError] = useState<string | null>(null);
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

  async function saveExpense(
    row: Partial<Expense> & { label: string; amount_cents: number; cadence: Cadence },
  ) {
    setSaveFailed(null);
    const r = await fetch("/api/admin/sustainability/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "expense-upsert",
        id: row.id && row.id > 0 ? row.id : undefined,
        label: row.label,
        // The client sends what was typed and the cadence it was typed in. The
        // monthly figure is derived server-side from those two, so a client
        // can never disagree with the database about what a yearly line costs
        // per month, and the check constraint has something to verify against.
        amountCents: row.amount_cents,
        cadence: row.cadence,
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
    } else {
      // This used to have no else. A 400 from a bad Sort value discarded every
      // other edit on the row and left the form sitting there looking saved.
      setSaveFailed(
        r.status === 400
          ? "That did not save. Check the amount is a plain number."
          : `That did not save (${r.status}).`,
      );
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
            amountCents: row.amount_cents,
            cadence: row.cadence,
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

  /**
   * Correct the donations figure for this month.
   *
   * THIS IS THE ONLY WAY TO SET IT, and until now there was none. The total in
   * donations_monthly was meant to arrive from the Buy Me a Coffee cron, which
   * needs CRON_SECRET and a BMC key and has neither on production, so whatever
   * was last written by hand simply stayed. The owner has said the number
   * currently there is a placeholder for an amount they could not remember.
   *
   * Correcting it does NOT make it measured, which is why nothing downstream
   * counts it. lib/admin/profit.ts keeps it out of revenue, margin and the
   * break-even gap, and the revenue donut leaves it out of realized income.
   */
  async function saveRaised(usdValue: string) {
    if (!data) return;
    const cents = Math.round(Number(usdValue) * 100);
    // Number("") is 0 and Number("abc") is NaN, so both are caught here.
    if (!Number.isFinite(cents) || cents < 0) {
      setRaisedError("Enter an amount in dollars, like 24.98.");
      return;
    }
    setRaisedError(null);
    const r = await fetch("/api/admin/sustainability/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "donations-set",
        yearMonth: data.current.yearMonth,
        totalCents: cents,
        supporters: data.current.supporters ?? 0,
      }),
    });
    if (!r.ok) {
      const body = (await r.json().catch(() => null)) as { error?: string } | null;
      setRaisedError(body?.error ?? "That didn't save.");
      return;
    }
    setEditingRaised(false);
    startTransition(() => reload());
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

      {/* ── Donations, and what they are ─────────────────────────────────
          Editable, and labelled as recalled rather than measured. The subtitle
          is not a disclaimer bolted on: this figure is deliberately excluded
          from revenue, margin and the break-even gap everywhere else, and an
          operator reading it needs to know that is on purpose rather than a
          bug they should report. */}
      <Card
        title="Donations received"
        subtitle="Entered by hand, not measured. Shown here and left out of revenue, profit and the break-even gap on purpose"
        action={
          editingRaised ? undefined : (
            <Toolbar>
              <ToolbarButton
                variant="primary"
                onClick={() => {
                  setRaisedDraft(String(data.current.raisedCents / 100));
                  setRaisedError(null);
                  setEditingRaised(true);
                }}
                title="Correct the donations figure for this month"
              >
                {data.current.raisedCents > 0 ? "Correct figure" : "Enter figure"}
              </ToolbarButton>
            </Toolbar>
          )
        }
      >
        {editingRaised ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[160px]">
              <span
                className="mb-1 block font-sans text-[11.5px]"
                style={{ color: "var(--adm-ink-3)" }}
              >
                Donations, USD, {data.current.yearMonth}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={raisedDraft}
                onChange={(e) => setRaisedDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveRaised(raisedDraft);
                  if (e.key === "Escape") setEditingRaised(false);
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
              <ToolbarButton variant="primary" onClick={() => void saveRaised(raisedDraft)}>
                Save
              </ToolbarButton>
              <ToolbarButton onClick={() => setEditingRaised(false)}>Cancel</ToolbarButton>
            </Toolbar>
          </div>
        ) : (
          <p
            className="font-sans text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
            style={{ color: "var(--adm-ink)" }}
          >
            {usd(data.current.raisedCents)}
            <span
              className="ml-2 align-middle font-sans text-[13px] font-normal"
              style={{ color: "var(--adm-ink-3)" }}
            >
              not counted as revenue
            </span>
          </p>
        )}
        {raisedError && (
          <p
            role="alert"
            className="mt-2 font-sans text-[12.5px]"
            style={{ color: "var(--adm-critical)" }}
          >
            {raisedError}
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
          // Counts CONTRIBUTING lines, not active ones. A one time cost is
          // active and adds nothing to a monthly figure, so the old hint
          // counted rows the number beside it deliberately excludes, and the
          // two would have disagreed the day the first one time line was
          // entered.
          hint={(() => {
            const active = data.expenses.filter((e) => e.active);
            const once = active.filter((e) => e.cadence === "once").length;
            const recurring = active.length - once;
            return once === 0
              ? `${recurring} recurring line${recurring === 1 ? "" : "s"}`
              : `${recurring} recurring, ${once} one time`;
          })()}
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
            {pendingOrder && (
              <ToolbarButton
                variant="primary"
                onClick={() => saveOrder(pendingOrder)}
                loading={savingOrder}
                title="Write the new order to the database and to /support"
              >
                {savingOrder ? "Saving order" : "Save order"}
              </ToolbarButton>
            )}
            {pendingOrder && (
              <ToolbarButton onClick={() => setPendingOrder(null)}>
                Discard order
              </ToolbarButton>
            )}
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
        {data.expensesUnavailable && (
          <p
            className="mb-3 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-detail"
            style={{
              borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
              background: "color-mix(in oklab, var(--adm-critical), transparent 92%)",
              color: "var(--adm-critical)",
            }}
          >
            The cost lines could not be read. This is not an empty table, so
            nothing here is offering to rebuild it. /support is still serving
            whatever it last had.
          </p>
        )}
        {adding && (
          <ExpenseEditor
            initial={{
              id: 0,
              label: "",
              monthly_cents: 0,
              amount_cents: 0,
              // Monthly, which is what every line meant before this column
              // existed, so a new row behaves exactly as it always has.
              cadence: "monthly",
              note: "",
              category: "",
              active: true,
              // The END of the ladder. This used to be the row COUNT, which
              // ties an existing value the first time any row is deleted:
              // nine rows numbered 0..8, delete the one at 3, and the next new
              // line is handed 8 against the 8 already there.
              sort_order:
                data.expenses.reduce((m, e) => Math.max(m, e.sort_order), -1) + 1,
            }}
            onSave={saveExpense}
            onCancel={() => setAdding(false)}
          />
        )}
        <DataTable
          rows={pendingOrder ?? data.expenses}
          rowKey={(r) => String(r.id)}
          csvFilename="expense-lines.csv"
          // Drag, or Up and Down, or a keyboard. All three land here.
          //
          // Fallback rows are excluded: they have negative ids and do not exist
          // in the table yet, so there is nothing to renumber and a reorder
          // would be discarded the moment they were adopted.
          reorder={{
            name: (r) => r.label,
            canMove: (r) => r.id > 0,
            onReorder: (next) => {
              setOrderFailed(null);
              setPendingOrder(next);
            },
          }}
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
              // The monthly figure stays the headline, because it is what both
              // totals sum and what the goal is measured against. The billed
              // figure sits under it whenever the two differ, so a $2/mo line
              // that is really a $24 invoice says so on the row rather than
              // only inside the editor.
              render: (r) => (
                <div>
                  <p className="tabular-nums">{usd(r.monthly_cents)}</p>
                  {r.cadence !== "monthly" && (
                    <p className="text-eyebrow text-paper/50 mt-0.5 tabular-nums">
                      {usd(r.amount_cents)}{" "}
                      {r.cadence === "yearly" ? "a year" : "one time"}
                    </p>
                  )}
                </div>
              ),
              csv: (r) => r.monthly_cents / 100,
            },
            {
              key: "cadence",
              label: "Billed",
              render: (r) =>
                r.cadence === "monthly" ? (
                  <Pill tone="neutral">Monthly</Pill>
                ) : r.cadence === "yearly" ? (
                  <Pill tone="gold">Yearly</Pill>
                ) : (
                  <Pill tone="rose">One time</Pill>
                ),
              csv: (r) => r.cadence,
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
        {(saveFailed || orderFailed) && (
          <p
            className="mt-3 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-detail"
            style={{
              borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
              background: "color-mix(in oklab, var(--adm-critical), transparent 92%)",
              color: "var(--adm-critical)",
            }}
          >
            {saveFailed ?? orderFailed}
          </p>
        )}
        {pendingOrder && (
          <p className="mt-3 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            This order is not saved yet. /support still shows the old one.
          </p>
        )}
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
            // KEYED, so switching rows remounts the editor.
            //
            // ExpenseEditor seeds all six of its fields from `initial` in
            // useState initialisers, which run once per mount, and there is no
            // resync effect. The {editing && ...} slot holds a fixed child
            // position, so clicking Edit on a second row while the first was
            // open re-rendered the SAME instance and every field kept row A's
            // values. Save then spreads fresh row B and overwrites each user
            // field with stale row A, which is what made it land on the wrong
            // record rather than being a harmless no-op.
            //
            // The Adopt button takes the same path, so adopting while an edit
            // was open inserted a new row carrying the previous row's label
            // and amount.
            key={editing.id}
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
  const [usdValue, setUsdValue] = useState(String(initial.amount_cents / 100));
  const [cadence, setCadence] = useState<Cadence>(initial.cadence);
  const [note, setNote] = useState(initial.note ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [active, setActive] = useState(initial.active);

  // Every field is now labelled. Four of the five used to be a bare
  // placeholder, which is invisible the moment the field has a value, and on
  // an Edit these fields ALWAYS have a value. The panel's own convention is a
  // visible label on --adm-ink-3 over a control on --adm-control, which is
  // what the goal editor sixty lines above this already does.
  const fieldCls =
    "h-11 w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
  const fieldStyle = {
    background: "var(--adm-control)",
    borderColor: "var(--adm-line-strong)",
    color: "var(--adm-ink)",
  } as React.CSSProperties;
  const labelCls = "mb-1 block font-sans text-[11.5px]";
  const labelStyle = { color: "var(--adm-ink-3)" } as React.CSSProperties;

  const amount = Math.round(Number(usdValue || "0") * 100);
  const amountValid = Number.isFinite(amount) && amount >= 0;
  const monthly = amountValid ? monthlyFrom(cadence, amount) : 0;

  return (
    <div
      className="rounded-[var(--adm-radius)] border p-4 mb-4 grid grid-cols-1 md:grid-cols-12 gap-3"
      style={{
        borderColor: "color-mix(in oklab, var(--adm-accent), transparent 65%)",
        background: "color-mix(in oklab, var(--adm-accent), transparent 96%)",
      }}
    >
      <label className="md:col-span-4">
        <span className={labelCls} style={labelStyle}>Line</span>
        <input
          className={fieldCls}
          style={fieldStyle}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>

      {/* Cadence sits BEFORE the amount, because it decides what the amount
          means. Reading left to right the row now says "this costs, yearly,
          twenty four dollars", where before it said "USD/mo" and offered no
          way to say anything else. */}
      <label className="md:col-span-2">
        <span className={labelCls} style={labelStyle}>Billed</span>
        <select
          className={fieldCls}
          style={fieldStyle}
          value={cadence}
          onChange={(e) => setCadence(asCadence(e.target.value))}
        >
          {CADENCES.map((c) => (
            <option key={c} value={c}>
              {CADENCE_LABEL[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2">
        <span className={labelCls} style={labelStyle}>{CADENCE_UNIT[cadence]}</span>
        <input
          className={`${fieldCls} tabular-nums`}
          style={fieldStyle}
          value={usdValue}
          onChange={(e) => setUsdValue(e.target.value)}
          inputMode="decimal"
          aria-describedby="expense-monthly-effect"
        />
      </label>

      <label className="md:col-span-2">
        <span className={labelCls} style={labelStyle}>Category</span>
        <input
          className={fieldCls}
          style={fieldStyle}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </label>

      <label className="md:col-span-2 inline-flex items-end gap-2 pb-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active
      </label>

      {/* What the cadence actually does to the published total, said in words
          before Save rather than discovered on /support after it. */}
      <p
        id="expense-monthly-effect"
        className="md:col-span-8 font-sans text-[11.5px]"
        style={{ color: "var(--adm-ink-3)" }}
      >
        {!amountValid
          ? "Enter a plain number, for example 24 or 24.50."
          : cadence === "once"
            ? "A one time cost. It is listed on /support but adds nothing to the monthly total, because it is not a monthly cost."
            : cadence === "yearly"
              ? `Counts as ${usd(monthly)} a month. Twelve of those do not add back to the year exactly, so the yearly figure stays on record as the real one.`
              : `Counts as ${usd(monthly)} a month.`}
      </p>

      <div className="md:col-span-4 flex items-end justify-end gap-2 pb-1">
        <ToolbarButton onClick={onCancel}>Cancel</ToolbarButton>
        <ToolbarButton
          variant="primary"
          onClick={() =>
            onSave({
              ...initial,
              label,
              amount_cents: amount,
              cadence,
              // Sent for the caller's optimistic use only. The server derives
              // its own from cadence and amount and ignores this.
              monthly_cents: monthly,
              note: note || null,
              category: category || null,
              active,
            })
          }
        >
          Save
        </ToolbarButton>
      </div>
      <label className="md:col-span-12">
        <span className={labelCls} style={labelStyle}>
          Note, shown under the label on /support
        </span>
        <textarea
          className="w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12px]"
          style={fieldStyle}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </label>
    </div>
  );
}
