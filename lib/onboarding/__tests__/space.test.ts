import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import lessons from "@/data/prayers/learning/lessons.json";
import {
  INTENTS,
  LEVELS,
  asksRule,
  dayOneFor,
  defaultsFor,
  depthFor,
  fastView,
  focusFor,
  type Intent,
  type Level,
} from "../space";

const messages = en as Record<string, string>;
const lessonIds = new Set((lessons as { id: string }[]).map((l) => l.id));

// Every answer a reader can give, including skipping either question.
const combos: [Level | null, Intent | null][] = [];
for (const l of [...LEVELS, null]) for (const i of [...INTENTS, null]) combos.push([l, i]);

describe("the baseline fork", () => {
  it("sets the specification's baseline for each level", () => {
    expect(defaultsFor("inquirer")).toEqual({ calendar: "new", fasting: "hidden" });
    expect(defaultsFor("learning")).toEqual({ calendar: "new", fasting: "modified" });
    // Strict is what every reader saw before the choice existed.
    expect(defaultsFor("practicing")).toEqual({ calendar: "new", fasting: "strict" });
  });

  it("asks the calendar and fasting questions of the practicing only", () => {
    expect(asksRule("practicing")).toBe(true);
    expect(asksRule("learning")).toBe(false);
    expect(asksRule("inquirer")).toBe(false);
    expect(asksRule(null)).toBe(false);
  });

  it("keeps the introductory register for everyone but the practicing", () => {
    expect(depthFor("inquirer")).toBe("inquirer");
    expect(depthFor("learning")).toBe("inquirer");
    expect(depthFor("practicing")).toBe("faithful");
  });
});

describe("the Day 1 step", () => {
  it("offers deep study the Book of Job and an inquirer drawn to the Liturgy the sign of the cross", () => {
    expect(dayOneFor("practicing", "study")).toEqual({ key: "job", href: "/bible/job/1" });
    expect(dayOneFor("inquirer", "liturgy").href).toBe("/prayers/learning/sign-of-the-cross");
  });

  it("gives a beginner who skipped everything the first lesson, and anyone else John", () => {
    expect(dayOneFor("inquirer", null).key).toBe("whatIsPrayer");
    expect(dayOneFor(null, null).key).toBe("gospelJohn");
    expect(dayOneFor("practicing", null).key).toBe("gospelJohn");
  });

  it("lands every combination on a page that exists", () => {
    for (const [l, i] of combos) {
      const { href } = dayOneFor(l, i);
      const lesson = href.match(/^\/prayers\/learning\/(.+)$/);
      if (lesson) {
        expect(lessonIds.has(lesson[1]), `${l}/${i}: ${href}`).toBe(true);
      } else {
        expect(["/prayers/rope", "/prayers/morning", "/calendar", "/bible/john/1", "/bible/job/1"]).toContain(href);
      }
    }
  });

  it("has a title and a line of copy for every step it can offer", () => {
    for (const [l, i] of combos) {
      const { key } = dayOneFor(l, i);
      expect(messages[`onboard.day1.${key}.title`], key).toBeTruthy();
      expect(messages[`onboard.day1.${key}.body`], key).toBeTruthy();
    }
  });
});

describe("focus", () => {
  it("keeps the older focus picks pointing the same way as the intent", () => {
    expect(focusFor("quiet")).toBe("prayer");
    expect(focusFor("prayer")).toBe("prayer");
    expect(focusFor("liturgy")).toBe("calendar");
    expect(focusFor("study")).toBe("scripture");
  });
});

describe("how the fast shows", () => {
  const fastDays = ["strict", "wine-oil", "fish", "fast"] as const;

  it("hides it entirely when the reader chose hidden", () => {
    for (const k of [...fastDays, "fast-free", "normal"] as const) expect(fastView(k, "hidden")).toBeNull();
  });

  it("reads every fast day the same plain way under the modified rule", () => {
    for (const k of fastDays) expect(fastView(k, "modified")).toEqual({ mode: "plain" });
    expect(fastView("normal", "modified")).toEqual({ mode: "calendar" });
    expect(fastView("fast-free", "modified")).toEqual({ mode: "calendar" });
  });

  it("keeps the calendar's own rule under the strict rule", () => {
    for (const k of fastDays) expect(fastView(k, "strict")).toEqual({ mode: "calendar" });
  });
});
