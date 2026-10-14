// The words the widgets show. What a reader would notice if these broke: a
// widget in English on a Greek phone, "widget.coming" printed on a home screen,
// or "1 days in a row". The why is in ../labels.ts.

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getMessages } from "@/lib/i18n";
import { forgetDeviceDatesForTests } from "@/lib/i18n/deviceDates";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { interpolate, resolvePluralKey } from "@/lib/i18n/plural";

import { buildDayTable } from "../dayTable";
import { FAST_RULE_IDS, usualCount, widgetLabels, type LabelsInput } from "../labels";

afterEach(() => {
  vi.restoreAllMocks();
  forgetDeviceDatesForTests();
});

/** The app's translator for a language, as MessagesProvider builds it: the catalog over English. */
function speaking(code: LocaleCode): Pick<LabelsInput, "t" | "tn" | "locale"> {
  const messages = getMessages(code);
  return {
    locale: code,
    t: (key, vars) => interpolate(messages[key] ?? key, vars),
    tn: (key, count, vars) => interpolate(resolvePluralKey(messages, key, count, code), { ...(vars ?? {}), count }),
  };
}

const labelsIn = (code: LocaleCode, extra: Partial<LabelsInput> = {}) =>
  widgetLabels({ ...speaking(code), streak: 12, nameDayIn: 57, ...extra });

/** The label keys docs/WIDGETS.md lists, read from the contract itself. */
function contractKeys(): string[] {
  const doc = readFileSync("docs/WIDGETS.md", "utf8");
  const part = doc.slice(doc.indexOf("`labels` keys"), doc.indexOf("`update` comes from"));
  return [...part.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1])
    .filter((key) => /^[A-Za-z][A-Za-z0-9.]*$/.test(key) && key !== "labels");
}

/** What the app hands over beyond the list in the contract, each asked for since. */
const ALSO = [
  "monthsShort",
  "season.theophany.title",
  "season.theophany.line",
  "season.dormition.title",
  "season.dormition.line",
  ...FAST_RULE_IDS.map((rule) => `fast.${rule}`),
];

const CODES = LOCALES.map((l) => l.code);

describe("the labels in the contract", () => {
  it("are read from it", () => {
    // An empty read would pass everything below.
    const keys = contractKeys();
    expect(keys.length).toBeGreaterThan(40);
    expect(keys).toEqual(expect.arrayContaining(["verseOfTheDay", "nameDayIn", "weekdaysShort", "done", "season.pascha.title"]));
  });

  it.each(CODES)("%s: every one is handed over, a finished string", (code) => {
    const labels = labelsIn(code);
    for (const key of [...contractKeys(), ...ALSO]) {
      expect(typeof labels[key], `${code} ${key}`).toBe("string");
      expect(labels[key].trim(), `${code} ${key}`).not.toBe("");
    }
  });

  it.each(CODES)("%s: nothing is left for a widget to fill but the name day's {n}", (code) => {
    const labels = labelsIn(code);
    for (const [key, word] of Object.entries(labels)) {
      if (key === "nameDayIn") {
        expect(word.match(/\{[^}]*\}/g), `${code} ${key}`).toEqual(["{n}"]);
      } else {
        expect(word, `${code} ${key}`).not.toMatch(/[{}]/);
      }
      // No em dash, in any language (written as its code, so this file has none).
      expect(word, `${code} ${key}`).not.toContain("—");
      // A key the catalog lacks comes back as the key; it must never be handed over.
      expect(word, `${code} ${key}`).not.toMatch(/^[a-z]+(\.[A-Za-z0-9-]+)+$/);
    }
  });

  it("says in English what the mock says", () => {
    const labels = labelsIn("en");
    expect(labels.verseOfTheDay).toBe("Verse of the Day");
    expect(labels.todayInTheChurch).toBe("Today in the Church");
    expect(labels.thisWeek).toBe("This week");
    expect(labels.today).toBe("Today");
    expect(labels.today0).toBe("Today");
    expect(labels.noFast).toBe("No fast");
    expect(labels.morning).toBe("Morning");
    expect(labels.evening).toBe("Evening");
    expect(labels.morningPrayers).toBe("Morning prayers");
    expect(labels.eveningPrayers).toBe("Evening prayers");
    expect(labels.prayedToday).toBe("Prayed today");
    expect(labels.coming).toBe("Coming");
    expect(labels.days).toBe("days");
    expect(labels.nextUpdate).toBe("Next update");
    expect(labels.chooseLook).toBe("Choose a look");
    expect(labels.done).toBe("Done");
    expect(labels["variant.countdown.update"]).toBe("Next Purify update");
    expect(labels["season.pascha.title"]).toBe("Christ is risen!");
    expect(labels["season.nativity.line"]).toBe("Glorify Him!");
    expect(labels["season.theophany.line"]).toBe("January 6");
    expect(labels["season.dormition.line"]).toBe("August 15");
  });

  it("drops a word the catalog does not have, so the widget keeps its own English", () => {
    const labels = widgetLabels({ locale: "en", t: (key) => key, tn: (key) => key });
    expect(labels.coming).toBeUndefined();
    expect(labels.nameDayIn).toBeUndefined();
    expect(labels["fast.noFast"]).toBeUndefined();
    // The device's own names need no catalog.
    expect(labels.weekdaysShort).toBe("Sun|Mon|Tue|Wed|Thu|Fri|Sat");
  });
});

