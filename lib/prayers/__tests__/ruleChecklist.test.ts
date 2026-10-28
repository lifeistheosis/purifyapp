import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { PrayersHero } from "@/components/mobile/PrayersHero";
import { RuleChecklist, RuleToday } from "@/components/prayers/RuleToday";
import { getMessages } from "@/lib/i18n";
import { libraryRule } from "@/lib/prayers/library";
import { emptyMyRule, type MyRule, type MyRulePart } from "@/lib/prayers/myRule";
import { ruleToday } from "@/lib/prayers/ruleToday";

/**
 * Your rule today as it is drawn (1.8, the owner's merged pick of round 4):
 * the ring and the line beside it, the rows with their checks, and the way
 * on, as m04-prayers.png draws them. The rule's logic is ruleToday.test.ts.
 */

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const lookup = (id: string) => libraryRule(id, "en");
const morning = (...ids: string[]) => ids.map((prayer) => ({ kind: "prayer" as const, rule: "morning", prayer }));
const RULE: MyRule = {
  ...emptyMyRule(),
  morning: morning("sign-of-cross", "glory-to-thee", "heavenly-king", "trisagion"),
  evening: [{ kind: "prayer", rule: "evening", prayer: "examination" }],
  minutes: { morning: 4, evening: 1 },
};

function draw(rule: MyRule, done: string[], kept: MyRulePart[] = [], locale = "en"): string {
  const today = ruleToday(rule, "morning", { done: () => new Set(done), kept: (p) => kept.includes(p) }, lookup)!;
  return renderToString(
    createElement(
      MessagesProvider,
      { locale, messages: getMessages(locale) } as ProviderProps,
      createElement(RuleChecklist, { today, ruleName: (id: string) => (id === "morning" ? "Morning prayers" : id) }),
    ),
  );
}

describe("the checklist", () => {
  it("draws what is done and what is next, as the design does", () => {
    const html = draw(RULE, ["morning--sign-of-cross", "morning--glory-to-thee"]);
    expect(html).toContain("Your rule today");
    // The ring's count and the line beside it: the four prayers and tonight's rule.
    expect(html).toContain("2<!-- -->/<!-- -->5");
    expect(html).toContain("2 done, 3 to go");
    expect(html.match(/rule-check-lit/g)).toHaveLength(2);
    for (const title of ["The Sign of the Cross", "Glory to Thee, our God", "O Heavenly King", "The Trisagion", "Your evening rule"]) {
      expect(html, title).toContain(title);
    }
    expect(html).toContain("From Morning prayers");
    expect(html).toContain("Tonight");
    // Continue opens the part at the first prayer not yet marked.
    expect(html).toContain('href="/prayers/personal/morning#morning--heavenly-king"');
    expect(html).toContain("Continue: O Heavenly King");
  });

  it("begins at the start while nothing is marked", () => {
    const html = draw(RULE, []);
    expect(html).toContain("0 done, 5 to go");
    expect(html).toContain('href="/prayers/personal/morning"');
    expect(html).toContain("Pray my rule");
    expect(html).not.toContain("Continue:");
  });

  it("says the day is prayed when it is, with nothing more to press", () => {
    const html = draw(RULE, ["sign-of-cross", "glory-to-thee", "heavenly-king", "trisagion"].map((p) => `morning--${p}`), ["evening"]);
    expect(html).toContain("Prayed today");
    expect(html).not.toContain("Continue:");
    expect(html).not.toContain("Pray my rule");
  });

  it("folds a long part to five rows and offers the rest", () => {
    const long: MyRule = {
      ...RULE,
      morning: morning(...lookup("morning")!.prayers.map((p) => p.id)),
    };
    const html = draw(long, []);
    // Five of the morning's ten, and the evening's row.
    expect(html.match(/<li /g)).toHaveLength(6);
    expect(html).toContain("See all");
  });

  it("speaks the reader's language", () => {
    const el = getMessages("el");
    const html = draw(RULE, ["morning--sign-of-cross"], [], "el");
    expect(html).toContain(el["prayers.ruleToday.title"]);
    expect(html).toContain("Ολοκληρώθηκαν: 1, απομένουν: 4");
    expect(html).not.toContain("Your rule today");
  });
});

describe("the head as the apps' export bakes it", () => {
  it("is the picture and the verse, with the rule's outline until the device is read", () => {
    const html = renderToString(
      createElement(
        MessagesProvider,
        { locale: "en", messages: getMessages("en") } as ProviderProps,
        createElement(PrayersHero, null, createElement(RuleToday, { hourPart: "morning" })),
      ),
    );
    expect(html).toContain('src="/sections/prayers.v2.jpg"');
    expect(html).toContain("Pray without ceasing.");
    expect(html).toContain("1 Thessalonians 5:17");
    // Nothing of the reader's is in the page as built: neither a rule nor the offer to make one.
    expect(html).not.toContain("Your rule today");
    expect(html).not.toContain("Make your rule");
    expect(html).not.toMatch(/<h1\b/);
  });
});
