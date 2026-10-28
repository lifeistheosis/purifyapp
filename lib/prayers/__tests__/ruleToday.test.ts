import { describe, expect, it } from "vitest";

import { libraryRule } from "@/lib/prayers/library";
import { composeRule, emptyMyRule, type MyRule, type MyRuleItem, type MyRulePart } from "@/lib/prayers/myRule";
import { RULE_WINDOW, partHref, ruleToday, stepIdOf, stepWindow } from "@/lib/prayers/ruleToday";

/**
 * Your rule today (1.8): the reader's own rule as the checklist at the head of
 * Prayers, the owner's merged pick of round 4 (2026-10-27). It reads the marks
 * the prayer reader already makes, so a step is checked here exactly when
 * "Mark prayed" was pressed on it today.
 */

const lookup = (id: string) => libraryRule(id, "en");
const p = (rule: string, prayer: string): MyRuleItem => ({ kind: "prayer", rule, prayer });

function ruleOf(morning: MyRuleItem[], evening: MyRuleItem[] = []): MyRule {
  return { ...emptyMyRule(), morning, evening, minutes: { morning: 9, evening: 7 } };
}

/** Marks as the device keeps them: the day's step ids per part, and the parts prayed through. */
function marks(done: Partial<Record<MyRulePart, string[]>> = {}, kept: MyRulePart[] = []) {
  return {
    done: (part: MyRulePart) => new Set(done[part] ?? []),
    kept: (part: MyRulePart) => kept.includes(part),
  };
}

const MORNING = [p("morning", "sign-of-cross"), p("morning", "glory-to-thee"), p("morning", "heavenly-king"), p("morning", "trisagion")];
const EVENING = [p("evening", "examination"), p("evening", "into-thy-hands")];

describe("the reader's rule for today", () => {
  it("is nothing for a reader with no rule yet, so the page offers to make one", () => {
    expect(ruleToday(emptyMyRule(), "morning", marks(), lookup)).toBeNull();
    expect(ruleToday(emptyMyRule(), "evening", marks(), lookup)).toBeNull();
  });

  it("lists the part the hour calls for, each prayer by its own title and length, leading to its place on the page", () => {
    const today = ruleToday(ruleOf(MORNING, EVENING), "morning", marks(), lookup)!;
    expect(today.part).toBe("morning");
    expect(today.steps.map((s) => s.title)).toEqual(["The Sign of the Cross", "Glory to Thee, our God", "O Heavenly King", "The Trisagion"]);
    for (const s of today.steps) {
      expect(s.minutes).toBeGreaterThanOrEqual(1);
      expect(s.fromRule).toBe("morning");
      expect(s.href).toBe(`/prayers/personal/morning#${s.stepId}`);
    }
  });

  it("marks a step with the very id the prayer page keeps its mark under", () => {
    const rule = ruleOf(MORNING);
    const composed = composeRule("morning", rule.morning, lookup, { living: [], departed: [] }, {
      title: "Your morning rule",
      namesTitle: "Those I pray for",
      namesInstruction: "",
      namesNone: "",
      living: "",
      departed: "",
    });
    expect(ruleToday(rule, "morning", marks(), lookup)!.steps.map((s) => s.stepId)).toEqual(composed.rule.prayers.map((x) => x.id));

    const prayed = [stepIdOf(MORNING[0]), stepIdOf(MORNING[1])];
    const today = ruleToday(rule, "morning", marks({ morning: prayed }), lookup)!;
    expect(today.steps.map((s) => s.done)).toEqual([true, true, false, false]);
    // What is next is the first step not yet marked.
    expect(today.next?.title).toBe("O Heavenly King");
    expect([today.done, today.total]).toEqual([2, 4]);
  });

  it("stands the evening part after the morning's prayers as one row, for tonight", () => {
    const today = ruleToday(ruleOf(MORNING, EVENING), "morning", marks(), lookup)!;
    const last = today.rows[today.rows.length - 1];
    expect(last).toMatchObject({ kind: "part", part: "evening", tonight: true, count: 2, minutes: 7, done: false, href: partHref("evening") });
    expect(today.total).toBe(MORNING.length + 1);
  });

  it("stands the morning part first in the evening, checked when it was prayed through", () => {
    const today = ruleToday(ruleOf(MORNING, EVENING), "evening", marks({}, ["morning"]), lookup)!;
    expect(today.part).toBe("evening");
    expect(today.rows[0]).toMatchObject({ kind: "part", part: "morning", tonight: false, done: true, count: 4 });
    expect(today.steps.map((s) => s.title)).toEqual(["Brief examination of the day", "Into Thy hands"]);
    expect([today.done, today.total]).toEqual([1, 3]);
    expect(today.next?.stepId).toBe(stepIdOf(EVENING[0]));
  });

  it("lists the part the reader has when the hour calls for the other", () => {
    const onlyEvening = ruleToday(ruleOf([], EVENING), "morning", marks(), lookup)!;
    expect(onlyEvening.part).toBe("evening");
    expect(onlyEvening.other).toBeNull();
    const onlyMorning = ruleToday(ruleOf(MORNING), "evening", marks(), lookup)!;
    expect(onlyMorning.part).toBe("morning");
    expect(onlyMorning.other).toBeNull();
  });

  it("leaves out a prayer no longer in the prayer book, as the prayer page does", () => {
    const today = ruleToday(ruleOf([p("morning", "no-such-prayer"), ...MORNING.slice(0, 2)]), "morning", marks(), lookup)!;
    expect(today.steps).toHaveLength(2);
    expect(ruleToday(ruleOf([p("morning", "no-such-prayer")]), "morning", marks(), lookup)).toBeNull();
  });

  it("carries the reader's names as a step of their own", () => {
    const today = ruleToday(ruleOf([MORNING[0], { kind: "names" }]), "morning", marks({ morning: ["names"] }), lookup)!;
    expect(today.steps[1]).toMatchObject({ kind: "names", stepId: "names", minutes: 1, done: true, href: "/prayers/personal/morning#names" });
  });

  it("has nothing next once every step of the part is marked", () => {
    const all = MORNING.map(stepIdOf);
    const today = ruleToday(ruleOf(MORNING, EVENING), "morning", marks({ morning: all }), lookup)!;
    expect(today.next).toBeNull();
    // The evening is still to come: the day is not over.
    expect([today.done, today.total]).toEqual([4, 5]);
  });
});

describe("the folded list", () => {
  it("shows a short part whole", () => {
    expect(stepWindow(4, 0)).toEqual({ start: 0, end: 4 });
    expect(stepWindow(RULE_WINDOW + 1, 3)).toEqual({ start: 0, end: RULE_WINDOW + 1 });
  });

  it("shows five of a long part, from the one before the next", () => {
    expect(stepWindow(10, 0)).toEqual({ start: 0, end: 5 });
    expect(stepWindow(10, 4)).toEqual({ start: 3, end: 8 });
    // Near the end it holds five, not fewer.
    expect(stepWindow(10, 9)).toEqual({ start: 5, end: 10 });
    // Prayed through: the last five.
    expect(stepWindow(10, -1)).toEqual({ start: 5, end: 10 });
  });
});
