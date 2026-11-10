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

/**
 * The questions' shape with the roads on (1.9, lib/onboarding/flags.ts;
 * docs/1.9-build/notes/onboarding-fable.md, 3.2): fewer screens, each asked
 * where it is of use. Off, every list above stands as it is.
 */
describe("with the roads on", () => {
  const roads = (o: Partial<Parameters<typeof flowSteps>[0]> = {}) => steps({ roads: true, ...o });

  it("shows a new reader Purify before it asks for an account or for reminders", () => {
    expect(roads({ level: "inquirer" })).toEqual(["welcome", "background", "level", "intent", "handoff"]);
    expect(roads({ level: "learning" })).toEqual(["welcome", "background", "level", "intent", "handoff"]);
  });

  it("asks the practicing their calendar and fast, and the clergy's question of nobody who did not open it", () => {
    expect(roads({ level: "practicing" })).toEqual(["welcome", "background", "level", "rule", "intent", "handoff"]);
    for (const role of ["priest", "deacon", "layman", null] as (Role | null)[]) {
      const s = roads({ level: "practicing", role, country: "US" });
      expect(s, String(role)).not.toContain("role");
      expect(s.some((x) => x.startsWith("clergy")), String(role)).toBe(false);
    }
  });

  it("opens the clergy's screens after the rule, from its quiet line", () => {
    expect(roads({ level: "practicing", clergyOpen: true })).toEqual(["welcome", "background", "level", "rule", "role", "intent", "handoff"]);
    const priest = roads({ level: "practicing", clergyOpen: true, role: "priest", country: "US" });
    expect(priest.slice(priest.indexOf("rule"), priest.indexOf("intent"))).toEqual([
      "rule",
      "role",
      "clergyWhere",
      "clergyJurisdiction",
      "clergyParish",
    ]);
    // Never for a reader who is not baptized Orthodox, whatever was opened before they changed their answer.
    for (const level of ["learning", "inquirer", null] as (Level | null)[]) {
      expect(roads({ level, clergyOpen: true, role: "priest", country: "US" }), String(level)).not.toContain("role");
    }
  });

  it("asks for reminders in the questions only of a reader who is signed in, since they are kept with an account", () => {
    expect(roads({ level: "inquirer" })).not.toContain("reminders");
    expect(roads({ level: "inquirer", signedIn: true })).toEqual(["welcome", "background", "level", "intent", "reminders", "handoff"]);
    expect(roads({ startAt: "level", level: "inquirer", signedIn: true })).toEqual(["background", "level", "intent", "reminders", "handoff"]);
    // A reader who is back with reminders on is still not asked to turn on what is on.
    expect(roads({ startAt: "returning", level: "inquirer", signedIn: true, remindersOn: true })).not.toContain("reminders");
    expect(roads({ startAt: "returning", level: "inquirer", signedIn: true })).toContain("reminders");
  });

  it("still begins at the account on the mobile website, where the reader came to make one", () => {
    expect(roads({ startAt: "account", level: "inquirer" })).toEqual(["account", "background", "level", "intent", "handoff"]);
  });

  it("leaves a reader back from signing in for their reminders exactly where they were", () => {
    expect(roads({ startAt: "reminders" })).toEqual(["reminders", "handoff"]);
  });

  it("asks for the account as the last question in that version of the account's test, and only of a reader with none", () => {
    // lib/ab/tests.ts, ACCOUNT_PLACE: "end", where the other version offers it on Today.
    expect(roads({ level: "inquirer", accountAtEnd: true })).toEqual(["welcome", "background", "level", "intent", "account", "handoff"]);
    expect(roads({ level: "practicing", accountAtEnd: true })).toEqual(["welcome", "background", "level", "rule", "intent", "account", "handoff"]);
    // Signed in at that step: the account step is behind them and the reminders are asked.
    expect(roads({ level: "inquirer", accountAtEnd: true, signedIn: true })).toEqual(["welcome", "background", "level", "intent", "reminders", "handoff"]);
    // Never twice where the questions began at the account (the mobile website).
    expect(roads({ startAt: "account", level: "inquirer", accountAtEnd: true })).toEqual(["account", "background", "level", "intent", "handoff"]);
    // And never with the roads off.
    expect(steps({ level: "inquirer", accountAtEnd: true })).toEqual(steps({ level: "inquirer" }));
  });

  it("measures the progress line against a path that holds every screen it can show, in its order", () => {
    for (const startAt of ["welcome", "account", "level", "returning", "reminders"] as FlowStart[]) {
      const path = progressPath(startAt, true);
      expect(new Set(path).size, startAt).toBe(path.length);
      for (const level of [...LEVELS, null] as (Level | null)[]) {
        for (const role of ["priest", "deacon", "layman", null] as (Role | null)[]) {
          for (const clergyOpen of [false, true]) {
            for (const signedIn of [false, true]) {
              for (const accountAtEnd of [false, true]) {
                const end = roads({ startAt, level, role, country: "US", clergyOpen, signedIn, accountAtEnd });
                const places = end.map((x: StepId) => path.indexOf(x));
                expect(places.every((i) => i >= 0), `${startAt} ${level} end`).toBe(true);
                expect([...places].sort((a, b) => a - b), `${startAt} ${level} end`).toEqual(places);
              }
              const shown = roads({ startAt, level, role, country: "US", clergyOpen, signedIn });
              const at = shown.map((x: StepId) => path.indexOf(x));
              const label = `${startAt} ${level} ${role} ${clergyOpen} ${signedIn}`;
              expect(at.every((i) => i >= 0), label).toBe(true);
              // Only ever forward.
              expect([...at].sort((a, b) => a - b), label).toEqual(at);
            }
          }
        }
      }
    }
  });
});
