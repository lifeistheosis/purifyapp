import { describe, expect, it } from "vitest";

import type { ClientQuestion, Question } from "../types";
import { buildDailyWindow, windowDaysFor, windowKeys, windowStart } from "../window";
import { makeBank, quietCalendar } from "./fixture";

function toClient(q: Question): ClientQuestion {
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    tags: q.tags,
    source: { kind: "bible", href: q.source_ref, label: "John 1" },
  };
}

describe("window", () => {
  it("carries 400 days for the export and 3 for the web", () => {
    expect(windowDaysFor(true)).toBe(400);
    expect(windowDaysFor(false)).toBe(3);
  });

  it("starts a day back and runs forward", () => {
    expect(windowStart(new Date("2026-09-05T23:30:00Z"))).toBe("2026-09-04");
    const keys = windowKeys("2026-09-04", 400);
    expect(keys).toHaveLength(400);
    expect(keys[0]).toBe("2026-09-04");
    expect(keys[399]).toBe("2027-10-08");
    expect(new Set(keys).size).toBe(400);
  });

  it("bakes both reckonings for every key and every question once", () => {
    const bank = makeBank(40);
    const keys = windowKeys("2026-09-04", 400);
    const w = buildDailyWindow(bank, keys, toClient, quietCalendar);
    expect(Object.keys(w.days)).toHaveLength(400);
    for (const key of keys) {
      expect(w.days[key].new).toHaveLength(5);
      expect(w.days[key].old).toHaveLength(5);
      for (const id of [...w.days[key].new, ...w.days[key].old]) {
        expect(w.questions[id]).toBeDefined();
        expect(w.questions[id].source.href).toBe("/bible/john/1");
      }
    }
    expect(Object.keys(w.questions).length).toBeLessThanOrEqual(40);
  });

  it("drops a question whose source does not resolve", () => {
    const bank = makeBank(40);
    const dead = bank[3].id;
    const w = buildDailyWindow(bank, windowKeys("2026-09-04", 30), (q) =>
      q.id === dead ? null : toClient(q), quietCalendar);
    expect(w.questions[dead]).toBeUndefined();
    for (const day of Object.values(w.days)) {
      expect(day.new).not.toContain(dead);
      expect(day.old).not.toContain(dead);
    }
  });

  it("is empty for an empty bank", () => {
    const w = buildDailyWindow([], windowKeys("2026-09-04", 3), toClient, quietCalendar);
    expect(w.questions).toEqual({});
    expect(w.days["2026-09-04"]).toEqual({ new: [], old: [] });
  });
});
