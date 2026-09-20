import { orthodoxPascha } from "@/lib/calendar/orthodox";
import { isoWeekOf } from "@/lib/whatsNew/boardShape";

/**
 * The week's work, generated from Purify's own rhythm.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * The things that must happen every week happen on their own days: the board
 * message on Monday, the note written by Thursday, the update shipped before
 * the week ends, the Sunday calendar email on Sunday. Every month adds the
 * monthly note and the EIKON Box drop, and twice a year a feast window opens
 * the shop's one seasonal email. None of that was written down anywhere, so
 * "ship before the end of the week" only existed as a memory.
 *
 * These rules produce that list for any span of days. Nothing here reads a
 * database or a clock it was not given: rules in, dated tasks out, so the
 * board, the reminder strip and the daily digest all say the same thing.
 *
 * A generated task carries a `ruleKey` that is stable for its period
 * ("update:2026-W38"), which is what lets the owner mark one done, and what
 * lets the app notice it is already done: lib/admin/plannerEvidence.ts looks
 * for the work itself (a published note, a sent campaign, an open drop) and
 * ticks the task without anybody pressing anything.
 */

export type TaskCategory = "update" | "notes" | "board" | "email" | "shop" | "eikon" | "task";

export const CATEGORY: Record<TaskCategory, { label: string; emoji: string }> = {
  update: { label: "Update", emoji: "🚀" },
  notes: { label: "Patch note", emoji: "📝" },
  board: { label: "Board message", emoji: "📌" },
  email: { label: "Email", emoji: "✉️" },
  shop: { label: "Shop", emoji: "🛍️" },
  eikon: { label: "EIKON Box", emoji: "📦" },
  task: { label: "Task", emoji: "✅" },
};

export function isTaskCategory(x: unknown): x is TaskCategory {
  return typeof x === "string" && x in CATEGORY;
}

/**
 * The first day the board covers.
 *
 * The rules describe a rhythm that has always been true, so asked for last
 * month they produce a month of deadlines nobody was ever shown, all of them
 * instantly late. A board that opens with twenty red items is one nobody
 * reads. So nothing is generated before the week the board shipped, and the
 * history stays empty rather than retroactively failed.
 */
export const BOARD_START = "2026-09-14";

export type PlannedTask = {
  ruleKey: string;
  title: string;
  notes: string;
  category: TaskCategory;
  /** The day it is due, YYYY-MM-DD. */
  dueOn: string;
};

export const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  return isoDay(new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000));
}

/** The Monday of the week `iso` falls in. */
export function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay() || 7; // Sunday is 7, so a week runs Monday to Sunday
  return addDays(iso, 1 - day);
}

export function weekDays(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i));
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** "2026-09" to "September 2026". */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function nextMonth(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Each Monday from `from` back far enough to cover a week that started earlier. */
function mondaysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = weekStart(from); m <= to; m = addDays(m, 7)) out.push(m);
  return out;
}

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let ym = from.slice(0, 7); ym <= to.slice(0, 7); ym = nextMonth(ym)) out.push(ym);
  return out;
}

/**
 * The feast windows the shop email is written for, as a day to send by: a week
 * before the Nativity Fast opens (November 15, new calendar) and a week before
 * Pascha. Same two moments lib/email/campaignDrafts.ts writes the email for.
 */
function feastTasks(from: string, to: string): PlannedTask[] {
  const out: PlannedTask[] = [];
  for (const year of new Set([Number(from.slice(0, 4)), Number(to.slice(0, 4))])) {
    const windows: [string, string, string][] = [
      ["nativity", `${year}-11-15`, "the Nativity Fast begins"],
      ["pascha", isoDay(orthodoxPascha(year)), "Pascha"],
    ];
    for (const [feast, day, what] of windows) {
      const due = addDays(day, -7);
      if (due < from || due > to) continue;
      out.push({
        ruleKey: `shop-feast:${feast}-${year}`,
        title: "Send the feast shop email",
        notes: `A week before ${what}. The shop list only gets two of these a year, so this is the one.`,
        category: "shop",
        dueOn: due,
      });
    }
  }
  return out;
}

/**
 * Every deadline Purify's rhythm puts between `from` and `to` (inclusive),
 * oldest first. Pure.
 */
