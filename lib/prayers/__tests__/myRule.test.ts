import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { libraryRule } from "@/lib/prayers/library";
import {
  MY_RULE_CAP,
  MY_RULE_IDS,
  MY_RULE_KEY,
  addItem,
  addItems,
  composeRule,
  emptyMyRule,
  insertAt,
  itemKey,
  minutesForText,
  moveItem,
  parseMyRule,
  partMinutes,
  removeAt,
  todayRuleCard,
  type MyRuleItem,
} from "@/lib/prayers/myRule";

/**
 * Your rule (1.7, the owner's note 17): a reader's own morning and evening
 * rule, chosen from the prayer book, in their order, prayed as one in the
 * prayer reader, led with on Today, and counted for the streak the way the
 * Morning Rule is.
 */

const lookup = (id: string) => libraryRule(id, "en");
const p = (rule: string, prayer: string): MyRuleItem => ({ kind: "prayer", rule, prayer });
const WORDS = {
  title: "Your morning rule",
  namesTitle: "Those I pray for",
  namesInstruction: "Remember them before God, by name.",
  namesNone: "No names yet.",
  living: "For the living",
  departed: "For the reposed",
};
const NO_NAMES = { living: [], departed: [] };

describe("the rule's ids and its key", () => {
  // The streak (lib/streak/useStreak.ts) and the prayer sync (lib/prayers/
  // sync.ts) read every key of this shape as a ledger of days kept.
  const LEDGER = /^purify\.prayers\.(.+)\.dates$/;

  it("keeps a part prayed through under a ledger id, which the streak and the sync both take", () => {
    for (const id of Object.values(MY_RULE_IDS)) {
      const key = `purify.prayers.${id}.dates`;
      expect(LEDGER.exec(key)?.[1], key).toBe(id);
      // The sync's schema: any string up to 80 characters; and no colon, the
      // day strands' namespace (lib/rhythm/marks.ts).
      expect(id.length).toBeLessThanOrEqual(80);
      expect(id).not.toContain(":");
    }
    expect(new Set(Object.values(MY_RULE_IDS)).size).toBe(2);
  });

  it("keeps the rule itself under a key no ledger reader takes for one", () => {
    expect(LEDGER.test(MY_RULE_KEY)).toBe(false);
  });

  it("is a ledger id the server's sync schema accepts", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "app", "api", "prayer", "sync", "route.ts"), "utf8");
    expect(route).toMatch(/ruleId:\s*z\.string\(\)\.min\(1\)\.max\(80\)/);
  });
});

describe("the rule kept on the device", () => {
  it("reads back only well-formed items, each once, up to the cap", () => {
    expect(parseMyRule(null)).toEqual(emptyMyRule());
    expect(parseMyRule("not json")).toEqual(emptyMyRule());
    const many = Array.from({ length: MY_RULE_CAP + 5 }, (_, i) => ({ kind: "prayer", rule: "morning", prayer: `x-${i}` }));
    const rule = parseMyRule(
      JSON.stringify({
        morning: [{ kind: "prayer", rule: "morning", prayer: "trisagion" }, { kind: "prayer", rule: "morning", prayer: "trisagion" }, { kind: "names" }, { kind: "prayer", rule: "BAD ID", prayer: "x" }, 7],
        evening: many,
        minutes: { morning: 9, evening: -1 },
        updatedAt: "2026-10-16T08:00:00.000Z",
      }),
    );
    expect(rule.morning).toEqual([p("morning", "trisagion"), { kind: "names" }]);
    expect(rule.evening).toHaveLength(MY_RULE_CAP);
    expect(rule.minutes).toEqual({ morning: 9, evening: 0 });
  });
});

