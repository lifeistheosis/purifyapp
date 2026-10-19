// Your rule (1.7, the owner's note 17: "Your own rule is the least useful
// and least finished page in Prayers. Needs a real rethink."): a reader's own
// morning and evening rule, chosen from the prayer book, set in their order,
// and prayed as one rule in the prayer reader.
//
// What is kept is only what was chosen: for each part, the prayers by their
// rule's id and their own (and, if chosen, "those I pray for", the reader's
// names). The words are never copied: they are read from the prayer book's
// own files when the rule is prayed (composeRule), so a correction to a
// prayer reaches every rule that holds it.
//
//   purify.prayers.mine    JSON MyRule    on this device only, for now
//
// The key does not end in ".dates", so the streak and the prayer sync, which
// read every purify.prayers.<id>.dates key, never take it for a ledger. A
// rule prayed through is kept under mine-morning or mine-evening, which ARE
// ledger ids (no colon, well under the sync's 80 characters), so finishing a
// rule of one's own keeps the day exactly as finishing the Morning Rule does,
// with no new table and no migration.
//
// This file is the model, pure and safe on the server (the route that prays
// a part lists its pages from MY_RULE_PARTS). Reading and keeping it on the
// device is lib/prayers/useMyRule.ts.

import { rubricMakesTheCross } from "@/lib/prayers/lines";
import type { Intention } from "@/lib/prayers/storage";
import type { Prayer, Rule } from "@/lib/prayers/types";

export type MyRulePart = "morning" | "evening";

export const MY_RULE_PARTS: readonly MyRulePart[] = ["morning", "evening"];

export type MyRuleItem = { kind: "prayer"; rule: string; prayer: string } | { kind: "names" };

export type MyRule = {
  v: 1;
  morning: MyRuleItem[];
  evening: MyRuleItem[];
  /**
   * Each part's length, worked out where the words are at hand (the builder)
   * and kept with the rule, so Today can say it without carrying the prayer
   * book in its own code.
   */
  minutes: Record<MyRulePart, number>;
  updatedAt: string;
};

export const MY_RULE_KEY = "purify.prayers.mine";
export const MY_RULE_EVENT = "purify:my-rule";

/** The ledger ids a rule of one's own is kept under, for the streak and the sync. */
export const MY_RULE_IDS: Record<MyRulePart, string> = {
  morning: "mine-morning",
  evening: "mine-evening",
};

/** At most this many prayers in a part: a rule, not the whole prayer book. */
export const MY_RULE_CAP = 60;

export function emptyMyRule(): MyRule {
  return { v: 1, morning: [], evening: [], minutes: { morning: 0, evening: 0 }, updatedAt: "" };
}

const ID = /^[a-z0-9-]{1,80}$/;

function parseItem(x: unknown): MyRuleItem | null {
  if (!x || typeof x !== "object") return null;
  const o = x as { kind?: unknown; rule?: unknown; prayer?: unknown };
  if (o.kind === "names") return { kind: "names" };
  if (o.kind === "prayer" && typeof o.rule === "string" && typeof o.prayer === "string" && ID.test(o.rule) && ID.test(o.prayer)) {
    return { kind: "prayer", rule: o.rule, prayer: o.prayer };
  }
  return null;
}

/** The stored rule, kept to well-formed items, each once, at most the cap. */
export function parseMyRule(raw: string | null): MyRule {
  const out = emptyMyRule();
  if (!raw) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== "object") return out;
  const o = parsed as Partial<Record<MyRulePart, unknown>> & { minutes?: unknown; updatedAt?: unknown };
  for (const part of MY_RULE_PARTS) {
    const list = Array.isArray(o[part]) ? (o[part] as unknown[]) : [];
    const seen = new Set<string>();
    for (const x of list) {
      const item = parseItem(x);
      if (!item || seen.has(itemKey(item)) || out[part].length >= MY_RULE_CAP) continue;
      seen.add(itemKey(item));
      out[part].push(item);
    }
    const m = (o.minutes as Partial<Record<MyRulePart, unknown>> | undefined)?.[part];
    out.minutes[part] = typeof m === "number" && Number.isFinite(m) && m >= 0 ? Math.round(m) : 0;
  }
  out.updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : "";
  return out;
}

/** One name per item, so a prayer is in a part at most once. */
export function itemKey(item: MyRuleItem): string {
  return item.kind === "names" ? "names" : `${item.rule}/${item.prayer}`;
}

function withPart(rule: MyRule, part: MyRulePart, items: MyRuleItem[]): MyRule {
  return { ...rule, [part]: items, updatedAt: new Date().toISOString() };
}

/** Add at the end; nothing happens to a prayer already there or a part at the cap. */
export function addItem(rule: MyRule, part: MyRulePart, item: MyRuleItem): MyRule {
  const items = rule[part];
  if (items.length >= MY_RULE_CAP || items.some((x) => itemKey(x) === itemKey(item))) return rule;
  return withPart(rule, part, [...items, item]);
}

/** Add several at the end, in order, skipping any already there, up to the cap. */
export function addItems(rule: MyRule, part: MyRulePart, add: MyRuleItem[]): MyRule {
  let next = rule;
  for (const item of add) next = addItem(next, part, item);
  return next;
}

