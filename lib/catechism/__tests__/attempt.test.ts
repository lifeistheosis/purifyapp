import { describe, expect, it, vi } from "vitest";

import {
  DATE_TOLERANCE_DAYS,
  attemptSchema,
  handleAttempt,
  type AttemptDeps,
  type AttemptRow,
} from "../attempt";
import { addDaysIso } from "../dates";
import { pickDaily } from "../select";
import { makeBank, quietCalendar } from "./fixture";

const USER = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const TODAY = "2026-09-05";

/** An in-memory quiz_attempts with the unique (user_id, date, reckoning) key. */
function memoryTable() {
  const rows: AttemptRow[] = [];
  return {
    rows,
    insert: async (row: AttemptRow) => {
      const dup = rows.some(
        (r) => r.user_id === row.user_id && r.date === row.date && r.reckoning === row.reckoning,
      );
      if (dup) return { error: { code: "23505", message: "duplicate key" } };
      rows.push(row);
      return { error: null };
    },
  };
}

function deps(over: Partial<AttemptDeps> = {}): AttemptDeps & { table: ReturnType<typeof memoryTable> } {
  const table = memoryTable();
  return {
    bank: makeBank(40),
    today: TODAY,
    insert: table.insert,
    bump: vi.fn(async () => {}),
    calendar: quietCalendar,
    table,
    ...over,
  };
}

function bodyFor(d: AttemptDeps, date = TODAY, count = 5) {
  const set = pickDaily(d.bank, date, "new", d.calendar);
  const byId = new Map(d.bank.map((q) => [q.id, q]));
  return {
    id: ID,
    date,
    reckoning: "new" as const,
    answers: set.slice(0, count).map((question_id) => {
      const q = byId.get(question_id)!;
      const answer =
        q.type === "multiple_choice" ? (q.answer as number) : q.type === "true_false" ? (q.answer as boolean) : "theotokos";
      return { question_id, answer };
    }),
  };
}

describe("attempt schema", () => {
  it("accepts the three answer shapes and refuses the rest", () => {
    const ok = attemptSchema.safeParse(bodyFor(deps()));
    expect(ok.success).toBe(true);
    expect(attemptSchema.safeParse({ ...bodyFor(deps()), date: "Sept 5" }).success).toBe(false);
    expect(attemptSchema.safeParse({ ...bodyFor(deps()), reckoning: "julian" }).success).toBe(false);
    expect(attemptSchema.safeParse({ ...bodyFor(deps()), answers: [] }).success).toBe(false);
    const six = bodyFor(deps());
    six.answers = [...six.answers, six.answers[0]];
    expect(attemptSchema.safeParse(six).success).toBe(false);
  });
});

describe("handleAttempt", () => {
  it("grades against the bank and records the score", async () => {
    const d = deps();
    const r = await handleAttempt(d, bodyFor(d), USER);
    expect(r).toEqual({ ok: true, status: 200, score: 5, total: 5 });
    expect(d.table.rows).toHaveLength(1);
    expect(d.table.rows[0].user_id).toBe(USER);
    expect(d.table.rows[0].answers.every((a) => a.correct)).toBe(true);
    expect(d.bump).toHaveBeenCalledWith(
      d.table.rows[0].answers.map((a) => a.question_id),
      d.table.rows[0].answers.map((a) => a.question_id),
    );
  });

  it("scores a wrong answer as wrong, whatever the client said", async () => {
    const d = deps();
    const body = bodyFor(d);
    body.answers[0] = { ...body.answers[0], answer: "not the word" };
    const r = await handleAttempt(d, body, USER);
    expect(r.ok && r.score).toBe(4);
  });

  it("rejects a second attempt for the same day", async () => {
    const d = deps();
    expect((await handleAttempt(d, bodyFor(d), USER)).status).toBe(200);
    const again = await handleAttempt(d, { ...bodyFor(d), id: "33333333-3333-4333-8333-333333333333" }, USER);
    expect(again).toEqual({ ok: false, status: 409, error: "already recorded" });
    expect(d.table.rows).toHaveLength(1);
  });

  it("allows the other reckoning on the same day", async () => {
    const d = deps();
    expect((await handleAttempt(d, bodyFor(d), USER)).status).toBe(200);
    const set = pickDaily(d.bank, TODAY, "old", d.calendar);
    const r = await handleAttempt(
      d,
      {
        id: "33333333-3333-4333-8333-333333333333",
        date: TODAY,
        reckoning: "old",
        answers: [{ question_id: set[0], answer: true }],
      },
      USER,
    );
    expect(r.status).toBe(200);
  });

  it("rejects answers longer than the set", async () => {
    const d = deps({ bank: makeBank(3) });
    const body = bodyFor(d, TODAY, 3);
    body.answers = [
      ...body.answers,
      { question_id: "44444444-4444-4444-8444-444444444444", answer: 0 },
    ];
    const r = await handleAttempt(d, body, USER);
    expect(r).toEqual({ ok: false, status: 400, error: "answers longer than the set" });
    expect(d.table.rows).toHaveLength(0);
  });

  it("rejects an answer to a question outside the day's set, or given twice", async () => {
    const d = deps();
    const body = bodyFor(d, TODAY, 4);
    body.answers[3] = { question_id: "44444444-4444-4444-8444-444444444444", answer: 0 };
    expect((await handleAttempt(d, body, USER)).status).toBe(400);
    const twice = bodyFor(d, TODAY, 4);
    twice.answers[3] = twice.answers[0];
    expect((await handleAttempt(d, twice, USER)).status).toBe(400);
  });

  it("rejects a date outside the tolerance", async () => {
    const d = deps();
    const far = addDaysIso(TODAY, -(DATE_TOLERANCE_DAYS + 1));
    expect((await handleAttempt(d, bodyFor(d, far), USER)).status).toBe(400);
    const near = addDaysIso(TODAY, -DATE_TOLERANCE_DAYS);
    expect((await handleAttempt(d, bodyFor(d, near), USER)).status).toBe(200);
  });

  it("answers 503 when the table is not there", async () => {
    const d = deps({
      insert: async () => ({
        error: { code: "PGRST205", message: "Could not find the table 'public.quiz_attempts' in the schema cache" },
      }),
    });
    expect(await handleAttempt(d, bodyFor(d), USER)).toEqual({ ok: false, status: 503, error: "unavailable" });
    expect(d.bump).not.toHaveBeenCalled();
  });

  it("records the day's set when asked, and survives that failing", async () => {
    const recordDaily = vi.fn(async () => {
      throw new Error("no table");
    });
    const d = deps({ recordDaily });
    const r = await handleAttempt(d, bodyFor(d), USER);
    expect(r.status).toBe(200);
    expect(recordDaily).toHaveBeenCalledWith(TODAY, "new", pickDaily(d.bank, TODAY, "new", d.calendar));
  });
});
