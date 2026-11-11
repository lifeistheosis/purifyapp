import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { orthodoxPascha } from "@/lib/calendar/pascha";
import { LOCALES } from "@/lib/i18n/locales";

import {
  allLines,
  citeOf,
  daysFromPascha,
  HOUR_IDS,
  LENT_GENERAL,
  METANY_GUIDE_REVIEW,
  metanyFor,
  QUOTES,
  RULES,
  RULE_ORDER,
  SOURCES,
  WORDS,
  type HourId,
} from "../metanies";

/**
 * The metany guide (1.9, the owner's ask of 2026-11-11 through the arbiter):
 * every rule under a public-domain quotation, a test for each rule by date,
 * and nothing said that no source says.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));
const fromPascha = (year: number, n: number) => new Date(orthodoxPascha(year).getTime() + n * 86_400_000);
const DAY_HOURS: HourId[] = ["first-hour", "third-hour", "sixth-hour", "ninth-hour"];

describe("what the guide rests on", () => {
  it("quotes every source verbatim, from the file that holds it", () => {
    for (const [id, q] of Object.entries(QUOTES)) {
      const file = SOURCES[q.source].file;
      const strings = flat(JSON.stringify(JSON.parse(read(file))))
        .replace(/\\"/g, '"')
        .replace(/\\n/g, " ");
      expect(strings.includes(flat(q.text)), `${id}: not verbatim in ${file}`).toBe(true);
    }
  });

  it("holds Hapgood to rubrics read on the page, each with its page and its leaf in the scan", () => {
    const book = JSON.parse(read(SOURCES.hapgood.file)) as { published: string; scan: string; read: string; rubrics: { id: string; page: string; leaf: number; text: string }[] };
    expect(book.published).toMatch(/1906/);
    expect(book.scan).toMatch(/cu31924029363128/);
    expect(book.read).toMatch(/page image/);
    for (const r of book.rubrics) {
      expect(r.page, r.id).toBeTruthy();
      expect(r.leaf, r.id).toBeGreaterThan(0);
    }
    // A quotation from her names the page it stands on, and that page has it.
    for (const [id, q] of Object.entries(QUOTES)) {
      if (q.source !== "hapgood") continue;
      expect("page" in q && q.page, id).toBeTruthy();
      const on = book.rubrics.filter((r) => r.page.split(", ").includes((q as { page: string }).page));
      expect(on.some((r) => flat(r.text).includes(flat(q.text))), `${id}: not on p. ${(q as { page: string }).page}`).toBe(true);
    }
  });

  it("has a rule only where it has a quotation, and cites it", () => {
    expect(RULE_ORDER).toEqual(["lordsDay", "pentecost", "lent"]);
    for (const id of RULE_ORDER) {
      const rule = RULES[id];
      expect(rule.quotes.length, id).toBeGreaterThanOrEqual(3);
      expect(rule.quotes, id).toContain(rule.cite);
      for (const q of rule.quotes) expect(citeOf(QUOTES[q]), q).toMatch(/Canon|Holy Spirit|Hapgood/);
    }
    expect(citeOf(QUOTES.firstHourLent)).toBe("Hapgood, Service Book (1906), p. 41");
    expect(citeOf(QUOTES.standing)).toBe("First Council of Nicaea, Canon 20");
  });

  it("is marked for the clergy's review, and the standards name it", () => {
    expect(METANY_GUIDE_REVIEW.status).toBe("awaiting-clergy-review");
    expect(read("docs/editorial-standards.md")).toMatch(/lib\/prayers\/metanies\.ts/);
  });
});

describe("the Lord's Day", () => {
  it("stands at every Hour of the day on a Sunday, in the canon's own terms", () => {
    const sunday = day(2026, 11, 15);
    expect(sunday.getUTCDay()).toBe(0);
    for (const h of DAY_HOURS) {
      const t = metanyFor(h, sunday);
      expect(t.rule, h).toBe("lordsDay");
      expect(t.line.en).toBe("Today is the Lord's Day. The canon asks that prayer be made to God standing.");
      if (t.rule) expect(t.quote.text).toMatch(/prayer be made to God standing/);
    }
  });

  it("begins on Saturday evening and ends on Sunday evening, as Trullo says", () => {
    expect(metanyFor("compline", day(2026, 11, 14)).rule).toBe("lordsDay");
    const eve = metanyFor("compline", day(2026, 11, 14));
    expect(eve.line.en).toBe("The Lord's Day has begun. The canon asks that no one kneel in prayer until the evening of Sunday.");
    if (eve.rule) expect(eve.quote).toBe(QUOTES.saturdayToSunday);
    expect(metanyFor("compline", day(2026, 11, 15)).rule).toBeNull();
    expect(metanyFor("sixth-hour", day(2026, 11, 14)).rule).toBeNull();
    expect(QUOTES.saturdayToSunday.text).toMatch(/Vespers on Saturdays.*until the evening of Sunday/);
  });

  it("stands on a Sunday of the Great Fast too", () => {
    for (const year of [2026, 2027, 2028]) {
      const sunday = fromPascha(year, -35);
      expect(sunday.getUTCDay()).toBe(0);
      expect(metanyFor("first-hour", sunday).rule).toBe("lordsDay");
    }
  });
});

describe("Pascha to Pentecost", () => {
  it("stands on every day from Pascha to Pentecost, on both calendars' one Pascha", () => {
    for (const year of [2026, 2027, 2028, 2029]) {
      for (let n = 0; n <= 49; n++) {
        const d = fromPascha(year, n);
        const t = metanyFor("third-hour", d);
        expect(t.rule, `${year} day ${n}`).toBe(d.getUTCDay() === 0 ? "lordsDay" : "pentecost");
      }
      expect(metanyFor("third-hour", fromPascha(year, -1)).rule, `${year} Holy Saturday`).toBeNull();
      expect(metanyFor("third-hour", fromPascha(year, 50)).rule, `${year} Monday of the Holy Spirit`).toBeNull();
    }
    expect(daysFromPascha(day(2026, 4, 12))).toBe(0);
    expect(daysFromPascha(day(2027, 5, 2))).toBe(0);
  });

  it("says it in the canon's own terms", () => {
    const t = metanyFor("ninth-hour", fromPascha(2027, 10));
    expect(t.line.en).toBe("These are the days of Pentecost, the fifty days from Pascha. The canon asks that prayer be made to God standing.");
    if (t.rule) expect(t.quote.text).toMatch(/in the days of Pentecost/);
  });

  it("ends at Compline on the evening of Pentecost, when the kneeling prayers have been said", () => {
    expect(metanyFor("compline", fromPascha(2027, 48)).rule).toBe("lordsDay");
    expect(metanyFor("compline", fromPascha(2027, 49)).rule).toBeNull();
    expect(metanyFor("compline", fromPascha(2027, 3)).rule).toBe("pentecost");
  });
});

describe("the weekdays of the Great Fast", () => {
  it("gives the First, Third and Sixth Hours their own page of Hapgood", () => {
    const monday = fromPascha(2027, -48);
    expect(monday.getUTCDay()).toBe(1);
    const pages: Record<string, string> = { "first-hour": "41", "third-hour": "47", "sixth-hour": "52" };
    for (const [h, page] of Object.entries(pages)) {
      const t = metanyFor(h as HourId, monday);
      expect(t.rule, h).toBe("lent");
      if (t.rule !== "lent") continue;
      expect(t.quote.page, h).toBe(page);
      expect(t.quote.text, h).toMatch(/three great reverences/);
      expect(t.also?.text, h).toMatch(/twelve lesser reverences/);
    }
  });

  it("does not put a rubric under an Hour it was not printed for", () => {
    for (const h of ["ninth-hour", "compline"] as HourId[]) {
      const t = metanyFor(h, fromPascha(2027, -40));
      expect(t.rule, h).toBe("lent");
      expect(t.line, h).toBe(LENT_GENERAL);
      if (t.rule) expect(t.quote.page, h).toBe("xvi");
    }
  });

  it("runs from Clean Monday to the eve of Lazarus Saturday, Monday to Friday", () => {
    for (const year of [2026, 2027, 2028]) {
      expect(metanyFor("first-hour", fromPascha(year, -49)).rule, "Forgiveness Sunday").toBe("lordsDay");
      expect(metanyFor("first-hour", fromPascha(year, -48)).rule, "Clean Monday").toBe("lent");
      expect(metanyFor("first-hour", fromPascha(year, -9)).rule, "the Friday before Lazarus Saturday").toBe("lent");
      expect(metanyFor("first-hour", fromPascha(year, -8)).rule, "Lazarus Saturday").toBeNull();
      expect(metanyFor("first-hour", fromPascha(year, -6)).line, "Holy Monday").toBe(WORDS.ask);
      expect(metanyFor("sixth-hour", fromPascha(year, -3)).line, "Holy Thursday").toBe(WORDS.ask);
      expect(metanyFor("compline", fromPascha(year, -5)).line, "Holy Tuesday evening").toBe(WORDS.ask);
      expect(metanyFor("first-hour", fromPascha(year, -43)).rule, "a Saturday of the Fast").toBeNull();
    }
  });
});

describe("the Annunciation in the Forty Days", () => {
  it("gets the plain sentence on the reader's own calendar, and the Fast's rule on the other", () => {
    // 2027: Pascha 2 May, the Forty Days 15 March to 23 April. 25 March is a Thursday, 7 April a Wednesday.
    const newDay = day(2027, 3, 25);
    const oldDay = day(2027, 4, 7);
    expect(newDay.getUTCDay()).toBe(4);
    expect(oldDay.getUTCDay()).toBe(3);
    for (const h of ["first-hour", "third-hour", "sixth-hour", "ninth-hour"] as HourId[]) {
      expect(metanyFor(h, newDay, "new").line, h).toBe(WORDS.ask);
      expect(metanyFor(h, newDay, "old").rule, h).toBe("lent");
      expect(metanyFor(h, oldDay, "old").line, h).toBe(WORDS.ask);
      expect(metanyFor(h, oldDay, "new").rule, h).toBe("lent");
    }
    expect(metanyFor("compline", day(2027, 3, 24), "new").line).toBe(WORDS.ask);
    expect(metanyFor("compline", newDay, "new").line).toBe(WORDS.ask);
    expect(metanyFor("compline", day(2027, 3, 23), "new").rule).toBe("lent");
    // The days either side keep the Fast's rule.
    expect(metanyFor("first-hour", day(2027, 3, 24), "new").rule).toBe("lent");
    expect(metanyFor("first-hour", day(2027, 3, 26), "new").rule).toBe("lent");
  });
});

describe("the feasts, and every other day", () => {
  it("says only that the custom is the Typikon's and differs, and to ask your priest", () => {
    // The Nativity, Theophany, the Dormition, the Exaltation of the Cross, on both calendars, and a plain weekday.
    const days = [day(2026, 12, 25), day(2027, 1, 7), day(2027, 1, 6), day(2027, 1, 19), day(2026, 8, 15), day(2026, 8, 28), day(2026, 9, 14), day(2026, 11, 11)];
    for (const d of days) {
      if (d.getUTCDay() === 0) continue;
      for (const h of DAY_HOURS) {
        const t = metanyFor(h, d);
        expect(t.rule, `${d.toISOString()} ${h}`).toBeNull();
        expect(t.line).toBe(WORDS.ask);
      }
    }
    expect(WORDS.ask.en).toMatch(/Typikon/);
    expect(WORDS.ask.en).toMatch(/differs between traditions/);
    expect(WORDS.ask.en).toMatch(/Ask your priest\.$/);
  });

  it("answers every Hour on every day of four years with a line", () => {
    for (let n = 0; n < 1461; n++) {
      const d = new Date(day(2026, 1, 1).getTime() + n * 86_400_000);
      for (const h of HOUR_IDS) expect(metanyFor(h, d).line.en.length).toBeGreaterThan(20);
    }
  });
});

describe("the words", () => {
  it("are in every language's catalog, the English letter for letter", () => {
    const catalog = (code: string) => JSON.parse(read(`lib/i18n/messages/${code}.json`)) as Record<string, string>;
    const en = catalog("en");
    for (const l of allLines()) expect(en[l.key], l.key).toBe(l.en);
    expect(Object.keys(en).filter((k) => k.startsWith("prayers.metany.")).sort()).toEqual(allLines().map((l) => l.key).sort());
    for (const { code } of LOCALES) {
      const c = catalog(code);
      for (const l of allLines()) {
        expect(c[l.key], `${code} ${l.key}`).toBeTruthy();
        expect(c[l.key], `${code} ${l.key}`).not.toMatch(/[\u2014\u2013]/);
        if (code !== "en" && code !== "fil") expect(c[l.key], `${code} ${l.key}: left in English`).not.toBe(l.en);
      }
    }
  });

  it("are shown by the line under an Hour's title and by the guide, and the Hours mount the line", () => {
    const lineFile = read("components/prayers/MetanyLine.tsx");
    expect(lineFile).toMatch(/metanyFor\(/);
    expect(lineFile).toMatch(/startOfDayLocal/);
    expect(lineFile).toMatch(/min-h-11/);
    expect(read("app/(app)/prayers/hours/[id]/page.tsx")).toMatch(/afterHead=\{<MetanyLine hour=\{id\} \/>\}/);
    expect(fs.existsSync(path.join(ROOT, "app/(app)/prayers/bows/page.tsx"))).toBe(true);
    const guide = read("components/prayers/MetanyGuide.tsx");
    for (const w of ["title", "lead", "kinds", "ask", "english"]) expect(guide, w).toContain(`WORDS.${w}.key`);
  });

  it("name the editorials' one sentence as theirs in the clergy's queue, and tell no reader of a review", () => {
    const standards = read("docs/editorial-standards.md");
    expect(standards).toContain(WORDS.kinds.en);
    for (const l of allLines()) expect(l.en, l.key).not.toMatch(/review|clergy/i);
  });

  it("have no em dash, and a key each", () => {
    const keys = new Set<string>();
    for (const l of allLines()) {
      expect(l.en, l.key).not.toMatch(/[—–]/);
      expect(l.key).toMatch(/^prayers\.metany\./);
      expect(keys.has(l.key), l.key).toBe(false);
      keys.add(l.key);
    }
  });
});
