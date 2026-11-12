import { feastDrops } from "@/lib/shop/feasts";
import type { ShopProductFull } from "@/lib/shop/types";
import { isoWeekOf } from "@/lib/whatsNew/boardShape";

/**
 * The week's work, generated from Purify's own rhythm.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * The things that must happen every week happen on their own days: the board
 * message on Monday, the Sunday calendar email on Sunday. Every month adds the
 * monthly note and the EIKON Box drop, and twice a year a feast window opens
 * the shop's one seasonal email. None of that was written down anywhere.
 *
 * Shipping the update and writing its patch note were weekly tasks here until
 * 2026-11-12. They are steps of a release now (docs/RELEASE.md), so they left
 * the week (his word that day, docs/plans/owner-desk.md section 1: a quiet
 * board), and a row kept from them no longer comes back (RETIRED_RULES).
 *
 * These rules produce that list for any span of days. Nothing here reads a
 * database or a clock it was not given: rules in, dated tasks out, so the
 * board, the reminder strip and the daily digest all say the same thing.
 *
 * A generated task carries a `ruleKey` that is stable for its period
 * ("email-weekly:2026-W38"), which is what lets the owner mark one done, and
 * what lets the app notice it is already done: lib/admin/plannerEvidence.ts
 * looks for the work itself (a published board message, a sent campaign, an
 * open drop) and ticks the task without anybody pressing anything.
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
 * The feast shop emails, as a day to send by (lib/shop/feasts.ts): a week
 * before the Nativity Fast opens (November 15, new calendar) and a week before
 * Pascha, as always, and two weeks before each great feast the shop has a piece
 * for, never two within three weeks. The same drops lib/email/campaignDrafts.ts
 * writes the email for, so the task and the draft always name the same feast.
 *
 * `products` is the live catalogue. Without it only the two windows are
 * planned, which is what the board did before great feasts were added.
 */
function feastTasks(from: string, to: string, products: readonly ShopProductFull[]): PlannedTask[] {
  const out: PlannedTask[] = [];
  for (const drop of feastDrops([Number(from.slice(0, 4)), Number(to.slice(0, 4))], products)) {
    const due = drop.sendBy.toISOString().slice(0, 10);
    if (due < from || due > to) continue;
    const titles = drop.pieces.slice(0, 3).map((p) => p.title).join("; ");
    out.push({
      ruleKey: `shop-feast:${drop.periodKey}`,
      title: "Send the feast shop email",
      notes:
        drop.kind === "window"
          ? `A week before ${drop.key === "nativity" ? "the Nativity Fast begins" : "Pascha"}. The draft is waiting in the Email tab.`
          : `Two weeks before the feast: ${drop.name}. The shop has ${drop.pieces.length === 1 ? "a piece" : `${drop.pieces.length} pieces`} for it (${titles}). The draft is waiting in the Email tab.`,
      category: "shop",
      dueOn: due,
    });
  }
  return out;
}

/**
 * Every deadline Purify's rhythm puts between `from` and `to` (inclusive),
 * oldest first. Pure.
 */
