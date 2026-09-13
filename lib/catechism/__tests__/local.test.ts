import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CATECHISM_EVENT,
  completionCount,
  markSynced,
  newAttemptId,
  readAttempt,
  writeAttempt,
  type LocalAttempt,
} from "../local";

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

function attempt(date: string, over: Partial<LocalAttempt> = {}): LocalAttempt {
  return {
    id: newAttemptId(),
    date,
    reckoning: "new",
    answers: [{ question_id: "00000000-0000-4000-8000-000000000001", answer: 1, correct: true }],
    score: 1,
    total: 5,
    completed_at: `${date}T12:00:00.000Z`,
    synced: false,
    ...over,
  };
}

describe("local attempts", () => {
  let events: string[];

  beforeEach(() => {
    events = [];
    const localStorage = storage();
    vi.stubGlobal("window", {
      localStorage,
      dispatchEvent: (e: Event) => {
        events.push(e.type);
        return true;
      },
    });
    vi.stubGlobal("CustomEvent", class extends Event {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads back what it wrote, keyed by date and reckoning", () => {
    expect(readAttempt("2026-09-05", "new")).toBeNull();
    writeAttempt(attempt("2026-09-05"));
    expect(readAttempt("2026-09-05", "new")?.score).toBe(1);
    expect(readAttempt("2026-09-05", "old")).toBeNull();
    expect(events).toEqual([CATECHISM_EVENT]);
  });

  it("counts one completion per day and reckoning", () => {
    writeAttempt(attempt("2026-09-05"));
    writeAttempt(attempt("2026-09-05", { reckoning: "old" }));
    writeAttempt(attempt("2026-09-06"));
    writeAttempt(attempt("2026-09-06", { score: 3 }));
    expect(completionCount()).toBe(3);
    expect(readAttempt("2026-09-06", "new")?.score).toBe(3);
  });

  it("marks an attempt synced once and leaves the rest alone", () => {
    writeAttempt(attempt("2026-09-05"));
    markSynced("2026-09-05", "new");
    expect(readAttempt("2026-09-05", "new")?.synced).toBe(true);
    markSynced("2026-09-05", "new");
    markSynced("2026-09-07", "new");
    expect(events.filter((e) => e === CATECHISM_EVENT)).toHaveLength(2);
  });

  it("prunes the oldest keys past the cap", () => {
    for (let i = 0; i < 810; i++) {
      const d = new Date(Date.UTC(2020, 0, 1 + i, 12));
      writeAttempt(attempt(d.toISOString().slice(0, 10)));
    }
    expect(completionCount()).toBe(800);
    expect(readAttempt("2020-01-01", "new")).toBeNull();
    expect(readAttempt("2020-01-11", "new")).not.toBeNull();
  });

  it("treats corrupt storage as empty", () => {
    (window as unknown as { localStorage: ReturnType<typeof storage> }).localStorage.setItem(
      "purify:catechism:attempts",
      "[1,2",
    );
    expect(completionCount()).toBe(0);
    expect(readAttempt("2026-09-05", "new")).toBeNull();
  });

  it("makes a v4-shaped id", () => {
    expect(newAttemptId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("without a window", () => {
  it("reads empty and writes nothing", () => {
    expect(completionCount()).toBe(0);
    expect(() => writeAttempt(attempt("2026-09-05"))).not.toThrow();
  });
});