/** Put an item back where it was (Undo after Remove). */
export function insertAt(rule: MyRule, part: MyRulePart, index: number, item: MyRuleItem): MyRule {
  const items = rule[part];
  if (items.length >= MY_RULE_CAP || items.some((x) => itemKey(x) === itemKey(item))) return rule;
  const at = Math.max(0, Math.min(index, items.length));
  return withPart(rule, part, [...items.slice(0, at), item, ...items.slice(at)]);
}

export function removeAt(rule: MyRule, part: MyRulePart, index: number): MyRule {
  if (index < 0 || index >= rule[part].length) return rule;
  return withPart(
    rule,
    part,
    rule[part].filter((_, i) => i !== index),
  );
}

/** Move one item from one place to another in its part. */
export function moveItem(rule: MyRule, part: MyRulePart, from: number, to: number): MyRule {
  const items = rule[part];
  if (from < 0 || from >= items.length) return rule;
  const at = Math.max(0, Math.min(to, items.length - 1));
  if (at === from) return rule;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(at, 0, item);
  return withPart(rule, part, next);
}

export function withMinutes(rule: MyRule, minutes: Record<MyRulePart, number>): MyRule {
  return { ...rule, minutes };
}

/** A prayer's length, read at about 110 words a minute, a minute at the least. */
export function minutesForText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 110));
}

/** How long one prayer is to read: its own words, or its first wording's. */
export function prayerMinutes(p: Prayer): number {
  const text = p.text ?? p.variants?.[0]?.text ?? p.instruction ?? "";
  return minutesForText(text);
}

/** How long a part is to pray: its prayers' lengths, and a minute for the names. */
export function partMinutes(items: readonly MyRuleItem[], lookup: (ruleId: string) => Rule | null): number {
  let minutes = 0;
  for (const item of items) {
    if (item.kind === "names") {
      minutes += 1;
      continue;
    }
    const p = lookup(item.rule)?.prayers.find((x) => x.id === item.prayer);
    if (p) minutes += prayerMinutes(p);
  }
  return minutes;
}

/** The words a composed rule needs that the app supplies, in the reader's language. */
export type ComposeWords = {
  title: string;
  namesTitle: string;
  /** Our words, not a prayer book's: marked for a future clergy review. */
  namesInstruction: string;
  namesNone: string;
  living: string;
  departed: string;
};

/**
 * A part of the reader's rule as a Rule the prayer reader can show.
 *
 * Each step keeps its own words, its own source and where it came from (so
 * its bookmark is the prayer's own). Its id joins the two, so a prayer is
 * marked prayed in this rule without touching its own rule's marks. A sign
 * of the Cross stays where the prayer's own rubric puts it; one that stood
 * on its first rule's opening words is left with that rule. A prayer no
 * longer in the prayer book is skipped, and counted in `missing`.
 */
export function composeRule(
  part: MyRulePart,
  items: readonly MyRuleItem[],
  lookup: (ruleId: string) => Rule | null,
  names: { living: Intention[]; departed: Intention[] },
  words: ComposeWords,
): { rule: Rule; missing: number } {
  const prayers: Prayer[] = [];
  let missing = 0;
  let minutes = 0;
  for (const item of items) {
    if (item.kind === "names") {
      const living = names.living.map((n) => n.name.trim()).filter(Boolean);
      const departed = names.departed.map((n) => n.name.trim()).filter(Boolean);
      const blocks = [
        living.length ? [words.living, ...living].join("\n") : "",
        departed.length ? [words.departed, ...departed].join("\n") : "",
      ].filter(Boolean);
      prayers.push({
        id: "names",
        title: words.namesTitle,
        instruction: blocks.length ? words.namesInstruction : words.namesNone,
        ...(blocks.length ? { text: blocks.join("\n\n") } : {}),
      });
      minutes += 1;
      continue;
    }
    const from = lookup(item.rule);
    const p = from?.prayers.find((x) => x.id === item.prayer);
    if (!from || !p) {
      missing += 1;
      continue;
    }
    const ownCross = rubricMakesTheCross(p.title) || rubricMakesTheCross(p.instruction);
    const { cross, ...rest } = p;
    prayers.push({
      ...rest,
      ...(ownCross && cross ? { cross } : {}),
      id: `${item.rule}--${p.id}`,
      source: p.source ?? from.source,
      origin: { ruleId: item.rule, prayerId: p.id },
    });
    minutes += prayerMinutes(p);
  }
  return {
    rule: {
      id: MY_RULE_IDS[part],
      kind: "custom",
      title: words.title,
      intro: "",
      estimatedMinutes: Math.max(1, minutes),
      source: "",
      prayers,
    },
    missing,
  };
}

/**
 * The card Today leads its Pray row with, when the reader's rule has the
 * part the hour calls for; null otherwise, and Today is as it always was.
 */
export function todayRuleCard(rule: MyRule, hourPart: MyRulePart): { part: MyRulePart; id: string; href: string; minutes: number } | null {
  if (rule[hourPart].length === 0) return null;
  return {
    part: hourPart,
    id: MY_RULE_IDS[hourPart],
    href: `/prayers/personal/${hourPart}`,
    minutes: rule.minutes[hourPart],
  };
}