export function plannedTasks(
  rangeFrom: string,
  to: string,
  /** The live catalogue, so great-feast emails are planned only when the shop has a piece. */
  products: readonly ShopProductFull[] = [],
): PlannedTask[] {
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

  out.push(...feastTasks(from, to, products));
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
  // A row kept from a step that left the plan (RETIRED_RULES) is not on the board.
  const stored = opts.stored.filter((s) => !RETIRED_RULES.has(ruleFamily(s.rule_key) ?? ""));
  const byRule = new Map(stored.flatMap((s) => (s.rule_key ? [[s.rule_key, s] as const] : [])));
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
  for (const s of stored) {
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

// ── A quiet board ─────────────────────────────────────────────────────────
//
// His word, 2026-11-12 about 21:51 UTC (docs/plans/owner-desk.md, section 1):
// "I always get email that I'm late on a bunch of stuff ... If it doesn't have
// anything to do with my input, in example, the icon box, right? The icon box,
// I need to source the items, and I'm already aware of that. And I give you a
// response on when I'm gonna reply to that ... So you can automate that
// process, right?" So the board tells the team's work from his, a task he has
// given a day ("not before") keeps quiet until it, and a run of missed weeks
// is said once.

/** The family a rule belongs to: "email-weekly" for "email-weekly:2026-W46". Null for a task a person added. */
export const ruleFamily = (ruleKey: string | null): string | null => (ruleKey ? ruleKey.split(":")[0] : null);

/** Steps that left the weekly plan for the release's own checklist (docs/RELEASE.md). */
export const RETIRED_RULES: ReadonlySet<string> = new Set(["notes", "update"]);

/**
 * What the team prepares: the board message, the Sunday email, the monthly
 * note and the feast shop email. Never late in his email; it reaches him ready
 * (the plan's section 2). Everything else on the board waits on him: the
 * EIKON Box, which he sources and opens, a drop's steps (lib/drop/live.ts),
 * and any task a person put there.
 */
export const TEAM_RULES: ReadonlySet<string> = new Set(["board", "email-weekly", "email-monthly", "shop-feast"]);

/** Whether a task needs his hand or his word. */
export function waitsOnHim(t: Pick<BoardTask, "ruleKey">): boolean {
  const family = ruleFamily(t.ruleKey);
  return family === null || !TEAM_RULES.has(family);
}

/** How a run of one rhythm is said when more than one of it was missed. */
const RUN_WORDS: Record<string, { name: string; missed: string; unit: [string, string] }> = {
  board: { name: "The board message", missed: "not posted", unit: ["week", "weeks"] },
  "email-weekly": { name: "The Sunday email", missed: "not sent", unit: ["week", "weeks"] },
  "email-monthly": { name: "The monthly note", missed: "not sent", unit: ["month", "months"] },
  "eikon-open": { name: "The EIKON Box drop", missed: "not opened", unit: ["month", "months"] },
  "eikon-create": { name: "The next EIKON Box drop", missed: "not created", unit: ["month", "months"] },
  "shop-feast": { name: "The feast shop email", missed: "not sent", unit: ["feast", "feasts"] },
};

export type Run = {
  /** The rhythm's family, or the one task's own key when it is no run. */
  key: string;
  /** The open tasks it holds, oldest first. */
  tasks: BoardTask[];
  /** "The Sunday email: not sent for 3 weeks", or the one task's own title. */
  line: string;
  /** The day of the oldest. */
  since: string;
};

/**
 * Open tasks as lines: every open task of one rhythm in a single line that
 * says how long ("The Sunday email: not sent for 3 weeks"), never one line a
 * week; a task of no rhythm, or the only one of its rhythm, as itself. Oldest
 * first.
 */
export function runsOf(tasks: readonly BoardTask[]): Run[] {
  const groups = new Map<string, BoardTask[]>();
  for (const t of tasks) {
    if (t.status !== "open") continue;
    const family = ruleFamily(t.ruleKey);
    const key = family && RUN_WORDS[family] ? family : `task:${t.id ?? t.ruleKey ?? t.title}:${t.dueOn}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const runs = [...groups.entries()].map(([key, list]): Run => {
    const sorted = [...list].sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));
    const words = RUN_WORDS[key];
    const line =
      words && sorted.length > 1
        ? `${words.name}: ${words.missed} for ${sorted.length} ${words.unit[1]}`
        : sorted[0].title;
    return { key, tasks: sorted, line, since: sorted[0].dueOn };
  });
  return runs.sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : a.line < b.line ? -1 : 1));
}

/**
 * The days "not before" can be set to in one tap, from `today`: tomorrow, the
 * next Monday and the first of next month. A task given one of them is due on
 * it, so it keeps quiet until then; a day of his own is the field beside them.
 */
export function notBeforeChoices(today: string): { label: string; day: string }[] {
  return [
    { label: "Tomorrow", day: addDays(today, 1) },
    { label: "Next week", day: addDays(weekStart(today), 7) },
    { label: "Next month", day: `${nextMonth(today.slice(0, 7))}-01` },
  ];
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/**
 * The morning email, as words: the lines that need him today and the subject
 * that names them, or null when nothing does (and then nothing is sent). Only
 * open tasks due today or before, only his (waitsOnHim), and a run said once.
 * The subject never counts what is late: it names the first line and says how
 * many more there are.
 */
export function morningMail(
  tasks: readonly BoardTask[],
  today: string,
): { subject: string; lines: { text: string; when: string | null; run: boolean }[] } | null {
  const mine = tasks.filter((t) => t.status === "open" && t.dueOn <= today && waitsOnHim(t));
  if (mine.length === 0) return null;
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const lines = runsOf(mine).map((r) => ({
    text: r.line,
    run: r.tasks.length > 1,
    when: r.tasks.length > 1 ? null : r.since === today ? "today" : `since ${day(r.since)}`,
  }));
  const first = lines[0].text.replace(": ", ", ");
  const lead = /^[A-Z][a-z]/.test(first) ? first.charAt(0).toLowerCase() + first.slice(1) : first;
  const more = lines.length - 1;
  const rest = more === 0 ? "" : `, and ${NUMBER_WORDS[more] ?? String(more)} more`;
  return { subject: `Needs you: ${lead}${rest}`, lines };
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
