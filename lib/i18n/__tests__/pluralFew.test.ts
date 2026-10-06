import { describe, expect, it } from "vitest";
import { getMessages, tn } from "../index";
import type { LocaleCode } from "../locales";

/**
 * A count of 2, 3 or 4 needs a form of its own in the Slavic catalogs.
 *
 * English has two plural forms, so every family starts as `.one` and `.other`,
 * and a translation pass that fills in those two looks finished. In Russian,
 * Ukrainian and Polish that `.other` holds the genitive plural, the form for 5
 * and up. resolvePluralKey falls back to it for the "few" counts (2, 3, 4, 22,
 * 23, 24 and so on), which take a different case. So a post with two replies
 * read "2 ответов", and a campaign with three days to go read "Осталось 3
 * дней".
 *
 * Neither of the other gates sees it. The audit treats a missing `.few` as a
 * form the language may not need, and pluralCounts.test.ts asks only that the
 * form a reader gets prints the count, which the genitive plural does.
 *
 * A family may still leave `.few` out where its `.other` reads right for 2 to
 * 4 as well. Those are listed below with the reason, so that leaving the form
 * out is something somebody decided and not something nobody wrote.
 *
 * The families checked are the ones pluralCounts.test.ts checks: those whose
 * English prints {count}.
 */

type Messages = Record<string, string>;

/** Locales where 2 to 4 take a case of their own. */
const FEW_LOCALES: LocaleCode[] = ["ru", "uk", "pl", "sr"];

/**
 * Families with no `.few`, and why the `.other` they fall back to is right.
 *
 * Serbian masculine and neuter nouns spell the form after 2 to 4 like the
 * genitive plural, so one string serves both. Feminine nouns do not (2 молитве,
 * 5 молитава), and those carry a `.few`.
 */
const OTHER_READS_RIGHT: Partial<Record<LocaleCode, Record<string, string>>> = {
  uk: {
    "saints.worksAvailable": "the number follows a colon: Доступно творів: 2",
  },
  sr: {
    "bible.referenceCount": "2 навода, 5 навода",
    "bible.openReferences": "Отвори 2 навода, Отвори 5 навода",
    "bible.commentariesCount": "2 тумачења, 5 тумачења",
    "prayers.search.matchCount": "2 резултата, 5 резултата",
    "community.replyCount": "2 одговора, 5 одговора",
    "campaigns.daysLeft": "2 дана, 5 дана",
  },
};

/** Two-form families whose English prints the count. */
function countedFamilies(messages: Messages): string[] {
  const stems = new Set<string>();
  for (const key of Object.keys(messages)) {
    if (!key.endsWith(".one")) continue;
    const stem = key.slice(0, key.lastIndexOf("."));
    const other = messages[`${stem}.other`];
    if (other === undefined) continue;
    if (messages[key].includes("{count}") || other.includes("{count}")) stems.add(stem);
  }
  return [...stems].sort();
}

/** Families that hand 2 to 4 the `.other` form, with no reason on record. */
function withoutFew(
  messages: Messages,
  stems: string[],
  excused: Record<string, string> = {},
): string[] {
  return stems.filter((stem) => messages[`${stem}.few`] === undefined && !(stem in excused));
}

const EN = getMessages("en");
const COUNTED = countedFamilies(EN);

describe("few forms in the Slavic catalogs", () => {
  it("finds the families and the locales it has to check", () => {
    // An empty list on either side would pass everything below.
    expect(COUNTED).toEqual(
      expect.arrayContaining(["community.replyCount", "community.unreadCount", "campaigns.daysLeft"]),
    );
    for (const code of FEW_LOCALES) {
      expect(new Intl.PluralRules(code).select(2)).toBe("few");
    }
    // English is merged under every locale. It has no `.few`, so one found in
    // a merged catalog is the locale's own.
    expect(Object.keys(EN).filter((key) => key.endsWith(".few"))).toEqual([]);
  });

  it("flags the Russian catalog as it shipped", () => {
    const shipped: Messages = {
      "community.replyCount.one": "{count} ответ",
      "community.replyCount.other": "{count} ответов",
    };
    expect(withoutFew(shipped, ["community.replyCount"])).toEqual(["community.replyCount"]);
    expect(tn(shipped, "ru", "community.replyCount", 2)).toBe("2 ответов");
  });

  it.each(FEW_LOCALES)("%s: every counted family has a .few, or a reason to do without", (code) => {
    expect(withoutFew(getMessages(code), COUNTED, OTHER_READS_RIGHT[code])).toEqual([]);
  });

  it.each(FEW_LOCALES)("%s: no reason outlives the form it excused", (code) => {
    const messages = getMessages(code);
    const stale = Object.keys(OTHER_READS_RIGHT[code] ?? {}).filter(
      (stem) => messages[`${stem}.few`] !== undefined || !COUNTED.includes(stem),
    );
    expect(stale).toEqual([]);
  });

  it("reads the counts it was reported with", () => {
    const render = (code: LocaleCode, stem: string, count: number) =>
      tn(getMessages(code), code, stem, count);
    expect(render("ru", "community.replyCount", 2)).toBe("2 ответа");
    expect(render("ru", "campaigns.daysLeft", 3)).toBe("Осталось 3 дня");
    expect(render("uk", "community.replyCount", 2)).toBe("2 відповіді");
    expect(render("uk", "campaigns.daysLeft", 2)).toBe("Залишилося 2 дні");
    expect(render("pl", "community.unreadCount", 2)).toBe("2 nowe");
    // The form for 2 to 4 took nothing from 1, 5 or 21, and 22 gets it too.
    expect(render("ru", "community.replyCount", 1)).toBe("1 ответ");
    expect(render("ru", "community.replyCount", 5)).toBe("5 ответов");
    expect(render("ru", "community.replyCount", 21)).toBe("21 ответ");
    expect(render("ru", "community.replyCount", 22)).toBe("22 ответа");
  });

  it("keeps the Polish form for 5 and up apart from the form for 2 to 4", () => {
    // Two Polish families had it the other way round. Their `.other` held the
    // form for 2 to 4, so five references read "5 odniesienia".
    const pl = getMessages("pl");
    expect(tn(pl, "pl", "bible.referenceCount", 2)).toBe("2 odniesienia");
    expect(tn(pl, "pl", "bible.referenceCount", 5)).toBe("5 odniesień");
    expect(tn(pl, "pl", "bible.openReferences", 5)).toBe("Otwórz 5 odniesień");
  });
});
