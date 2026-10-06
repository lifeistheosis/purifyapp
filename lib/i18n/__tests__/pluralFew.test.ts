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

/**
 * Romanian needs a `.few` as well, for a reason of its own, and one word more.
 *
 * CLDR's "few" in Romanian is 0, 2 to 19, and any number whose last two digits
 * are 01 to 19, so 101 to 119 too. "other" is what is left: 20 to 100, then
 * 120 and up. There Romanian puts "de" between the number and the noun: "2
 * capitole", "19 capitole", "20 de capitole", "101 capitole", "120 de
 * capitole".
 *
 * A family with only `.one` and `.other` has one string for both ranges, so
 * one of the two reads wrong. Thirteen shipped that way, with the form for 2
 * to 19 in `.other`. Twelve of them count a noun, so from 20 up they read
 * wrong: the Bible index said "21 capitole", "50 capitole" and "66 capitole".
 *
 * So the rule has two halves. A counted family has a `.few`, and its `.other`
 * is that `.few` with "de" after the number. The second half is the one the
 * Slavic rule above cannot stand in for: a `.few` copied from `.other` passes
 * that rule and still reads "20 capitole".
 *
 * "de" joins a number to a noun. Where something else follows the number, both
 * forms are the same string, and the family is listed below with what follows
 * instead. A number with no word after it ("Au mai rămas 20", "acum 20h", "Mai
 * multe subiecte (20)") has nothing to join and needs no entry.
 *
 * The list records the catalog as it stands and is not a ruling on Romanian. A
 * reader who wants "de" in one of these changes the string, and the test below
 * then asks for its entry to go.
 */

/** Families where no noun follows the number, so 20 and up read like 2 to 19. */
const RO_NO_NOUN: Record<string, string> = {
  "community.modWaiting": "a preposition follows: 2 în așteptare, 20 în așteptare",
  "community.unreadCount": "an adjective follows, with no noun: 2 noi, 20 noi",
  "prayers.approxMin": "a unit symbol follows: ~2 min, ~20 min",
  "shop.soldCount": "a participle follows, with no noun: 2 vândute, 20 vândute",
  "ui.syncMinutesAgo": "a unit symbol follows: acum 2 min, acum 20 min",
};

/** A `.few` form with "de" put after the number, wherever a word follows it. */
function withDe(few: string): string {
  return few.replace(/\{count\} (?=\p{L})/gu, "{count} de ");
}

/** What is wrong with each Romanian family that has no reason on record. */
function romanianFaults(
  messages: Messages,
  stems: string[],
  excused: Record<string, string> = {},
): string[] {
  const found: string[] = [];
  for (const stem of stems) {
    if (stem in excused) continue;
    const few = messages[`${stem}.few`];
    const other = messages[`${stem}.other`];
    if (few === undefined) {
      found.push(`${stem}: no .few, so 2 to 19 and 20 up both read "${other}"`);
    } else if (other !== withDe(few)) {
      found.push(`${stem}: .other is "${other}", and .few with de is "${withDe(few)}"`);
    }
  }
  return found;
}

describe("de after the number in the Romanian catalog", () => {
  const RO = getMessages("ro");
  const render = (stem: string, count: number) => tn(RO, "ro", stem, count);

  it("finds the line Romanian draws at 20, and the families it has to check", () => {
    const rules = new Intl.PluralRules("ro");
    expect(rules.select(1)).toBe("one");
    for (const n of [0, 2, 19, 101, 119]) expect(rules.select(n)).toBe("few");
    for (const n of [20, 21, 100, 120]) expect(rules.select(n)).toBe("other");
    // An empty list would pass everything below.
    expect(COUNTED).toEqual(
      expect.arrayContaining(["bible.chapterCount", "community.unreadCount", "campaigns.daysLeft"]),
    );
  });

  it("flags the Romanian catalog as it shipped", () => {
    const shipped: Messages = {
      "bible.chapterCount.one": "{count} capitol",
      "bible.chapterCount.other": "{count} capitole",
    };
    expect(romanianFaults(shipped, ["bible.chapterCount"])).toHaveLength(1);
    expect(tn(shipped, "ro", "bible.chapterCount", 21)).toBe("21 capitole");
    // A .few copied from .other is the same miss with one more line.
    const copied: Messages = { ...shipped, "bible.chapterCount.few": "{count} capitole" };
    expect(romanianFaults(copied, ["bible.chapterCount"])).toHaveLength(1);
    expect(tn(copied, "ro", "bible.chapterCount", 21)).toBe("21 capitole");
    // And "de" in the only plural form moves the miss down to 2 through 19.
    const moved: Messages = {
      "bible.chapterCount.one": "{count} capitol",
      "bible.chapterCount.other": "{count} de capitole",
    };
    expect(romanianFaults(moved, ["bible.chapterCount"])).toHaveLength(1);
    expect(tn(moved, "ro", "bible.chapterCount", 2)).toBe("2 de capitole");
  });

  it("ro: every counted family has a .few and an .other that adds de to it, or a reason", () => {
    expect(romanianFaults(RO, COUNTED, RO_NO_NOUN)).toEqual([]);
  });

  it("ro: no reason outlives the form it excused", () => {
    const stale = Object.keys(RO_NO_NOUN).filter(
      (stem) => !COUNTED.includes(stem) || romanianFaults(RO, [stem]).length === 0,
    );
    expect(stale).toEqual([]);
  });

  it("reads the counts it was reported with", () => {
    // The Bible index, as it read in production.
    expect(render("bible.chapterCount", 21)).toBe("21 de capitole");
    expect(render("bible.chapterCount", 22)).toBe("22 de capitole");
    expect(render("bible.chapterCount", 50)).toBe("50 de capitole");
    expect(render("bible.chapterCount", 66)).toBe("66 de capitole");
    // Both edges of both ranges, and 1.
    expect(render("bible.chapterCount", 1)).toBe("1 capitol");
    expect(render("bible.chapterCount", 2)).toBe("2 capitole");
    expect(render("bible.chapterCount", 19)).toBe("19 capitole");
    expect(render("bible.chapterCount", 20)).toBe("20 de capitole");
    expect(render("bible.chapterCount", 100)).toBe("100 de capitole");
    expect(render("bible.chapterCount", 101)).toBe("101 capitole");
    expect(render("bible.chapterCount", 119)).toBe("119 capitole");
    expect(render("bible.chapterCount", 120)).toBe("120 de capitole");
    // Words before the number, and words after the noun.
    expect(render("campaigns.daysLeft", 20)).toBe("Au mai rămas 20 de zile");
    expect(render("bible.openReferences", 25)).toBe("Deschide 25 de trimiteri");
    expect(render("prayers.search.matchCount", 20)).toBe("20 de rezultate pentru");
    expect(render("saints.worksAvailable", 40)).toBe("40 de lucrări disponibile");
    // The adjective reads the same on both sides of 20.
    expect(render("community.unreadCount", 19)).toBe("19 noi");
    expect(render("community.unreadCount", 20)).toBe("20 noi");
  });
});
