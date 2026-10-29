import { describe, expect, it } from "vitest";

import { trackEventSchema } from "@/lib/security/schemas";
import {
  COUNT_ANSWERS,
  COUNT_QUESTIONS,
  COUNT_ROUTES,
  COUNT_VERSION,
  ONBOARDING_STEPS,
  RETURN_DAYS,
  daysBetween,
  eventBody,
  isCountAnswer,
  parseFinishedRecord,
  picksToCount,
  returnsDue,
  routeFor,
  type FinishedRecord,
} from "../counting";
import { INTENTS } from "../space";

// The onboarding's counts (1.8): totals with no reader in them. These hold the
// rules the totals depend on, and that the server takes nothing off the lists.

const record = (over: Partial<FinishedRecord> = {}): FinishedRecord => ({
  at: "2026-11-08",
  v: COUNT_VERSION,
  route: "new",
  sent: [],
  ...over,
});

describe("the onboarding's counts", () => {
  it("names each way in plainly", () => {
    expect(routeFor("welcome")).toBe("new");
    expect(routeFor("account")).toBe("signup");
    expect(routeFor("level")).toBe("signed-in");
    expect(routeFor("returning")).toBe("returning");
  });

  it("counts coming back once for each day reached, and never twice", () => {
    expect(daysBetween("2026-11-08", "2026-11-10")).toBe(2);
    expect(returnsDue(record(), "2026-11-08")).toEqual([]);
    expect(returnsDue(record(), "2026-11-09")).toEqual([]);
    expect(returnsDue(record(), "2026-11-10")).toEqual([2]);
    // First back on day 9: day 2 and day 7 at once.
    expect(returnsDue(record(), "2026-11-17")).toEqual([2, 7]);
    expect(returnsDue(record({ sent: [2] }), "2026-11-17")).toEqual([7]);
    expect(returnsDue(record({ sent: [2, 7] }), "2026-12-08")).toEqual([30]);
    expect(returnsDue(record({ sent: [2, 7, 30] }), "2027-03-01")).toEqual([]);
  });

  it("reads back only a record it wrote", () => {
    expect(parseFinishedRecord(null)).toBeNull();
    expect(parseFinishedRecord("not json")).toBeNull();
    expect(parseFinishedRecord(JSON.stringify({ at: "yesterday", v: 3, route: "new", sent: [] }))).toBeNull();
    expect(parseFinishedRecord(JSON.stringify({ at: "2026-11-08", v: 3, route: "elsewhere", sent: [] }))).toBeNull();
    const back = parseFinishedRecord(JSON.stringify({ at: "2026-11-08", v: 3, route: "new", sent: [2, 5, "7"] }));
    expect(back?.sent).toEqual([2]);
  });

  it("knows each question's answers", () => {
    expect(isCountAnswer("background", "catholic")).toBe(true);
    expect(isCountAnswer("background", "inquirer")).toBe(false);
    expect(isCountAnswer("level", "practicing")).toBe(true);
    expect(COUNT_ANSWERS.reminders).toContain("not-now");
    // "What are you looking for?" offers all eleven of its answers (1.8).
    expect(COUNT_ANSWERS.intent).toEqual(INTENTS);
    for (const intent of ["saints", "fathers", "gospels", "councils", "history", "beliefs", "feasts"]) {
      expect(isCountAnswer("intent", intent), intent).toBe(true);
    }
  });

  it("counts every pick, not only the first, each with its place in the order tapped", () => {
    expect(picksToCount(["saints", "gospels", "prayer"])).toEqual([
      { answer: "saints", place: 1 },
      { answer: "gospels", place: 2 },
      { answer: "prayer", place: 3 },
    ]);
    expect(picksToCount([])).toEqual([]);
    // A pick is a pick once.
    expect(picksToCount(["study", "study", "quiet"])).toEqual([
      { answer: "study", place: 1 },
      { answer: "quiet", place: 2 },
    ]);
  });

  it("says which version of the questions a count answers: the fourth, from 1.8", () => {
    // "Where are you coming from?" asked, eleven answers, every pick counted.
    expect(COUNT_VERSION).toBe(4);
  });
});