describe("Pray now", () => {
  it("gives each rule's minutes from the rule's own data", () => {
    const labels = labelsIn("en");
    expect(labels.morningMinutes).toBe("8 min");
    expect(labels.eveningMinutes).toBe("8 min");
    expect(labelsIn("hu").morningMinutes).toBe("8 perc");
  });

  it("names the hour the Evening Rule begins, the way the language tells the time", () => {
    expect(labelsIn("en").afterMorning).toBe("Evening prayers at 5 PM");
    expect(labelsIn("de").afterMorning).toBe("Abendgebete um 17:00");
    expect(labelsIn("ru").afterMorning).toBe("Вечерние молитвы в 17:00");
    expect(labelsIn("en").afterEvening).toBe("Morning prayers tomorrow");
  });
});

describe("the streak", () => {
  it("agrees with its count", () => {
    expect(labelsIn("en", { streak: 1 }).dayStreak).toBe("day in a row");
    expect(labelsIn("en", { streak: 12 }).dayStreak).toBe("days in a row");
    expect(labelsIn("ru", { streak: 1 }).dayStreak).toBe("день подряд");
    expect(labelsIn("ru", { streak: 3 }).dayStreak).toBe("дня подряд");
    expect(labelsIn("ru", { streak: 12 }).dayStreak).toBe("дней подряд");
    expect(labelsIn("ru", { streak: 21 }).dayStreak).toBe("день подряд");
  });

  it("says what the streak sheet says under its number", () => {
    expect(labelsIn("en", { streak: 12 }).keepIt).toBe("Keep it going today: one prayer or one chapter.");
    expect(labelsIn("en", { streak: 0 }).keepIt).toBe("Start your streak today: one prayer or one chapter.");
    expect(labelsIn("en").keptToday).toBe("Today is kept");
  });

  it("takes the form most numbers take when there is no count yet", () => {
    expect(labelsIn("en", { streak: null }).dayStreak).toBe("days in a row");
    expect(labelsIn("ru", { streak: null }).dayStreak).toBe("дней подряд");
  });
});

describe("the name day", () => {
  it("agrees with the days to it, and leaves the number to the widget", () => {
    expect(labelsIn("en", { nameDayIn: 1 }).nameDayIn).toBe("Name day in {n} day");
    expect(labelsIn("en", { nameDayIn: 57 }).nameDayIn).toBe("Name day in {n} days");
    expect(labelsIn("ru", { nameDayIn: 3 }).nameDayIn).toBe("Именины через {n} дня");
    expect(labelsIn("ru", { nameDayIn: 57 }).nameDayIn).toBe("Именины через {n} дней");
    expect(labelsIn("pl", { nameDayIn: 22 }).nameDayIn).toBe("Imieniny za {n} dni");
    expect(labelsIn("en").nameDayToday).toBe("Name day today");
  });

  it("knows the form most numbers take", () => {
    expect(usualCount("en")).toBe(2);
    expect(usualCount("ru")).toBe(5);
    expect(usualCount("ar")).toBe(11);
    expect(usualCount("not a language")).toBe(2);
  });
});

