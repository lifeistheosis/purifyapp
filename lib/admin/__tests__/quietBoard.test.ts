// A quiet board (his word, 2026-11-12 about 21:51 UTC, docs/plans/owner-desk.md
// section 1): "I always get email that I'm late on a bunch of stuff ... If it
// doesn't have anything to do with my input, in example, the icon box, right?
// The icon box, I need to source the items, and I'm already aware of that. And
// I give you a response on when I'm gonna reply to that ... So you can
// automate that process, right?"
//
// The morning email listed every planned task of the last six weeks with no
// sign of being done, about thirty "late" lines on a morning in a long build.
// What these hold:
//   1. the email holds only what needs his hand or his word, its subject names
//      that and never counts what is late, and a morning with nothing for him
//      sends nothing;
//   2. a task he has given a day stays silent until that day, however far off
//      the day is, and the Calendar sets it in one tap;
//   3. what the team prepares (the board message, the Sunday email, the monthly
//      note, the feast shop email) is never late in his email, nor in the
//      strip's "Still waiting on you";
//   4. shipping the update and writing the patch note are steps of a release
//      (docs/RELEASE.md), no longer weekly tasks;
//   5. a missed run is one line, "The Sunday email: not sent for 3 weeks";
//   6. each of these fails on the code before.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mergeBoard, notBeforeChoices, plannedTasks, runsOf, waitsOnHim, type BoardTask, type StoredTask } from "../planner";

// Thursday 12 November 2026. Six weeks back is 1 October.
const NOW = new Date("2026-11-12T08:30:00Z");
const TODAY = "2026-11-12";

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  evidence: new Set<string>(),
  sent: [] as { subject: string; html: string; to: string; dedupeKey: string }[],
}));

vi.mock("@/lib/admin/access", () => ({
  adminEmails: () => ["owner@example.com"],
  getAdminUser: async () => ({ email: "owner@example.com" }),
}));
vi.mock("@/lib/admin/plannerEvidence", () => ({ plannerEvidence: async () => state.evidence }));
vi.mock("@/lib/shop/catalog", () => ({ listProducts: async () => [] }));
vi.mock("@/lib/email/ledger", () => ({
  sendEmailOnce: async (_admin: unknown, msg: { subject: string; html: string; to: string; dedupeKey: string }) => {
    state.sent.push(msg);
    return { status: "sent" };
  },
}));

/** A stand-in for the admin client that honours the filters the reads use, so a row outside them is not seen. */
function fakeAdmin() {
  return {
    from(table: string) {
      const filters: ((r: Record<string, unknown>) => boolean)[] = [];
      let limit = Infinity;
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.gte = (col: string, v: string) => (filters.push((r) => String(r[col]) >= v), q);
      q.lte = (col: string, v: string) => (filters.push((r) => String(r[col]) <= v), q);
      q.in = (col: string, vs: string[]) => (filters.push((r) => vs.includes(String(r[col]))), q);
      q.eq = (col: string, v: unknown) => (filters.push((r) => r[col] === v), q);
      q.order = () => q;
      q.limit = (n: number) => ((limit = n), q);
      q.then = <T,>(resolve: (a: { data: unknown[]; error: null }) => T) => {
        const rows = table === "admin_tasks" ? state.rows.filter((r) => filters.every((f) => f(r))).slice(0, limit) : [];
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      };
      return q;
    },
  };
}
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeAdmin() }));

import { sendPlannerDigest } from "../plannerDigest";
import { GET as dueGET } from "@/app/api/admin/planner/due/route";

const row = (over: Partial<StoredTask> & { rule_key: string | null; due_on: string }): StoredTask & Record<string, unknown> => ({
  id: `row-${over.rule_key ?? over.title}`,
  title: over.rule_key ?? "A task",
  notes: null,
  category: "eikon",
  status: "open",
  auto: true,
  ...over,
});

// What the board's rhythm holds between 1 October and today: the EIKON Box's
// four (opened on the 1st of October and November, the November and December
// drops created on the 20th of September's and October's months; only the
// ones in the six weeks count) and the team's: six board messages and six
// Sunday emails, two monthly notes and the Nativity Fast's feast shop email.
const EIKON_DONE = ["eikon-create:2026-12"];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  state.rows = [];
  state.evidence = new Set(EIKON_DONE);
  state.sent = [];
});

