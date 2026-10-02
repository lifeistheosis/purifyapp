import { describe, expect, it } from "vitest";
import { getMessages } from "../index";
import { LOCALES, type LocaleCode } from "../locales";
import { resolvePluralKey } from "../plural";

/**
 * A plural form that more than one count can reach has to print the count.
 *
 * English picks `.one` only for 1, so "1 reply" was a fine English string, and
 * every translation pass copied the digit along with it. CLDR does not draw
 * that line in the same place everywhere. French and Portuguese read 0 as
 * "one", Filipino reads 0, 2, 3, 5 and most other numbers as "one", and
 * Russian, Serbian and Ukrainian read 21, 31, 41 and so on as "one". So a post
 * with no replies said "1 réponse" in the French feed, and a campaign with 21
 * days to go said "Остался 1 день".
 *
 * catalogs.test.ts could not see it. It checks that each translation carries
 * the placeholders English carries, and "1 reply" carried none to lose.
 *
 * Leaving the count out is still right where CLDR pins a category to exactly
 * one number: Arabic writes its zero, one and two as words, and Nepali writes
 * its one as १. Families whose English never prints {count} are not checked
 * either. A label like "cards opened" sits beside a number drawn elsewhere, so
 * there is no number in the string to get wrong.
 */

type Messages = Record<string, string>;

const FORMS = ["zero", "one", "two", "few", "many", "other", "singular", "plural"];

/** Plural families whose English prints the count in at least one form. */
function countedFamilies(messages: Messages): string[] {
  const stems = new Set<string>();
  for (const [key, value] of Object.entries(messages)) {
    const dot = key.lastIndexOf(".");
    if (FORMS.includes(key.slice(dot + 1)) && value.includes("{count}")) {
      stems.add(key.slice(0, dot));
    }
  }
  return [...stems].sort();
}

/** Every count up to 1000, plus the round millions es, fr, it and pt send to "many". */
const PROBES = [...Array.from({ length: 1001 }, (_, n) => n), 1_000_000, 2_000_000];

/** The counts each CLDR category is chosen for, in this locale. */
function reach(code: LocaleCode): Map<string, number[]> {
  const rules = new Intl.PluralRules(code);
  const out = new Map<string, number[]>();
  for (const n of PROBES) {
    const category = rules.select(n);
    const counts = out.get(category);
    if (counts) counts.push(n);
    else out.set(category, [n]);
  }
  return out;
}

/**
 * Forms that more than one count can reach but that print no {count}.
 *
 * Each form is resolved the way tn() resolves it, through resolvePluralKey
 * over the merged catalog, so a form a locale leaves out is judged by the
 * English, legacy or `.other` form the reader actually gets instead.
 */
function formsWithoutCount(code: LocaleCode, messages: Messages, stems: string[]): string[] {
  const found: string[] = [];
  for (const [category, counts] of reach(code)) {
    if (counts.length < 2) continue; // CLDR pins it to one number
    for (const stem of stems) {
      const form = resolvePluralKey(messages, stem, counts[0], code);
      if (!form.includes("{count}")) {
        found.push(`${stem} (${category}: ${counts.slice(0, 4).join(", ")}...) "${form}"`);
      }
    }
  }
  return found;
}

/** Families whose `.one` form prints no {count}. */
function onesWithoutCount(messages: Messages, stems: string[]): string[] {
  return stems.filter((stem) => {
    const one = messages[`${stem}.one`];
    return one !== undefined && !one.includes("{count}");
  });
}

const CODES = LOCALES.map((l) => l.code);
const COUNTED = countedFamilies(getMessages("en"));
/** Locales whose CLDR "one" also covers 0, so a count of zero renders `.one`. */
const ZERO_READS_ONE = CODES.filter((code) => new Intl.PluralRules(code).select(0) === "one");

describe("plural forms that print a count", () => {
  it("finds the families and the locales it has to check", () => {
    // An empty list on either side would pass everything below.
    expect(COUNTED).toEqual(
      expect.arrayContaining(["community.replyCount", "community.unreadCount", "campaigns.daysLeft"]),
    );
    expect(ZERO_READS_ONE).toEqual(expect.arrayContaining(["fr", "pt", "fil"]));
  });

  it("flags the French catalog as it shipped", () => {
    const shipped: Messages = {
      "community.replyCount.one": "1 réponse",
      "community.replyCount.other": "{count} réponses",
    };
    expect(onesWithoutCount(shipped, ["community.replyCount"])).toEqual(["community.replyCount"]);
    expect(formsWithoutCount("fr", shipped, ["community.replyCount"])).toHaveLength(1);
  });

  it.each(ZERO_READS_ONE)("%s renders .one for zero, so every .one form carries {count}", (code) => {
    expect(onesWithoutCount(getMessages(code), COUNTED)).toEqual([]);
  });

  it.each(CODES)("%s: every form that more than one count reaches carries {count}", (code) => {
    expect(formsWithoutCount(code, getMessages(code), COUNTED)).toEqual([]);
  });
});
