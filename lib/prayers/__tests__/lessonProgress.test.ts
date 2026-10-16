import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/prayers/learning";
import {
  LESSONS_EVENT,
  LESSONS_KEY,
  markLessonRead,
  nextLessonId,
  parseLessonsRead,
  readLessons,
} from "@/lib/prayers/lessonProgress";

/**
 * Learn to pray's progress (1.7): which lessons a reader has read, kept on
 * the device, and the next one to read. Learning, not prayer, so it may say
 * what is done (the owner, 2026-10-16); it never says it as a score.
 */

describe("the lessons read", () => {
  it("keep only well-formed entries, one per lesson", () => {
    expect(parseLessonsRead(null)).toEqual([]);
    expect(parseLessonsRead("not json")).toEqual([]);
    expect(parseLessonsRead('{"id":"x"}')).toEqual([]);
    expect(
      parseLessonsRead(
        JSON.stringify([{ id: "what-is-prayer", at: "2026-10-16T08:00:00.000Z" }, { id: "what-is-prayer", at: "later" }, 7, { at: "x" }, { id: "jesus-prayer" }]),
      ),
    ).toEqual([
      { id: "what-is-prayer", at: "2026-10-16T08:00:00.000Z" },
      { id: "jesus-prayer", at: "" },
    ]);
  });

  it("name the next lesson in order, and nothing once all are read", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(nextLessonId(new Set(), ids)).toBe("what-is-prayer");
    expect(nextLessonId(new Set(["what-is-prayer", "jesus-prayer"]), ids)).toBe("sign-of-the-cross");
    expect(nextLessonId(new Set(ids), ids)).toBeNull();
  });
});

describe("keeping a lesson as read on the device", () => {
  const store = new Map<string, string>();
  const events: string[] = [];

  beforeEach(() => {
    store.clear();
    events.length = 0;
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
      dispatchEvent: (e: Event) => {
        events.push(e.type);
        return true;
      },
    };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("keeps it once, with the day it was first read, and tells the page", () => {
    markLessonRead("what-is-prayer", new Date("2026-10-16T08:00:00.000Z"));
    markLessonRead("what-is-prayer", new Date("2026-10-17T08:00:00.000Z"));
    expect(readLessons()).toEqual([{ id: "what-is-prayer", at: "2026-10-16T08:00:00.000Z" }]);
    expect(events).toEqual([LESSONS_EVENT]);
    // Not a ledger key: the streak and the prayer sync never read it.
    expect(/^purify\.prayers\.(.+)\.dates$/.test(LESSONS_KEY)).toBe(false);
  });

  it("does nothing, and throws nothing, when storage is shut", () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
      dispatchEvent: () => true,
    };
    expect(() => markLessonRead("jesus-prayer")).not.toThrow();
    expect(readLessons()).toEqual([]);
  });
});