describe("the weekly plan", () => {
  it("keeps the board message and the Sunday email, and no longer ships an update or writes the note (point 4)", () => {
    const keys = plannedTasks("2026-11-09", "2026-11-15").map((t) => t.ruleKey);
    expect(keys).toContain("board:2026-W46");
    expect(keys).toContain("email-weekly:2026-W46");
    expect(keys.some((k) => k.startsWith("update:") || k.startsWith("notes:"))).toBe(false);
  });

  it("drops a stored row left from a retired weekly step, so an old mark cannot come back as late", () => {
    const board = mergeBoard({
      planned: plannedTasks("2026-11-09", "2026-11-15"),
      stored: [row({ rule_key: "update:2026-W45", due_on: "2026-11-06", category: "update" })],
      evidence: new Set(),
    });
    expect(board.some((t) => t.ruleKey?.startsWith("update:"))).toBe(false);
  });
});

describe("whose a task is", () => {
  const task = (ruleKey: string | null): Pick<BoardTask, "ruleKey"> => ({ ruleKey });
  it("gives the team what it prepares, and him the EIKON Box, the drop's steps and anything a person added", () => {
    for (const k of ["board:2026-W46", "email-weekly:2026-W46", "email-monthly:2026-11", "shop-feast:nativity-2026"]) expect(waitsOnHim(task(k)), k).toBe(false);
    for (const k of ["eikon-open:2026-11", "eikon-create:2026-12", "drop:1.9:m:announce", "release:1.9", null]) expect(waitsOnHim(task(k)), String(k)).toBe(true);
  });
});

describe("a missed run is one line (point 5)", () => {
  const open = (ruleKey: string, dueOn: string, title = ruleKey): BoardTask => ({
    id: null, ruleKey, title, notes: "", category: "email", dueOn, status: "open", byItself: false, auto: true,
  });

  it("says how long, never one line a week", () => {
    const runs = runsOf([
      open("email-weekly:2026-W43", "2026-10-25", "Send the Sunday calendar email"),
      open("email-weekly:2026-W44", "2026-11-01", "Send the Sunday calendar email"),
      open("email-weekly:2026-W45", "2026-11-08", "Send the Sunday calendar email"),
      open("eikon-open:2026-11", "2026-11-01", "Open this month's EIKON Box drop"),
      { ...open("own", "2026-11-03", "Call the supplier"), ruleKey: null, auto: false },
    ]);
    expect(runs.map((r) => r.line)).toEqual([
      "The Sunday email: not sent for 3 weeks",
      "Open this month's EIKON Box drop",
      "Call the supplier",
    ]);
    expect(runs[0].tasks).toHaveLength(3);
    expect(runs[0].since).toBe("2026-10-25");
  });
});

describe("not before a day, in one tap (point 2)", () => {
  it("offers tomorrow, next week and next month, each a day the board can keep", () => {
    expect(notBeforeChoices(TODAY)).toEqual([
      { label: "Tomorrow", day: "2026-11-13" },
      { label: "Next week", day: "2026-11-16" },
      { label: "Next month", day: "2026-12-01" },
    ]);
  });

  it("is in the Calendar's task window, one tap each, beside the day field", () => {
    const src = readFileSync(join(process.cwd(), "components/admin/planner/PlanBoard.tsx"), "utf8");
    expect(src).toContain("notBeforeChoices(");
    expect(src).toContain("Not before");
    expect(src).toContain("runsOf(");
  });
});