describe("the dates", () => {
  it("are the device's names, Sunday and January first", () => {
    const labels = labelsIn("en");
    expect(labels.weekdaysShort).toBe("Sun|Mon|Tue|Wed|Thu|Fri|Sat");
    expect(labels.monthsLong).toBe(
      "January|February|March|April|May|June|July|August|September|October|November|December",
    );
    expect(labels.monthsShort).toBe("Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec");
  });

  it.each(CODES)("%s: seven days and twelve months, each a name", (code) => {
    const labels = labelsIn(code);
    expect(labels.weekdaysShort.split("|"), code).toHaveLength(7);
    expect(labels.monthsLong.split("|"), code).toHaveLength(12);
    expect(labels.monthsShort.split("|"), code).toHaveLength(12);
    for (const name of [...labels.weekdaysShort.split("|"), ...labels.monthsShort.split("|")]) {
      expect(name, code).toMatch(/\p{L}/u);
    }
  });

  it("gives Bulgarian its months by name, where the engine's short form is a number", () => {
    // Node writes "10" for a short October in Bulgarian, and so may a phone.
    expect(labelsIn("bg").monthsShort).not.toMatch(/\d/);
  });

  it("are in the app's language", () => {
    const greek = labelsIn("el");
    expect(greek.monthsLong.split("|")[9]).toBe(
      new Intl.DateTimeFormat("el", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 9, 15))),
    );
    expect(greek.weekdaysShort).not.toBe(labelsIn("en").weekdaysShort);
  });

  it("fall back to English on a device that cannot write the language", () => {
    vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([]);
    forgetDeviceDatesForTests();
    const georgian = labelsIn("ka");
    expect(georgian.weekdaysShort).toBe("Sun|Mon|Tue|Wed|Thu|Fri|Sat");
    expect(georgian.monthsShort.split("|")[0]).toBe("Jan");
    // The words from the catalog stay Georgian.
    expect(georgian.verseOfTheDay).toBe(getMessages("ka")["today.verseOfDay"]);
  });
});

describe("the fast's chip", () => {
  it("has a word for every rule, the calendar's own", () => {
    const en = getMessages("en");
    const labels = labelsIn("en");
    for (const rule of FAST_RULE_IDS) {
      expect(en[`calendar.fast.${rule}.label`], rule).toBeTruthy();
      expect(labels[`fast.${rule}`], rule).toBe(en[`calendar.fast.${rule}.label`]);
    }
    expect(labelsIn("el")["fast.wednesdayFast"]).toBe(getMessages("el")["calendar.fast.wednesdayFast.label"]);
  });

  it("covers every rule the day table names", () => {
    const table = buildDayTable(new Date(Date.UTC(2026, 0, 1, 12)), 366);
    const named = new Set<string>();
    for (const day of Object.values(table.days)) {
      named.add(day.new.fastRule);
      named.add(day.old.fastRule);
    }
    expect(named.size).toBeGreaterThan(10);
    expect([...named].filter((rule) => !(FAST_RULE_IDS as string[]).includes(rule))).toEqual([]);
  });
});

describe("the catalogs' widget words", () => {
  const GREETINGS = [
    "widget.season.pascha.title",
    "widget.season.pascha.line",
    "widget.season.nativity.title",
    "widget.season.nativity.line",
  ];

  it.each(CODES)("%s: has all of them, in its own words", (code) => {
    const own = JSON.parse(readFileSync(`lib/i18n/messages/${code}.json`, "utf8")) as Record<string, string>;
    const en = getMessages("en");
    for (const key of Object.keys(en).filter((k) => k.startsWith("widget."))) {
      expect(own[key], `${code} ${key}`).toBeTruthy();
    }
  });

  it.each(CODES)("%s: no exclamation mark but the Church's two greetings", (code) => {
    const own = JSON.parse(readFileSync(`lib/i18n/messages/${code}.json`, "utf8")) as Record<string, string>;
    for (const [key, word] of Object.entries(own)) {
      if (!key.startsWith("widget.")) continue;
      if (GREETINGS.includes(key)) expect(word, `${code} ${key}`).toMatch(/!$/);
      else expect(word, `${code} ${key}`).not.toMatch(/[!¡]/);
    }
  });
});
