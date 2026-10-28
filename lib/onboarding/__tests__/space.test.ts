import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import lessons from "@/data/prayers/learning/lessons.json";
import {
  INTENTS,
  LEVELS,
  asksRule,
  cleanIntents,
  dayOneFor,
  defaultsFor,
  depthFor,
  fastView,
  focusFor,
  focusesFor,
  togglePick,
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
  it("offers deep study the Book of Job and an inquirer drawn to the Liturgy the guide to a first Liturgy", () => {
    expect(dayOneFor("practicing", "study").key).toBe("job");
    expect(["/bible/job/1", "/walkthroughs/job"]).toContain(dayOneFor("practicing", "study").href);
    // 1.7: the guided walkthrough for inquirers the specification named, in
    // place of the Sign of the Cross lesson, which the guide leads to.
    expect(dayOneFor("inquirer", "liturgy")).toEqual({ key: "firstLiturgy", href: "/start/first-liturgy" });
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
        expect(["/prayers/morning", "/calendar", "/bible/john/1", "/bible/job/1", "/walkthroughs/job", "/start/first-liturgy"]).toContain(href);
      }
    }
  });

  it("sends everyone drawn to quiet to the Jesus Prayer lesson, and nobody to a prayer rope", () => {
    // The practicing were sent to /prayers/rope until 1.6, when the digital
    // prayer rope came down on the owner's decision of 2026-10-10.
    for (const l of [...LEVELS, null]) {
      expect(dayOneFor(l, "quiet")).toEqual({ key: "jesusPrayer", href: "/prayers/learning/jesus-prayer" });
    }
    for (const [l, i] of combos) expect(dayOneFor(l, i).href, `${l}/${i}`).not.toContain("rope");
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

  it("keeps several picks' focus in the order picked, none twice", () => {
    expect(focusesFor(["study", "quiet", "liturgy", "prayer"])).toEqual(["scripture", "prayer", "calendar"]);
    expect(focusesFor([])).toEqual([]);
  });
});

// "What are you looking for?" (1.8, the owner's pick B of round 14): picture
// cards, each pick numbered in the order it was tapped.
describe("the picks, in the order tapped", () => {
  it("puts a new pick last, so its number is the next one", () => {
    let picks: Intent[] = [];
    picks = togglePick(picks, "study");
    picks = togglePick(picks, "quiet");
    picks = togglePick(picks, "prayer");
    expect(picks).toEqual(["study", "quiet", "prayer"]);
  });

  it("takes a pick out on a second tap, and the ones after it move up a place", () => {
    expect(togglePick(["study", "quiet", "prayer"], "study")).toEqual(["quiet", "prayer"]);
    expect(togglePick(["study", "quiet", "prayer"], "quiet")).toEqual(["study", "prayer"]);
    expect(togglePick(["study"], "study")).toEqual([]);
  });

  it("brings a pick back at the end, not where it was", () => {
    expect(togglePick(togglePick(["study", "quiet"], "study"), "study")).toEqual(["quiet", "study"]);
  });

  it("leaves the list it was given as it was", () => {
    const picks: Intent[] = ["liturgy"];
    togglePick(picks, "study");
    togglePick(picks, "liturgy");
    expect(picks).toEqual(["liturgy"]);
  });

  it("reads back real answers only, each once, in their order", () => {
    expect(cleanIntents(["prayer", "study", "prayer", "abbot", 3, null, "quiet"])).toEqual(["prayer", "study", "quiet"]);
    expect(cleanIntents("study")).toEqual([]);
    expect(cleanIntents(undefined)).toEqual([]);
    expect(cleanIntents({ 0: "study" })).toEqual([]);
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
