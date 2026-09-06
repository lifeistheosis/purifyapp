// The progress route's rule: progress never decreases, and a completion is
// never revoked when the bank grows.

import { describe, expect, it } from "vitest";

import type { Collection } from "../collections";
import {
  applyProgress,
  handleProgress,
  progressSchema,
  type ProgressDeps,
  type ProgressRow,
} from "../progress";
import { fixtureId, makeBank } from "./fixture";

const USER = "11111111-1111-4111-8111-111111111111";
const TODAY = "2026-09-05";
const NOW = new Date("2026-09-05T12:00:00.000Z");

// Fixture tags cycle creed, saints, scripture, councils, prayer, so in a
// bank of 10 the creed questions are 0 and 5.
const creed: Collection = {
  slug: "the-creed",
  name: "The Creed",
  description: "Line by line.",
  tag: "creed",
  theme_id: "councils",
  sort_order: 1,
};

function memoryTable(seed: ProgressRow[] = []) {
  const rows = [...seed];
  return {
    rows,
    read: async (slugs: string[]) => ({
      rows: rows.filter((r) => r.user_id === USER && slugs.includes(r.slug)),
      error: null,
    }),
    upsert: async (incoming: ProgressRow[]) => {
      for (const r of incoming) {
        const i = rows.findIndex((x) => x.user_id === r.user_id && x.slug === r.slug);
        if (i >= 0) rows[i] = r;
        else rows.push(r);
      }
      return { error: null };
    },
  };
}

function deps(over: Partial<ProgressDeps> = {}, seed: ProgressRow[] = []) {
  const table = memoryTable(seed);
  return {
    deps: {
      collections: [creed],
      bank: makeBank(10),
      today: TODAY,
      read: table.read,
      upsert: table.upsert,
      now: NOW,
      ...over,
    } as ProgressDeps,
    table,
  };
}

describe("progressSchema", () => {
  it("wants at least one entry with at least one uuid", () => {
    expect(progressSchema.safeParse({ entries: [] }).success).toBe(false);
    expect(progressSchema.safeParse({ entries: [{ slug: "x", question_ids: [] }] }).success).toBe(false);
    expect(progressSchema.safeParse({ entries: [{ slug: "X", question_ids: [fixtureId(0)] }] }).success).toBe(false);
    expect(progressSchema.safeParse({ entries: [{ slug: "x", question_ids: [fixtureId(0)] }] }).success).toBe(true);
  });
});

describe("applyProgress", () => {
  it("keeps only ids that carry the tag, and unions", () => {
    const bank = makeBank(10);
    const first = applyProgress(creed, bank, TODAY, null, [fixtureId(0), fixtureId(1)], USER, NOW);
    expect(first.row.correct_question_ids).toEqual([fixtureId(0)]);
    expect(first.state).toEqual({ slug: "the-creed", done: 1, total: 2, completed_at: null });

    const second = applyProgress(creed, bank, TODAY, first.row, [fixtureId(5)], USER, NOW);
    expect(second.row.correct_question_ids).toEqual([fixtureId(0), fixtureId(5)]);
    expect(second.state.completed_at).toBe(NOW.toISOString());
  });

  it("never decreases: an empty or repeated send leaves the set as it was", () => {
    const bank = makeBank(10);
    const row: ProgressRow = {
      user_id: USER,
      slug: "the-creed",
      correct_question_ids: [fixtureId(0), fixtureId(5)],
      completed_at: "2026-09-01T00:00:00.000Z",
    };
    const again = applyProgress(creed, bank, TODAY, row, [fixtureId(0)], USER, NOW);
    expect(again.row.correct_question_ids).toEqual(row.correct_question_ids);
    expect(again.row.completed_at).toBe(row.completed_at);
  });

  it("keeps a retired question's id, because the answer was right when given", () => {
    const bank = makeBank(10, (i) => (i === 5 ? { retired_at: "2026-09-01" } : {}));
    const r = applyProgress(creed, bank, TODAY, null, [fixtureId(5), fixtureId(0)], USER, NOW);
    expect(r.row.correct_question_ids).toEqual([fixtureId(5), fixtureId(0)]);
    // Only question 0 is published today, and it is in the set: complete.
    expect(r.state).toEqual({ slug: "the-creed", done: 1, total: 1, completed_at: NOW.toISOString() });
  });

  it("never revokes a completion when the bank grows", () => {
    const small = makeBank(10);
    const done = applyProgress(creed, small, TODAY, null, [fixtureId(0), fixtureId(5)], USER, NOW);
    expect(done.row.completed_at).toBe(NOW.toISOString());

    // Two more creed questions (10 and 15) appear. Progress on read says
    // 2 of 4, and completed_at stands.
    const grown = makeBank(20);
    const later = new Date("2026-10-01T00:00:00.000Z");
    const after = applyProgress(creed, grown, "2026-10-01", done.row, [], USER, later);
    expect(after.state.done).toBe(2);
    expect(after.state.total).toBe(4);
    expect(after.row.completed_at).toBe(NOW.toISOString());
    expect(after.state.completed_at).toBe(NOW.toISOString());
  });
});

describe("handleProgress", () => {
  it("400s a bad body", async () => {
    const { deps: d } = deps();
    expect((await handleProgress(d, { entries: "no" }, USER)).status).toBe(400);
  });

  it("drops unknown slugs rather than refusing the send", async () => {
    const { deps: d, table } = deps();
    const out = await handleProgress(
      d,
      { entries: [{ slug: "withdrawn", question_ids: [fixtureId(0)] }] },
      USER,
    );
    expect(out).toEqual({ ok: true, status: 200, progress: [] });
    expect(table.rows).toHaveLength(0);
  });

  it("unions into the reader's row and reports the state", async () => {
    const { deps: d, table } = deps({}, [
      { user_id: USER, slug: "the-creed", correct_question_ids: [fixtureId(0)], completed_at: null },
    ]);
    const out = await handleProgress(
      d,
      { entries: [{ slug: "the-creed", question_ids: [fixtureId(5), fixtureId(3)] }] },
      USER,
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.progress).toEqual([
        { slug: "the-creed", done: 2, total: 2, completed_at: NOW.toISOString() },
      ]);
    }
    expect(table.rows[0].correct_question_ids).toEqual([fixtureId(0), fixtureId(5)]);
  });

  it("503s when the table is not there, on read or on write", async () => {
    const absent = { code: "PGRST205", message: "Could not find the table 'public.collection_progress' in the schema cache" };
    const body = { entries: [{ slug: "the-creed", question_ids: [fixtureId(0)] }] };
    const onRead = deps({ read: async () => ({ rows: [], error: absent }) }).deps;
    expect((await handleProgress(onRead, body, USER)).status).toBe(503);
    const onWrite = deps({ upsert: async () => ({ error: absent }) }).deps;
    expect((await handleProgress(onWrite, body, USER)).status).toBe(503);
  });
});