describe("changing the rule", () => {
  const base = addItems(emptyMyRule(), "morning", [p("morning", "sign-of-cross"), p("morning", "trisagion"), p("morning", "our-father")]);

  it("adds at the end, never twice, never past the cap", () => {
    expect(base.morning.map(itemKey)).toEqual(["morning/sign-of-cross", "morning/trisagion", "morning/our-father"]);
    expect(addItem(base, "morning", p("morning", "trisagion"))).toBe(base);
    let full = emptyMyRule();
    for (let i = 0; i < MY_RULE_CAP + 3; i++) full = addItem(full, "evening", p("evening", `x-${i}`));
    expect(full.evening).toHaveLength(MY_RULE_CAP);
  });

  it("moves an item to another place, and leaves the rest in their order", () => {
    expect(moveItem(base, "morning", 2, 0).morning.map(itemKey)).toEqual(["morning/our-father", "morning/sign-of-cross", "morning/trisagion"]);
    expect(moveItem(base, "morning", 0, 9).morning.map(itemKey)).toEqual(["morning/trisagion", "morning/our-father", "morning/sign-of-cross"]);
    expect(moveItem(base, "morning", 1, 1)).toBe(base);
  });

  it("takes an item out, and Undo puts it back where it was", () => {
    const out = removeAt(base, "morning", 1);
    expect(out.morning.map(itemKey)).toEqual(["morning/sign-of-cross", "morning/our-father"]);
    expect(insertAt(out, "morning", 1, base.morning[1]).morning.map(itemKey)).toEqual(base.morning.map(itemKey));
  });

  it("works out each part's length from the prayers' own words", () => {
    expect(minutesForText("one two three")).toBe(1);
    expect(minutesForText(Array.from({ length: 221 }, () => "w").join(" "))).toBe(3);
    expect(partMinutes([p("morning", "trisagion"), { kind: "names" }, p("morning", "gone")], lookup)).toBeGreaterThanOrEqual(2);
  });
});

describe("praying the rule", () => {
  it("composes a rule of the prayer book's own words, in the reader's order, each with its source and its home", () => {
    const items = [p("third-hour", "troparion"), p("morning", "trisagion"), p("morning", "sign-of-cross")];
    const { rule, missing } = composeRule("morning", items, lookup, NO_NAMES, WORDS);
    expect(missing).toBe(0);
    expect(rule.id).toBe(MY_RULE_IDS.morning);
    expect(rule.kind).toBe("custom");
    expect(rule.prayers.map((x) => x.id)).toEqual(["third-hour--troparion", "morning--trisagion", "morning--sign-of-cross"]);
    const troparion = lookup("third-hour")!.prayers.find((x) => x.id === "troparion")!;
    expect(rule.prayers[0].text).toBe(troparion.text);
    expect(rule.prayers[0].source).toBe(lookup("third-hour")!.source);
    expect(rule.prayers[0].origin).toEqual({ ruleId: "third-hour", prayerId: "troparion" });
    expect(new Set(rule.prayers.map((x) => x.id)).size).toBe(rule.prayers.length);
    expect(rule.estimatedMinutes).toBe(partMinutes(items, lookup));
  });

  it("keeps a sign of the Cross that the prayer's own rubric places, and leaves one its first rule's opening placed", () => {
    const { rule } = composeRule("evening", [p("morning", "sign-of-cross"), p("midday", "glory-to-thee")], lookup, NO_NAMES, WORDS);
    expect(rule.prayers[0].cross).toEqual(["In the name of the Father"]);
    // Midday's first prayer is marked because the midday rule opens with
    // "Make the Sign of the Cross"; brought into another rule, it is not.
    expect(rule.prayers[1].cross).toBeUndefined();
  });

  it("skips a prayer no longer in the prayer book, and says how many", () => {
    const { rule, missing } = composeRule("morning", [p("morning", "trisagion"), p("morning", "gone"), p("nowhere", "x")], lookup, NO_NAMES, WORDS);
    expect(rule.prayers).toHaveLength(1);
    expect(missing).toBe(2);
  });

  it("brings in the reader's names as a step of their own, in our words, never as a prayer of the book", () => {
    const names = {
      living: [{ id: "1", name: "Anna", addedAt: "" }],
      departed: [{ id: "2", name: "Basil", addedAt: "" }],
    };
    const { rule } = composeRule("evening", [{ kind: "names" }], lookup, names, WORDS);
    expect(rule.prayers[0].id).toBe("names");
    expect(rule.prayers[0].instruction).toBe(WORDS.namesInstruction);
    expect(rule.prayers[0].text).toBe("For the living\nAnna\n\nFor the reposed\nBasil");
    expect(rule.prayers[0].origin).toBeUndefined();
    const none = composeRule("evening", [{ kind: "names" }], lookup, NO_NAMES, WORDS).rule.prayers[0];
    expect(none.text).toBeUndefined();
    expect(none.instruction).toBe(WORDS.namesNone);
  });
});

describe("on Today", () => {
  it("leads with the reader's rule only when it has the part the hour calls for", () => {
    const rule = { ...addItem(emptyMyRule(), "morning", p("morning", "trisagion")), minutes: { morning: 3, evening: 0 } };
    expect(todayRuleCard(rule, "morning")).toEqual({ part: "morning", id: "mine-morning", href: "/prayers/personal/morning", minutes: 3 });
    expect(todayRuleCard(rule, "evening")).toBeNull();
    expect(todayRuleCard(emptyMyRule(), "morning")).toBeNull();
  });
});
