// Your rule today (1.8): the reader's own rule as the checklist at the head of
// Prayers, the owner's merged pick of round 4 (2026-10-27, "the Pantocrator
// and the verse fading in at the top, then your rule as a checklist";
// Homebase/boards/purify-master/variants/m04-prayers.png, Merged).
//
// The rule is the reader's own (1.7, lib/prayers/myRule.ts): a morning part
// and an evening part, each a list of prayers chosen from the prayer book.
// The checklist lists the part the hour calls for, prayer by prayer, with the
// mark each one carries today, the same mark "Mark prayed" makes in the
// prayer reader (purify.prayers.mine-<part>.today.<day>, under the step's own
// id). The other part stands as one row, before it in the evening and after
// it in the morning ("Tonight"), done when it was prayed through today. What
// is next is the first prayer of the listed part not yet marked.
//
// Nothing here keeps anything: it reads the marks the reader already makes.
// Pure, so lib/prayers/__tests__/ruleToday.test.ts reads it with no DOM.

import { MY_RULE_PARTS, itemKey, partMinutes, prayerMinutes, type MyRule, type MyRuleItem, type MyRulePart } from "@/lib/prayers/myRule";
import type { Rule } from "@/lib/prayers/types";

/** One step of the listed part: a prayer of the prayer book, or "Those I pray for". */
export type RuleTodayStep = {
  kind: "prayer" | "names";
  /** The item's key in the rule (lib/prayers/myRule.ts, itemKey). */
  key: string;
  part: MyRulePart;
  /** The step's id in the composed rule: its mark, and the place it is read at. */
  stepId: string;
  /** The prayer's own title, as the prayer reader shows it; empty for the names. */
  title: string;
  /** The rule a prayer was chosen from; empty for the names. */
  fromRule: string;
  minutes: number;
  done: boolean;
  /** Opens the part at this step. */
  href: string;
};

/** The other part of the rule, as one row. */
export type RuleTodayPart = {
  kind: "part";
  key: string;
  part: MyRulePart;
  /** How many steps it holds. */
  count: number;
  minutes: number;
  /** Prayed through today. */
  done: boolean;
  /** It is the evening part, and the morning is the one being prayed. */
  tonight: boolean;
  href: string;
};

export type RuleTodayRow = RuleTodayStep | RuleTodayPart;

export type RuleToday = {
  /** The part listed step by step. */
  part: MyRulePart;
  /** Every row in the day's order: the morning part's before the evening's. */
  rows: RuleTodayRow[];
  /** The listed part's steps, in order (also in `rows`). */
  steps: RuleTodayStep[];
  /** The other part's row, when the reader has one (also in `rows`). */
  other: RuleTodayPart | null;
  /** Rows marked done today, of `total`. */
  done: number;
  total: number;
  /** The first of the listed part's steps not yet marked; null when all are. */
  next: RuleTodayStep | null;
};

/** The part's page: where Pray my rule and every row of the checklist lead. */
export function partHref(part: MyRulePart): string {
  return `/prayers/personal/${part}`;
}

/**
 * A step's id in the composed rule (composeRule): the rule and the prayer
 * joined, or "names" for the reader's own names. Its mark is kept under it,
 * and the prayer page gives its section the same id.
 */
export function stepIdOf(item: MyRuleItem): string {
  return item.kind === "names" ? "names" : `${item.rule}--${item.prayer}`;
}

/**
 * The part's steps as the prayer reader will show them: a prayer no longer in
 * the prayer book is left out here as it is there (composeRule).
 */
function stepsOf(
  part: MyRulePart,
  items: readonly MyRuleItem[],
  done: ReadonlySet<string>,
  lookup: (ruleId: string) => Rule | null,
): RuleTodayStep[] {
  const out: RuleTodayStep[] = [];
  for (const item of items) {
    const stepId = stepIdOf(item);
    const href = `${partHref(part)}#${stepId}`;
    if (item.kind === "names") {
      out.push({ kind: "names", key: itemKey(item), part, stepId, title: "", fromRule: "", minutes: 1, done: done.has(stepId), href });
      continue;
    }
    const prayer = lookup(item.rule)?.prayers.find((p) => p.id === item.prayer);
    if (!prayer) continue;
    out.push({
      kind: "prayer",
      key: itemKey(item),
      part,
      stepId,
      title: prayer.title,
      fromRule: item.rule,
      minutes: prayerMinutes(prayer),
      done: done.has(stepId),
      href,
    });
  }
  return out;
}

/**
 * The reader's rule for today, or null when they have none yet (or nothing in
 * it is still in the prayer book), and the page offers to make one.
 *
 * `hourPart` is the part the hour calls for (lib/prayers/ruleForHour.ts); a
 * reader with only the other part has that one listed instead, as Pray my
 * rule opens it. `marks.done(part)` is the day's marked step ids of a part,
 * `marks.kept(part)` whether it was prayed through today.
 */
export function ruleToday(
  rule: MyRule,
  hourPart: MyRulePart,
  marks: { done: (part: MyRulePart) => ReadonlySet<string>; kept: (part: MyRulePart) => boolean },
  lookup: (ruleId: string) => Rule | null,
): RuleToday | null {
  const has = (part: MyRulePart) => rule[part].length > 0;
  const part = has(hourPart) ? hourPart : MY_RULE_PARTS.find(has);
  if (!part) return null;

  const steps = stepsOf(part, rule[part], marks.done(part), lookup);
  const otherPart = MY_RULE_PARTS.find((p) => p !== part && has(p)) ?? null;
  let other: RuleTodayPart | null = null;
  if (otherPart) {
    const count = stepsOf(otherPart, rule[otherPart], new Set(), lookup).length;
    if (count > 0) {
      other = {
        kind: "part",
        key: `part:${otherPart}`,
        part: otherPart,
        count,
        minutes: rule.minutes[otherPart] || partMinutes(rule[otherPart], lookup),
        done: marks.kept(otherPart),
        tonight: otherPart === "evening",
        href: partHref(otherPart),
      };
    }
  }
  if (steps.length === 0 && !other) return null;

  // The day's order: the morning's part first.
  const rows: RuleTodayRow[] = other ? (other.part === "morning" ? [other, ...steps] : [...steps, other]) : [...steps];
  return {
    part,
    rows,
    steps,
    other,
    done: rows.filter((r) => r.done).length,
    total: rows.length,
    next: steps.find((s) => !s.done) ?? null,
  };
}

/** How many of the listed part's steps show before "See all". */
export const RULE_WINDOW = 5;

/**
 * Which of the listed part's steps show while the list is folded: every one
 * when there are at most one more than the window (folding away a single row
 * saves nothing), otherwise five, starting at the step before the next one,
 * so what was just prayed and what comes after it are both in view. A part
 * prayed through shows its last five.
 */
export function stepWindow(count: number, nextIndex: number, size: number = RULE_WINDOW): { start: number; end: number } {
  if (count <= size + 1) return { start: 0, end: count };
  const from = nextIndex < 0 ? count - size : Math.max(0, nextIndex - 1);
  const start = Math.min(from, count - size);
  return { start, end: start + size };
}