describe("what the device sends is what the server takes", () => {
  const about = { v: COUNT_VERSION, platform: "android" as const, door: "ad-meta-saints-b" };
  const parse = (event: { name: string; props: Record<string, unknown> }, a: typeof about | { v: number; platform: "web" } = about) =>
    trackEventSchema.safeParse(JSON.parse(eventBody(event, a)));

  it("every screen, from every way in", () => {
    for (const route of COUNT_ROUTES) {
      for (const step of ONBOARDING_STEPS) expect(parse({ name: "onboarding_step", props: { route, step } }).success).toBe(true);
    }
  });

  it("every answer to every question", () => {
    for (const question of COUNT_QUESTIONS) {
      for (const answer of COUNT_ANSWERS[question]) {
        expect(parse({ name: "onboarding_answer", props: { route: "new", question, answer } }).success, `${question}: ${answer}`).toBe(
          true,
        );
      }
    }
  });

  it("every pick at every place, however many are picked", () => {
    for (const { answer, place } of picksToCount(INTENTS)) {
      expect(parse({ name: "onboarding_answer", props: { route: "new", question: "intent", answer, place } }).success, `${answer} ${place}`).toBe(
        true,
      );
    }
  });

  it("a skip, a finish, a Day 1 and a return, with and without a door", () => {
    expect(parse({ name: "onboarding_skipped", props: { route: "signup", at: "account" } }).success).toBe(true);
    expect(
      parse({ name: "onboarding_finished", props: { route: "new", account: false, level: "learning", intent: "prayer" } }).success,
    ).toBe(true);
    expect(parse({ name: "onboarding_finished", props: { route: "returning", account: true } }, { v: 3, platform: "web" }).success).toBe(
      true,
    );
    expect(parse({ name: "onboarding_dayone", props: { key: "morningRule", level: "inquirer" } }).success).toBe(true);
    expect(parse({ name: "onboarding_dayone", props: { key: "job", route: "new" } }, { v: 3, platform: "web" }).success).toBe(true);
    for (const day of RETURN_DAYS) {
      expect(parse({ name: "onboarding_returned", props: { route: "new", day, background: "none", intent: "quiet" } }).success).toBe(true);
    }
  });
});

describe("the server takes only what is on the lists", () => {
  const props = { v: COUNT_VERSION, platform: "ios", route: "new" };

  it("takes a screen, an answer, a finish and a return", () => {
    expect(trackEventSchema.safeParse({ name: "onboarding_step", props: { ...props, step: "level" } }).success).toBe(true);
    expect(
      trackEventSchema.safeParse({ name: "onboarding_answer", props: { ...props, question: "background", answer: "protestant" } })
        .success,
    ).toBe(true);
    expect(
      trackEventSchema.safeParse({
        name: "onboarding_finished",
        props: { ...props, account: true, background: "catholic", level: "inquirer", intent: "study", door: "ad-tiktok-peace-a" },
      }).success,
    ).toBe(true);
    expect(
      trackEventSchema.safeParse({ name: "onboarding_returned", props: { ...props, day: 7, background: "orthodox" } }).success,
    ).toBe(true);
    expect(trackEventSchema.safeParse({ name: "onboarding_dayone", props: { v: 3, platform: "web", key: "gospelJohn" } }).success).toBe(true);
  });

  it("refuses an answer the question does not offer", () => {
    expect(
      trackEventSchema.safeParse({ name: "onboarding_answer", props: { ...props, question: "level", answer: "catholic" } }).success,
    ).toBe(false);
  });

  it("takes a place only for a pick, and only a place there can be", () => {
    const pick = (over: Record<string, unknown>) =>
      trackEventSchema.safeParse({ name: "onboarding_answer", props: { ...props, question: "intent", answer: "saints", ...over } }).success;
    expect(pick({ place: 1 })).toBe(true);
    expect(pick({ place: INTENTS.length })).toBe(true);
    // A row from before places were counted has none, and was a first pick.
    expect(pick({})).toBe(true);
    expect(pick({ place: 0 })).toBe(false);
    expect(pick({ place: INTENTS.length + 1 })).toBe(false);
    expect(pick({ place: 1.5 })).toBe(false);
    expect(pick({ place: "1" })).toBe(false);
    expect(
      trackEventSchema.safeParse({ name: "onboarding_answer", props: { ...props, question: "background", answer: "catholic", place: 1 } })
        .success,
    ).toBe(false);
  });

  it("refuses anything that could name a reader", () => {
    expect(
      trackEventSchema.safeParse({ name: "onboarding_step", props: { ...props, step: "level", sessionId: "abc123abc123abc123" } }).success,
    ).toBe(false);
    expect(
      trackEventSchema.safeParse({ name: "onboarding_finished", props: { ...props, account: true, door: "Reader@Example.com" } })
        .success,
    ).toBe(false);
    expect(trackEventSchema.safeParse({ name: "onboarding_returned", props: { ...props, day: 5 } }).success).toBe(false);
    expect(trackEventSchema.safeParse({ name: "onboarding_step", props: { ...props, step: "level", platform: "linux" } }).success).toBe(
      false,
    );
  });
});
