import { describe, expect, it } from "vitest";

import type { Role } from "../clergy";
import { flowSteps, progressPath, type FlowStart, type StepId } from "../flowSteps";
import { LEVELS, type Level } from "../space";

/**
 * The welcome questions' screens for each reader (components/onboarding/
 * OnboardingFlow.tsx), and above all who meets "Are you a priest, a deacon,
 * or a layman?" (1.8.x, the owner's note 54): the baptized Orthodox only, and
 * a priest's or deacon's own screens only after they answer so.
 */

const steps = (o: Partial<Parameters<typeof flowSteps>[0]> = {}) =>
  flowSteps({ startAt: "welcome", level: null, role: null, country: null, remindersOn: false, ...o });

describe("who meets the clergy's question", () => {
  it("is the baptized Orthodox, right after the level question and before their calendar and fast", () => {
    expect(steps({ level: "practicing" })).toEqual([
      "welcome",
      "account",
      "background",
      "level",
      "role",
      "rule",
      "intent",
      "reminders",
      "handoff",
    ]);
  });

  it("is never a catechumen, an inquirer, or a reader who has not answered the level", () => {
    for (const level of ["learning", "inquirer", null] as (Level | null)[]) {
      for (const role of ["priest", "deacon", null] as (Role | null)[]) {
        const s = steps({ level, role, country: "US" });
        expect(s, `${level} ${role}`).not.toContain("role");
        expect(s.some((x) => x.startsWith("clergy")), `${level} ${role}`).toBe(false);
      }
    }
  });
});

describe("what follows the answer", () => {
  it("is the calendar and fast at once for a layman", () => {
    expect(steps({ level: "practicing", role: "layman" })).toEqual(steps({ level: "practicing" }));
  });

  it("is where and the jurisdiction for a priest or deacon outside the United States", () => {
    const s = steps({ level: "practicing", role: "deacon", country: "GR" });
    expect(s.slice(s.indexOf("level"), s.indexOf("intent"))).toEqual(["level", "role", "clergyWhere", "clergyJurisdiction", "rule"]);
  });

  it("adds the parish for a priest or deacon in the United States, once the country is chosen", () => {
    const before = steps({ level: "practicing", role: "priest", country: null });
    expect(before).not.toContain("clergyParish");
    const s = steps({ level: "practicing", role: "priest", country: "US" });
    expect(s.slice(s.indexOf("level"), s.indexOf("intent"))).toEqual([
      "level",
      "role",
      "clergyWhere",
      "clergyJurisdiction",
      "clergyParish",
      "rule",
    ]);
  });

  it("is the same for a reader who is back, signed in already, or making an account", () => {
    for (const startAt of ["returning", "level", "account"] as FlowStart[]) {
      const s = steps({ startAt, level: "practicing", role: "priest", country: "US" });
      expect(s.slice(s.indexOf("level"), s.indexOf("intent")), startAt).toEqual([
        "level",
        "role",
        "clergyWhere",
        "clergyJurisdiction",
        "clergyParish",
        "rule",
      ]);
    }
    expect(steps({ startAt: "returning", level: "practicing", remindersOn: true })).not.toContain("reminders");
  });
});

describe("the progress line", () => {
  it("is measured against a way through that holds every screen anyone meets, in the same order, so it only grows", () => {
    for (const startAt of ["welcome", "account", "level", "returning"] as FlowStart[]) {
      const path = progressPath(startAt);
      for (const level of [...LEVELS, null]) {
        for (const role of ["priest", "deacon", "layman", null] as (Role | null)[]) {
          for (const country of ["US", "GR", null]) {
            const s: StepId[] = steps({ startAt, level, role, country });
            const at = s.map((x) => path.indexOf(x));
            expect(at.every((i) => i >= 0), `${startAt} ${level} ${role} ${country}`).toBe(true);
            expect(at, `${startAt} ${level} ${role} ${country}`).toEqual([...at].sort((a, b) => a - b));
          }
        }
      }
    }
  });
});

describe("a reader back from the sign-in their reminders asked for", () => {
  it("is shown the reminders and the end, and nothing answered again", () => {
    expect(steps({ startAt: "reminders", level: "practicing", role: "priest", country: "US" })).toEqual(["reminders", "handoff"]);
    // Even one whose reminders are on by now: the step is where they left it.
    expect(steps({ startAt: "reminders", remindersOn: true })).toEqual(["reminders", "handoff"]);
  });

  it("finds the progress line where they left it, near its end", () => {
    const path = progressPath("reminders");
    expect(path).toEqual(progressPath("level"));
    expect(path.indexOf("reminders")).toBe(path.length - 2);
  });
});
