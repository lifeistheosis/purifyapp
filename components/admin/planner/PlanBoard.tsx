"use client";

// The week board: what is due, what is late, and what the week still owes.
//
// The calendar used to be a wall chart of yesterday's numbers. This is the
// other half: the deadlines Purify's own rhythm creates (lib/admin/planner.ts),
// on the days they fall, with the ones already met ticked by the app itself.
//
// TODAY IS RESOLVED ON THE DEVICE through useToday(), the house hook, which
// also re-syncs at the operator's local midnight so a panel left open
// overnight moves its marker.

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import {
  addDays,
  CATEGORY,
  dueSummary,
  weekDays,
  weekStart,
  type BoardTask,
  type TaskCategory,
} from "@/lib/admin/planner";
import { useToday } from "@/lib/calendar/useToday";
import { keyOf } from "@/lib/rhythm/dayKey";

import { Card, Modal, Pill, ToolbarButton } from "../primitives";
import { Select } from "../Select";

const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function rangeLabel(from: string, to: string): string {
  return `${dayLabel(from)} to ${dayLabel(to)}`;
}

type Feed = { tasks: BoardTask[]; ready: boolean; error?: string };

export function PlanBoard() {
  const todayDate = useToday();
  const today = todayDate ? keyOf(todayDate) : null;

  // Null follows today, so the board opens on this week without an effect
  // copying the day into state.
  const [cursorOverride, setCursorOverride] = useState<string | null>(null);
  const cursor = cursorOverride ?? (today ? weekStart(today) : null);

  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<BoardTask | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Four weeks back for what is late, three forward for what is coming.
  const from = cursor ? addDays(cursor, -28) : null;
  const to = cursor ? addDays(cursor, 27) : null;

  const load = useCallback(async () => {
    if (!from || !to) return;
    const d = await adminJson<Feed>(`/api/admin/planner?from=${from}&to=${to}`);
    setFeed(d);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the read
       shares its path with the week buttons; every write is past an await. */
    void load();
  }, [load]);

  const tasks = feed?.tasks ?? [];
  const week = cursor ? weekDays(cursor) : [];
  // Filters over a few dozen rows, left plain: memoising them means memoising
  // the arrays they read, which the React compiler will not preserve.
  const inWeek = cursor
    ? tasks.filter((t) => t.dueOn >= week[0] && t.dueOn <= week[6])
    : [];
  const summary = dueSummary(tasks, today ?? "");
  const lateBefore = cursor
    ? summary.overdue.filter((t) => t.dueOn < week[0])
    : [];
  const coming = cursor
    ? summary.later.filter((t) => t.dueOn > week[6]).slice(0, 8)
    : [];
  const weekOpen = inWeek.filter((t) => t.status === "open").length;
  const weekDone = inWeek.filter((t) => t.status === "done").length;

  async function change(task: BoardTask, patch: Record<string, unknown>) {
    setError(null);
    const body = task.id
      ? { id: task.id, ...patch }
      : { ruleKey: task.ruleKey, ...patch };
    const res = await fetch("/api/admin/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? `That did not save (${res.status}).`);
    }
    setOpen(null);
    await load();
  }

  async function remove(task: BoardTask) {
    if (!task.id) return change(task, { status: "skipped" });
    setError(null);
    const res = await fetch(`/api/admin/planner?id=${task.id}`, {
      method: "DELETE",
    });
    if (!res.ok) setError("That did not delete.");
    setOpen(null);
    await load();
  }

  return (
    <div className="space-y-4">
      <Card
        title="This week"
        subtitle={
          cursor
            ? `${rangeLabel(
                week[0],
                week[6]
              )} · ${weekOpen} still to do, ${weekDone} done${
                summary.overdue.length ? `, ${summary.overdue.length} late` : ""
              }`
            : "Reading the week…"
        }
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarButton
              onClick={() => {
                if (cursor) setCursorOverride(addDays(cursor, -7));
              }}
            >
              ‹
            </ToolbarButton>
            <ToolbarButton onClick={() => setCursorOverride(null)}>
              Today
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                if (cursor) setCursorOverride(addDays(cursor, 7));
              }}
            >
              ›
            </ToolbarButton>
            <ToolbarButton variant="primary" onClick={() => setAdding(true)}>
              Add
            </ToolbarButton>
          </div>
        }
      >
        {error && (
          <p
            role="alert"
            className="mb-3 font-sans text-[12.5px]"
            style={{ color: "var(--adm-critical)" }}
          >
            {error}
          </p>
        )}
        {feed && !feed.ready && (
          <p
            className="mb-3 font-sans text-[12px]"
            style={{ color: "var(--adm-warn)" }}
          >
            The board shows the rhythm, but nothing can be ticked or added until
            supabase/migrations/20260919_ops_board.sql is applied.
          </p>
        )}

        {lateBefore.length > 0 && (
          <div
            className="mb-3 rounded-[var(--adm-radius)] border px-3 py-2"
            style={{
              borderColor:
                "color-mix(in oklab, var(--adm-critical), transparent 60%)",
              background:
                "color-mix(in oklab, var(--adm-critical), transparent 94%)",
            }}
          >
            <p
              className="font-sans text-[12px] font-semibold"
              style={{ color: "var(--adm-critical)" }}
            >
              Late from earlier weeks
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {lateBefore.slice(0, 8).map((t) => (
                <li key={t.ruleKey ?? t.id}>
                  <Chip
                    task={t}
                    today={today}
                    onOpen={() => setOpen(t)}
                    onToggle={() => change(t, { status: "done" })}
                  />
                </li>
              ))}
            </ul>
            {lateBefore.length > 8 && (
              <p className="mt-1.5 font-sans text-[11.5px]" style={ink3}>
                and {lateBefore.length - 8} more in earlier weeks
              </p>
            )}
          </div>
        )}

        <div className="@container">
          <div className="grid gap-2 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-4 @min-[1180px]:grid-cols-7">
            {week.map((day, i) => {
              const items = inWeek.filter((t) => t.dueOn === day);
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className="min-h-24 rounded-[var(--adm-radius)] border p-2"
                  style={{
                    borderColor: isToday
                      ? "var(--adm-accent)"
                      : "var(--adm-line)",
                    background: isToday
                      ? "color-mix(in oklab, var(--adm-accent), transparent 92%)"
                      : "var(--adm-panel-2)",
                  }}
                >
                  <p
                    className="mb-1.5 flex items-baseline justify-between gap-1 font-sans text-[11.5px]"
                    style={ink3}
                  >
                    <span
                      className="font-semibold"
                      style={isToday ? { color: "var(--adm-accent)" } : ink2}
                    >
                      {DAY_NAMES[i]}
                    </span>
                    <span>{dayLabel(day).replace(/^\w+ /, "")}</span>
                  </p>
                  {items.length === 0 ? (
                    <p className="font-sans text-[11.5px]" style={ink3}>
                      &nbsp;
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {items.map((t) => (
                        <li key={t.ruleKey ?? t.id}>
                          <Chip
                            task={t}
                            today={today}
                            onOpen={() => setOpen(t)}
                            onToggle={() =>
                              change(t, {
                                status: t.status === "done" ? "open" : "done",
                              })
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {loading && (
          <p className="mt-3 font-sans text-[12px]" style={ink3}>
            Reading the board…
          </p>
        )}
      </Card>

      {coming.length > 0 && (
        <Card
          title="Coming up"
          subtitle="The next few weeks, so nothing arrives as a surprise."
        >
          <ul className="space-y-1.5">
            {coming.map((t) => (
              <li
                key={t.ruleKey ?? t.id}
                className="flex flex-wrap items-center gap-2"
              >
                <span
                  className="w-20 shrink-0 font-sans text-[11.5px] tabular-nums"
                  style={ink3}
                >
                  {dayLabel(t.dueOn)}
                </span>
                <Chip
                  task={t}
                  today={today}
                  onOpen={() => setOpen(t)}
                  onToggle={() => change(t, { status: "done" })}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {open && (
        <TaskModal
          task={open}
          onClose={() => setOpen(null)}
          onChange={(patch) => change(open, patch)}
          onDelete={() => remove(open)}
        />
      )}

      {adding && cursor && (
        <AddModal
          day={today ?? week[0]}
          onClose={() => setAdding(false)}
          onAdded={async () => {
            setAdding(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Chip({
  task,
  today,
  onOpen,
  onToggle,
}: {
  task: BoardTask;
  today: string | null;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const late = task.status === "open" && today !== null && task.dueOn < today;
  const done = task.status === "done";
  const skipped = task.status === "skipped";
  return (
    <span
      className="inline-flex max-w-full items-start gap-1.5 rounded-[var(--adm-radius-sm)] border px-1.5 py-1"
      style={{
        borderColor: late
          ? "color-mix(in oklab, var(--adm-critical), transparent 55%)"
          : "var(--adm-line)",
        background: done
          ? "color-mix(in oklab, var(--adm-good), transparent 92%)"
          : "var(--adm-panel)",
        opacity: skipped ? 0.55 : 1,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
        className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border font-sans text-[10px] leading-none"
        style={{
          borderColor: done ? "var(--adm-good)" : "var(--adm-line-strong)",
          color: "var(--adm-good)",
        }}
      >
        {done ? "✓" : ""}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <span
          className="font-sans text-[12px] leading-snug"
          style={{
            color: done
              ? "var(--adm-ink-3)"
              : late
              ? "var(--adm-critical)"
              : "var(--adm-ink)",
            textDecoration: done || skipped ? "line-through" : undefined,
          }}
        >
          <span aria-hidden>{CATEGORY[task.category].emoji} </span>
          {task.title}
        </span>
      </button>
    </span>
  );
}

function TaskModal({
  task,
  onClose,
  onChange,
  onDelete,
}: {
  task: BoardTask;
  onClose: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [due, setDue] = useState(task.dueOn);
  return (
    <Modal
      title={task.title}
      subtitle={`${CATEGORY[task.category].label} · due ${dayLabel(
        task.dueOn
      )}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {task.notes && (
          <p className="font-sans text-[12.5px] leading-[1.6]" style={ink2}>
            {task.notes}
          </p>
        )}
        {task.byItself && (
          <p
            className="font-sans text-[12px]"
            style={{ color: "var(--adm-good)" }}
          >
            Ticked by the app: the work for this is already in the data.
          </p>
        )}

        <label
          className="flex items-center gap-2 font-sans text-[12.5px]"
          style={ink3}
        >
          <span>Move to</span>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12.5px]"
            style={{
              borderColor: "var(--adm-line-strong)",
              background: "var(--adm-control)",
              color: "var(--adm-ink)",
            }}
          />
          {due !== task.dueOn && (
            <ToolbarButton
              variant="primary"
              onClick={() => onChange({ dueOn: due })}
            >
              Move it
            </ToolbarButton>
          )}
        </label>

        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {task.status !== "done" && (
              <ToolbarButton
                variant="primary"
                onClick={() => onChange({ status: "done" })}
              >
                Mark done
              </ToolbarButton>
            )}
            {task.status === "done" && (
              <ToolbarButton onClick={() => onChange({ status: "open" })}>
                Reopen
              </ToolbarButton>
            )}
            {task.status !== "skipped" && (
              <ToolbarButton onClick={() => onChange({ status: "skipped" })}>
                Skip this one
              </ToolbarButton>
            )}
          </div>
          {!task.auto && (
            <ToolbarButton variant="danger" onClick={onDelete}>
              Delete
            </ToolbarButton>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AddModal({
  day,
  onClose,
  onAdded,
}: {
  day: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<TaskCategory>("task");
  const [dueOn, setDueOn] = useState(day);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        notes: notes.trim() || undefined,
        category,
        dueOn,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "That did not save.");
      return;
    }
    onAdded();
  }

  const field = {
    borderColor: "var(--adm-line-strong)",
    background: "var(--adm-control)",
    color: "var(--adm-ink)",
  } as const;

  return (
    <Modal
      title="Add to the board"
      subtitle="Something of your own, beside what the rhythm already asks for."
      onClose={onClose}
    >
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What has to happen"
          maxLength={160}
          className="w-full rounded-[var(--adm-radius-sm)] border px-2.5 py-2 font-sans text-[13px] outline-none"
          style={field}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you will want to remember about it"
          rows={3}
          maxLength={2000}
          className="w-full rounded-[var(--adm-radius-sm)] border px-2.5 py-2 font-sans text-[12.5px] outline-none"
          style={field}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select<TaskCategory>
            value={category}
            onChange={setCategory}
            options={(Object.keys(CATEGORY) as TaskCategory[]).map((c) => ({
              value: c,
              label: CATEGORY[c].label,
              mark: CATEGORY[c].emoji,
            }))}
            ariaLabel="What kind of task"
            size="sm"
            className="w-auto"
          />
          <input
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
            className="rounded-[var(--adm-radius-sm)] border px-2 py-1.5 font-sans text-[12.5px]"
            style={field}
          />
          <Pill>
            {CATEGORY[category].emoji} {CATEGORY[category].label}
          </Pill>
        </div>
        {error && (
          <p
            role="alert"
            className="font-sans text-[12.5px]"
            style={{ color: "var(--adm-critical)" }}
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
          <ToolbarButton
            variant="primary"
            loading={busy || title.trim().length === 0}
            onClick={save}
          >
            Add it
          </ToolbarButton>
        </div>
      </div>
    </Modal>
  );
}