describe("the morning email", () => {
  it("sends nothing on a morning when only the team's work is behind (points 1 and 3)", async () => {
    state.evidence = new Set([...EIKON_DONE, "eikon-open:2026-10", "eikon-open:2026-11", "eikon-create:2026-11"]);
    const report = await sendPlannerDigest(fakeAdmin() as never, NOW);
    expect(state.sent).toHaveLength(0);
    expect(report.sent).toBe(false);
  });

  it("holds only what needs him, names it in the subject, and never counts what is late (point 1)", async () => {
    state.rows = [row({ rule_key: null, id: "own-1", title: "Sign the supplier's terms", category: "task", due_on: TODAY, auto: false })];
    await sendPlannerDigest(fakeAdmin() as never, NOW);
    expect(state.sent).toHaveLength(1);
    const { subject, html } = state.sent[0];
    expect(subject).toMatch(/^Needs you: /);
    expect(subject).not.toMatch(/late|\d+ due/i);
    expect(html).toContain("Sign the supplier&#39;s terms");
    expect(html).toContain("EIKON Box");
    // The team's work is not in it.
    for (const t of ["board message", "Sunday", "monthly note", "feast shop"]) expect(html).not.toContain(t);
  });

  it("puts a missed run of the EIKON Box on one line (point 5)", async () => {
    await sendPlannerDigest(fakeAdmin() as never, NOW);
    const { html, subject } = state.sent[0];
    expect(html).toContain("The EIKON Box drop: not opened for 2 months");
    expect(html.match(/Open this month&#39;s EIKON Box drop/g)).toBeNull();
    // One colon in a subject: the run's own becomes a comma there.
    expect(subject).toBe("Needs you: the EIKON Box drop, not opened for 2 months, and one more");
  });

  it("stays silent about a task he has given a day until that day, however far off (point 2)", async () => {
    state.rows = [
      row({ rule_key: "eikon-open:2026-10", due_on: "2026-11-18" }),
      row({ rule_key: "eikon-open:2026-11", due_on: "2026-11-18" }),
      // Past the week the email used to read ahead, so it lost the row and the
      // task came back late on its planned day.
      row({ rule_key: "eikon-create:2026-11", due_on: "2026-12-20" }),
    ];
    const report = await sendPlannerDigest(fakeAdmin() as never, NOW);
    expect(state.sent).toHaveLength(0);
    expect(report.reason).toBe("nothing needs him");
  });
});

// The arbiter's close of the one risk the quiet board left (2026-11-12): with
// the team's pieces gone from his email, nothing told anyone they were due.
// So on its own day, and only then, each is a line under "Ready to send" with
// the link that sends it.
describe("Ready to send", () => {
  // Sunday 15 November 2026: this week's Sunday email is due today, and last
  // week's Sunday email and this Monday's board message were missed.
  const SUNDAY = new Date("2026-11-15T08:30:00Z");
  const HIS_DONE = ["eikon-open:2026-10", "eikon-open:2026-11", "eikon-create:2026-11", "eikon-create:2026-12"];

  it("names the team's piece on its own day, with the link that sends it, and sends for it alone", async () => {
    vi.setSystemTime(SUNDAY);
    state.evidence = new Set(HIS_DONE);
    await sendPlannerDigest(fakeAdmin() as never, SUNDAY);
    expect(state.sent).toHaveLength(1);
    const { subject, html } = state.sent[0];
    expect(subject).toBe("Ready to send: the Sunday email");
    expect(html).toContain("Ready to send");
    expect(html).toContain('/admin#tab=email">send it</a>');
    // Never as late, never again on a later day: the missed ones are not in it.
    expect(html).not.toContain("board message");
    expect(html.match(/The Sunday email/g)).toHaveLength(1);
    expect(html).not.toMatch(/late|not sent for/i);
    // The board opens on the board: the panel reads #tab=, never ?tab=.
    expect(html).toContain('/admin#tab=calendar"');
  });

  it("puts what needs him first, and the ready piece under it", async () => {
    vi.setSystemTime(SUNDAY);
    await sendPlannerDigest(fakeAdmin() as never, SUNDAY);
    const { subject, html } = state.sent[0];
    expect(subject).toMatch(/^Needs you: /);
    expect(html.indexOf("The EIKON Box drop")).toBeLessThan(html.indexOf("Ready to send"));
    expect(html).toContain("The Sunday email");
  });
});

describe("the strip's \"Still waiting on you\" (points 2 and 3)", () => {
  it("counts only what needs him, and nothing he has given a later day", async () => {
    state.rows = [row({ rule_key: "eikon-create:2026-11", due_on: "2026-12-20" })];
    const body = (await (await dueGET()).json()) as { overdue: number; today: number };
    // Left: the October and November openings. The team's dozen are not his.
    expect(body).toMatchObject({ overdue: 2, today: 0 });
  });
});
