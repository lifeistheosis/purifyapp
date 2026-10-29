import { describe, expect, it } from "vitest";

import { summarizeOnboarding, weekOf, type OnboardingRow } from "../onboardingSummary";

// The admin's sums of the onboarding's counts (1.8), and the week said in
// plain sentences, the owner's "a Catholic finished" way.

const NOW = new Date("2026-11-30T12:00:00Z");
const row = (name: string, day: string, props: Record<string, unknown>): OnboardingRow => ({
  name,
  ts: `${day}T00:00:00Z`,
  props: { v: 3, platform: "ios", route: "new", ...props },
});

const rows: OnboardingRow[] = [
  row("onboarding_step", "2026-11-20", { step: "welcome" }),
  row("onboarding_step", "2026-11-20", { step: "level" }),
  row("onboarding_step", "2026-11-21", { step: "welcome" }),
  row("onboarding_answer", "2026-11-20", { question: "level", answer: "inquirer" }),
  row("onboarding_skipped", "2026-11-21", { at: "account" }),
  row("onboarding_finished", "2026-11-20", { account: true, background: "catholic", level: "inquirer", door: "ad-tiktok-peace-a" }),
  row("onboarding_finished", "2026-11-22", { account: false, background: "catholic", level: "learning" }),
  row("onboarding_finished", "2026-11-23", { account: false, background: "orthodox", level: "practicing" }),
  // Before the window: counts only toward who could have come back.
  row("onboarding_finished", "2026-10-20", { account: false, background: "protestant" }),
  row("onboarding_returned", "2026-11-27", { day: 7, background: "catholic" }),
  row("onboarding_dayone", "2026-11-20", { key: "firstLiturgy" }),
];

describe("the onboarding's sums", () => {
  const s = summarizeOnboarding(rows, NOW, 30);

  it("adds up screens, answers, skips and finishes in the window only", () => {
    expect(s.steps.new.welcome).toBe(2);
    expect(s.steps.new.level).toBe(1);
    // Began: the first screen of each way in, not every screen seen.
    expect(s.began).toBe(2);
    expect(summarizeOnboarding([row("onboarding_step", "2026-11-20", { step: "level", route: "signed-in" })], NOW, 30).began).toBe(1);
    expect(s.answers.level.inquirer).toBe(1);
    expect(s.skipped).toBe(1);
    expect(s.skippedAt.account).toBe(1);
    expect(s.finished).toBe(3);
    expect(s.finishedBy.background).toEqual({ catholic: 2, orthodox: 1 });
    expect(s.finishedBy.account).toEqual({ yes: 1, no: 2 });
    expect(s.finishedBy.door).toEqual({ "ad-tiktok-peace-a": 1 });
    expect(s.dayOne.firstLiturgy).toBe(1);
  });

  it("measures coming back against those who could have", () => {
    expect(s.returned[7].count).toBe(1);
    // The three finishes of 20 to 23 November are a week old by the 30th;
    // 20 October's day 7 fell before the window, its day 30 inside it.
    expect(s.returned[7].of).toBe(3);
    expect(s.returned[2].of).toBe(3);
    expect(s.returned[30].of).toBe(1);
  });

  it("says it in plain sentences", () => {
    expect(s.sentences[0]).toBe("3 readers finished the welcome questions in the last 30 days, and 1 skipped them.");
    expect(s.sentences).toContain("Where they come from: 2 Catholics and 1 Orthodox reader.");
    expect(s.sentences).toContain("Most skipped at the account screen (1).");
    expect(s.sentences.some((x) => x.startsWith("1 came back after a week, of 3 who could have, most of them Catholics"))).toBe(true);
  });

  it("counts every pick of what they look for, and how many put each first (1.8)", () => {
    const v4 = (props: Record<string, unknown>) => ({ ...row("onboarding_answer", "2026-11-25", { question: "intent", ...props }), props: { v: 4, platform: "android", route: "new", question: "intent", ...props } });
    const picks = summarizeOnboarding(
      [
        // Version 3 counted the first pick alone, with no place.
        row("onboarding_answer", "2026-11-20", { question: "intent", answer: "prayer" }),
        // Version 4: a reader who picked the saints, then the Gospels, then prayer.
        v4({ answer: "saints", place: 1 }),
        v4({ answer: "gospels", place: 2 }),
        v4({ answer: "prayer", place: 3 }),
        // And one who put the Gospels first.
        v4({ answer: "gospels", place: 1 }),
      ],
      NOW,
      30,
    );
    expect(picks.answers.intent).toEqual({ prayer: 2, saints: 1, gospels: 2 });
    expect(picks.picks.first).toEqual({ prayer: 1, saints: 1, gospels: 1 });
    expect(picks.picks.places).toEqual({ prayer: { 1: 1, 3: 1 }, saints: { 1: 1 }, gospels: { 1: 1, 2: 1 } });
  });

  it("begins a signed-in reader on where they come from from version 4, on familiarity before it", () => {
    const step = (v: number, step: string) => ({ ...row("onboarding_step", "2026-11-20", {}), props: { v, platform: "ios", route: "signed-in", step } });
    // Version 4: the questions open on "Where are you coming from?"; familiarity follows and is not a second beginning.
    expect(summarizeOnboarding([step(4, "background"), step(4, "level")], NOW, 30).began).toBe(1);
    // Version 3 (the website until 1.8): they opened on familiarity.
    expect(summarizeOnboarding([step(3, "level")], NOW, 30).began).toBe(1);
    expect(summarizeOnboarding([step(3, "level"), step(4, "background"), step(4, "level")], NOW, 30).began).toBe(2);
  });

  it("says what they look for in a sentence, with the answer put first most", () => {
    const withPicks = summarizeOnboarding(
      [
        ...rows,
        { ...row("onboarding_answer", "2026-11-25", {}), props: { v: 4, platform: "web", route: "new", question: "intent", answer: "saints", place: 1 } },
        { ...row("onboarding_answer", "2026-11-25", {}), props: { v: 4, platform: "web", route: "new", question: "intent", answer: "feasts", place: 2 } },
      ],
      NOW,
      30,
    );
    expect(withPicks.sentences).toContain(
      "What they look for most: the saints' lives (1) and fasts and feasts (1); picked first most often, the saints' lives (1).",
    );
  });

  it("calls the readers who are just curious what the question calls them", () => {
    const curious = summarizeOnboarding([row("onboarding_finished", "2026-11-20", { account: false, background: "none" })], NOW, 30);
    expect(curious.sentences).toContain("Where they come from: 1 reader who is just curious.");
  });

  it("weeks start on Monday", () => {
    expect(weekOf("2026-11-22")).toBe("2026-11-16");
    expect(weekOf("2026-11-23")).toBe("2026-11-23");
  });

  it("says plainly when nobody came", () => {
    expect(summarizeOnboarding([], NOW, 7).sentences).toEqual(["No reader went through the welcome questions this week."]);
  });
});
