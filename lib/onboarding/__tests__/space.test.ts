import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import lessons from "@/data/prayers/learning/lessons.json";
import { getPlan } from "@/lib/plans/plans";
import {
  BACKGROUND_PILLS,
  BACKGROUNDS,
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
    const appPage = (href: string) => fs.existsSync(path.join(process.cwd(), "app/(app)", href, "page.tsx"));
    for (const [l, i] of combos) {
      const { href } = dayOneFor(l, i);
      const lesson = href.match(/^\/prayers\/learning\/(.+)$/);
      const plan = href.match(/^\/plans\/(.+)$/);
      if (lesson) {
        expect(lessonIds.has(lesson[1]), `${l}/${i}: ${href}`).toBe(true);
      } else if (plan) {
        expect(getPlan(plan[1]), `${l}/${i}: ${href}`).toBeTruthy();
      } else if (["/bible/john/1", "/bible/job/1", "/walkthroughs/job"].includes(href)) {
        // Pages of a book, each written at build from its own data.
      } else {
        expect(appPage(href), `${l}/${i}: ${href}`).toBe(true);
      }
    }
  });

  it("opens the door the app has for each answer added in 1.8", () => {
    // Round 14 B's answers, every one a real page in the app.
    expect(dayOneFor("practicing", "saints")).toEqual({ key: "saintsLives", href: "/saints" });
    expect(dayOneFor("inquirer", "fathers")).toEqual({ key: "readingPaths", href: "/reading/paths" });
    expect(dayOneFor("learning", "gospels")).toEqual({ key: "gospelsPlan", href: "/plans/gospels" });
    expect(dayOneFor(null, "councils")).toEqual({ key: "councils", href: "/councils" });
    expect(dayOneFor("practicing", "history")).toEqual({ key: "history", href: "/history" });
    expect(dayOneFor("practicing", "feasts")).toEqual({ key: "feasts", href: "/calendar" });
    // What the Orthodox believe: Start here for the completely new, Theology for the rest.
    expect(dayOneFor("inquirer", "beliefs")).toEqual({ key: "startHere", href: "/start" });
    expect(dayOneFor("learning", "beliefs")).toEqual({ key: "theology", href: "/theology" });
    expect(dayOneFor("practicing", "beliefs")).toEqual({ key: "theology", href: "/theology" });
  });

  it("gives each answer a first step of its own", () => {
    // The four the app had keep theirs; each answer added has one no other answer leads to.
    const added = ["saints", "fathers", "gospels", "councils", "history", "beliefs", "feasts"] as const;
    const before = new Set(INTENTS.filter((i) => !(added as readonly string[]).includes(i)).flatMap((i) => [...LEVELS, null].map((l) => dayOneFor(l, i).key)));
    for (const i of added) {
      for (const l of [...LEVELS, null]) expect(before.has(dayOneFor(l, i).key), `${l}/${i}`).toBe(false);
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

describe("the answers", () => {
  it("are the mockup's eight, its services being the Liturgy, then the app's other three", () => {
    expect(INTENTS).toEqual(["saints", "fathers", "gospels", "councils", "history", "beliefs", "liturgy", "feasts", "prayer", "quiet", "study"]);
  });

  it("each have a name and a line in English", () => {
    for (const i of INTENTS) {
      expect(messages[`onboard.intent.${i}`], i).toBeTruthy();
      expect(messages[`onboard.intent.${i}Sub`], i).toBeTruthy();
    }
  });
});

describe("where the reader comes from", () => {
  it("draws five answers as pills and keeps Prefer not to say for under them", () => {
    expect([...BACKGROUND_PILLS, "prefer-not"]).toEqual([...BACKGROUNDS]);
  });

  it("has a name for every answer and, for each pill, the line that says where Purify starts", () => {
    for (const b of BACKGROUNDS) expect(messages[`onboard.background.${b}`], b).toBeTruthy();
    for (const b of BACKGROUND_PILLS) expect(messages[`onboard.background.start.${b}`], b).toBeTruthy();
    expect(messages["onboard.background.startWith"]).toContain("{what}");
  });
});

describe("focus", () => {
  it("keeps the older focus picks pointing the same way as the intent", () => {
    expect(focusFor("quiet")).toBe("prayer");
    expect(focusFor("prayer")).toBe("prayer");
    expect(focusFor("liturgy")).toBe("calendar");
    expect(focusFor("study")).toBe("scripture");
    // 1.8's answers, in the four words the older picks have.
    expect(focusFor("saints")).toBe("saints");
    expect(focusFor("fathers")).toBe("saints");
    expect(focusFor("feasts")).toBe("calendar");
    for (const i of ["gospels", "councils", "history", "beliefs"] as const) expect(focusFor(i), i).toBe("scripture");
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