export function plannedTasks(rangeFrom: string, to: string): PlannedTask[] {
  const from = rangeFrom < BOARD_START ? BOARD_START : rangeFrom;
  const out: PlannedTask[] = [];
  if (from > to) return out;

  for (const monday of mondaysBetween(from, to)) {
    const week = isoWeekOf(monday);
    const on = (offset: number) => addDays(monday, offset);
    const weekly: PlannedTask[] = [
      {
        ruleKey: `board:${week}`,
        title: "Post this week's board message",
        notes: "The short message above the patch notes on /whats-new. Written in the Patch notes tab.",
        category: "board",
        dueOn: on(0),
      },
      {
        ruleKey: `notes:${week}`,
        title: "Write this week's patch note",
        notes: "Draft it before the update ships, so the note is what the work was for and not a memory of it.",
        category: "notes",
        dueOn: on(3),
      },
      {
        ruleKey: `update:${week}`,
        title: "Ship this week's update",
        notes: "Before the week ends. A published patch note is what marks this done.",
        category: "update",
        dueOn: on(4),
      },
      {
        ruleKey: `email-weekly:${week}`,
        title: "Send the Sunday calendar email",
        notes: "The week ahead, to the readers who asked for the library list.",
        category: "email",
        dueOn: on(6),
      },
    ];
    for (const t of weekly) if (t.dueOn >= from && t.dueOn <= to) out.push(t);
  }

  for (const ym of monthsBetween(from, to)) {
    const monthly: PlannedTask[] = [
      {
        ruleKey: `email-monthly:${ym}`,
        title: "Send the monthly note",
        notes: `What was added to the library in ${monthLabel(ym)}, counted.`,
        category: "email",
        dueOn: `${ym}-01`,
      },
      {
        ruleKey: `eikon-open:${ym}`,
        title: "Open this month's EIKON Box drop",
        notes: "Open it, then announce it. Opening is not announcing.",
        category: "eikon",
        dueOn: `${ym}-01`,
      },
      {
        ruleKey: `eikon-create:${nextMonth(ym)}`,
        title: `Create the ${monthLabel(nextMonth(ym))} EIKON Box drop`,
        notes: "Sourcing takes weeks. The draft exists before the month it belongs to.",
        category: "eikon",
        dueOn: `${ym}-20`,
      },
    ];
    for (const t of monthly) if (t.dueOn >= from && t.dueOn <= to) out.push(t);
  }

  out.push(...feastTasks(from, to));
  return out.sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : a.ruleKey < b.ruleKey ? -1 : 1));
}

export type TaskStatus = "open" | "done" | "skipped";

export type BoardTask = {
  /** The stored row's id, absent for a generated task nobody has touched. */
  id: string | null;
  ruleKey: string | null;
  title: string;
  notes: string;
  category: TaskCategory;
  dueOn: string;
  status: TaskStatus;
  /** True when the app decided it was done by finding the work itself. */
  byItself: boolean;
  /** True when the rhythm generated it, rather than a person. */
  auto: boolean;
};

export type StoredTask = {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  due_on: string;
  status: TaskStatus;
  rule_key: string | null;
  auto: boolean;
};

/**
 * One list from the three sources: what the rhythm asks for, what is stored
 * (a task someone added, or a generated one they marked), and the evidence
 * that a generated task is already done.
 *
 * A stored row wins over the rule it came from, except that evidence still
 * ticks an open one: finding the published note is a better answer than
 * waiting to be told.
 */
export function mergeBoard(opts: {
  planned: readonly PlannedTask[];
  stored: readonly StoredTask[];
  evidence: ReadonlySet<string>;
}): BoardTask[] {
  const byRule = new Map(opts.stored.flatMap((s) => (s.rule_key ? [[s.rule_key, s] as const] : [])));
  const merged = new Set<string>();
  const out: BoardTask[] = [];

  for (const p of opts.planned) {
    const s = byRule.get(p.ruleKey);
    if (s) merged.add(p.ruleKey);
    const done = opts.evidence.has(p.ruleKey);
    const status: TaskStatus = s ? (s.status === "open" && done ? "done" : s.status) : done ? "done" : "open";
    const category = s && isTaskCategory(s.category) ? s.category : p.category;
    out.push({
      id: s?.id ?? null,
      ruleKey: p.ruleKey,
      title: s?.title ?? p.title,
      notes: s?.notes ?? p.notes,
      category,
      dueOn: s?.due_on ?? p.dueOn,
      status,
      byItself: done && (!s || s.status === "open"),
      auto: true,
    });
  }

  // Tasks somebody added, and stored rows whose rule falls outside this span
  // (a deadline moved into the week from somewhere else).
  for (const s of opts.stored) {
    if (s.rule_key && merged.has(s.rule_key)) continue;
    out.push({
      id: s.id,
      ruleKey: s.rule_key,
      title: s.title,
      notes: s.notes ?? "",
      category: isTaskCategory(s.category) ? s.category : "task",
      dueOn: s.due_on,
      status: s.status,
      byItself: false,
      auto: s.auto,
    });
  }

  return out.sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : a.title < b.title ? -1 : 1));
}

/** What the strip and the digest say: what is late, and what is due today. */
export function dueSummary(tasks: readonly BoardTask[], today: string) {
  const open = tasks.filter((t) => t.status === "open");
  return {
    overdue: open.filter((t) => t.dueOn < today),
    today: open.filter((t) => t.dueOn === today),
    later: open.filter((t) => t.dueOn > today),
    done: tasks.filter((t) => t.status === "done"),
  };
}
