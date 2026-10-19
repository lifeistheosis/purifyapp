// The prayer book as the builder of a reader's own rule sees it (1.7): every
// rule with words of its own, then the Hours, each with its prayers.
//
// The files are brought in here, into the code of the pages that need them
// (Your rule, and a part of it being prayed), and nowhere else: the server
// pages read a rule's file from disk when they are built, but a reader's own
// rule is composed on the device, from the device's choice, so its words have
// to travel with the page. About 90 KB of text, which no other page loads.
//
// English, as the apps carry every prayer; German where a rule has a German
// file, for a reader whose language is German.

import { getHour, listHours } from "@/lib/prayers/hours";
import { RULE_CATEGORY_ORDER, readerRules, type RuleCategory } from "@/lib/prayers/rules";
import type { Rule } from "@/lib/prayers/types";

import afterMeals from "@/data/prayers/rules/after-meals.json";
import beforeMeals from "@/data/prayers/rules/before-meals.json";
import beforeSleep from "@/data/prayers/rules/before-sleep.json";
import creed from "@/data/prayers/rules/creed.json";
import creedDe from "@/data/prayers/rules/creed.de.json";
import evening from "@/data/prayers/rules/evening.json";
import eveningDe from "@/data/prayers/rules/evening.de.json";
import lentEphrem from "@/data/prayers/rules/lent-ephrem.json";
import midday from "@/data/prayers/rules/midday.json";
import morning from "@/data/prayers/rules/morning.json";
import morningDe from "@/data/prayers/rules/morning.de.json";
import pascha from "@/data/prayers/rules/pascha.json";
import preCommunion from "@/data/prayers/rules/pre-communion.json";
import protection from "@/data/prayers/rules/protection.json";
import repentance from "@/data/prayers/rules/repentance.json";
import uponWaking from "@/data/prayers/rules/upon-waking.json";

/** Every rule file the registry points at. lib/prayers/__tests__/library.test.ts keeps it whole. */
export const RULE_FILES: Record<string, Rule> = {
  "rules/after-meals.json": afterMeals as Rule,
  "rules/before-meals.json": beforeMeals as Rule,
  "rules/before-sleep.json": beforeSleep as Rule,
  "rules/creed.json": creed as Rule,
  "rules/evening.json": evening as Rule,
  "rules/lent-ephrem.json": lentEphrem as Rule,
  "rules/midday.json": midday as Rule,
  "rules/morning.json": morning as Rule,
  "rules/pascha.json": pascha as Rule,
  "rules/pre-communion.json": preCommunion as Rule,
  "rules/protection.json": protection as Rule,
  "rules/repentance.json": repentance as Rule,
  "rules/upon-waking.json": uponWaking as Rule,
};

const RULE_FILES_DE: Record<string, Rule> = {
  "rules/creed.json": creedDe as Rule,
  "rules/evening.json": eveningDe as Rule,
  "rules/morning.json": morningDe as Rule,
};

export type LibraryGroup = RuleCategory | "hours";

export type LibraryRule = {
  /** The rule's id in the registry, or the Hour's slug. */
  id: string;
  group: LibraryGroup;
  rule: Rule;
  /** The language its words are in. */
  lang: "en" | "de";
};

const built = new Map<string, LibraryRule[]>();

/** The prayer book in its own order: the rules by category, then the Hours. */
export function libraryRules(locale: string): LibraryRule[] {
  const key = locale === "de" ? "de" : "en";
  const done = built.get(key);
  if (done) return done;
  const rules: LibraryRule[] = [];
  for (const category of RULE_CATEGORY_ORDER) {
    for (const meta of readerRules().filter((r) => r.category === category)) {
      const file = meta.file ? RULE_FILES[meta.file] : undefined;
      if (!file) continue;
      const de = locale === "de" && meta.file ? RULE_FILES_DE[meta.file] : undefined;
      rules.push({ id: meta.id, group: category, rule: de ?? file, lang: de ? "de" : "en" });
    }
  }
  for (const h of listHours()) {
    const rule = getHour(h.slug);
    if (rule) rules.push({ id: h.slug, group: "hours", rule, lang: "en" });
  }
  built.set(key, rules);
  return rules;
}

/** One rule of the prayer book by its id, in the reader's language where it has one. */
export function libraryRule(id: string, locale: string): Rule | null {
  return libraryRules(locale).find((r) => r.id === id)?.rule ?? null;
}
