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

  it("weeks start on Monday", () => {
    expect(weekOf("2026-11-22")).toBe("2026-11-16");
    expect(weekOf("2026-11-23")).toBe("2026-11-23");
  });

  it("says plainly when nobody came", () => {
    expect(summarizeOnboarding([], NOW, 7).sentences).toEqual(["No reader went through the welcome questions this week."]);
  });
});
