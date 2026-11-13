import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fastingStatus, type CalStyle } from "@/lib/calendar/orthodox";
import en from "@/lib/i18n/messages/en.json";
import { RULES } from "@/lib/prayers/rules";

import { checkEmailCopy, explainEmail } from "../../__tests__/emailCopyHelpers";
import { FAST_IDS, daysAhead, fastOn, weekDays, type FastId } from "../fasts";
import { COPY, catalogLine, dayLabel, letterFor, letterLines, type RetentionLetter } from "../letters";
import type { PersonalLine, PlannedRetention } from "../plan";
import { kitDay } from "../../kitLetters";
import { standInEmail } from "../render";

/**
 * Every letter the three emails can write: the house's copy rules, no claim
 * the account cannot show, words only from the app, the calendar, the
 * reader's own rows and the plain sentences in COPY, and one real button.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const lines: PersonalLine[] = [
  { kind: "bible", book: "romans", bookName: "Romans", chapter: 8, verse: 1, at: 0 },
  { kind: "bible", book: "1-samuel", bookName: "1 Samuel", chapter: 3, verse: 10, at: 0 },
  { kind: "work", saintSlug: "john-chrysostom", saintName: "St. John Chrysostom", workSlug: "on-the-priesthood", workTitle: "On the Priesthood", sectionN: 2, paragraph: 4, at: 0 },
  { kind: "patron", saintSlug: "nicholas-of-myra", saintName: "St. Nicholas the Wonderworker", on: "2026-12-06" },
];

/** A day inside each fast in both reckonings, for its opening and a week's note. */
const FAST_DAYS: Record<FastId, string> = {
  nativity: "2026-12-02",
  great_lent: "2027-03-30",
  // Pascha 2026 is 12 April: the fast runs from 8 June (to 28 June, or 11 July by the civil date on the Old).
  apostles: "2026-06-22",
  // 1 to 14 August, or 14 to 27 by the civil date: the 14th is in both.
  dormition: "2027-08-14",
};

type Made = { name: string; letter: RetentionLetter; fastDates?: { style: CalStyle; dates: Date[] } };

function everyLetter(): Made[] {
  const out: Made[] = [];
  const now = new Date("2026-11-20T11:05:00Z");
  for (const step of ["morning", "calendar", "verse"] as const) {
    out.push({ name: `first_week ${step}`, letter: letterFor({ kind: "first_week", userId: "u", step, dedupeKey: "k", owner: false }, now) });
  }
  for (const line of lines) {
    out.push({ name: `pick_up ${line.kind}`, letter: letterFor({ kind: "pick_up", userId: "u", step: 14, line, dedupeKey: "k", owner: false }, now) });
  }
  for (const id of FAST_IDS) {
    for (const style of ["new", "old"] as CalStyle[]) {
      const at = new Date(`${FAST_DAYS[id]}T11:05:00Z`);
      const fast = fastOn(at, style);
      if (!fast) continue;
      for (const piece of ["open" as const, Math.max(1, fast.week)]) {
        const p: PlannedRetention = { kind: "fasting_companion", userId: "u", style, fast, piece, dedupeKey: "k", owner: false };
        const dates = piece === "open" ? daysAhead(fast, at) : weekDays(fast, piece);
        out.push({ name: `${id} ${style} ${piece}`, letter: letterFor(p, at), fastDates: { style, dates } });
      }
    }
  }
  return out;
}

const LETTERS = everyLetter();

describe("every letter", () => {
  it("covers each email, each step, each line and each fast", () => {
    expect(LETTERS.filter((l) => l.letter.kind === "first_week")).toHaveLength(3);
    expect(LETTERS.filter((l) => l.letter.kind === "pick_up")).toHaveLength(4);
    expect(LETTERS.filter((l) => l.letter.kind === "fasting_companion")).toHaveLength(FAST_IDS.length * 2 * 2);
  });

  it("keeps the house's copy rules: no exclamation, no clock, no pressure, no praise, no em dash", () => {
    for (const { name, letter } of LETTERS) {
      const v = checkEmailCopy({ subject: letter.subject, body: letterLines(letter).join("\n") });
      expect(v, `${name}\n${explainEmail(v)}`).toEqual([]);
    }
  });

  it("never claims what the account cannot show, and never says it misses anyone", () => {
    const claim = /\b(haven'?t|have not|not yet|didn'?t|did not|still|forgot|missed|miss you|we miss|come back|been away|while since)\b/i;
    // "Your first verse" says the reader has none, which a reader on the free
    // plan, whose bookmarks stay on the device, may well have. "The fast
    // begins" is false for a reader who turned the companion on in its third week.
    const presumes = /\bfirst (verse|bookmark|morning prayers|prayers?)\b|\b(fast|it) begins\b/i;
    for (const { name, letter } of LETTERS) {
      for (const line of letterLines(letter)) {
        expect(line, name).not.toMatch(claim);
        expect(line, name).not.toMatch(presumes);
      }
    }
  });

  it("promises nothing that is Plus: bookmarking a verse is free on every reader's device", () => {
    const verseRow = fs.readFileSync(path.join(ROOT, "components/bible/VerseRow.tsx"), "utf8");
    const bookmarkRow = /key: "bookmark",[\s\S]*?\}\);/.exec(verseRow)?.[0] ?? "";
    expect(bookmarkRow).toContain('t("bible.bookmarkVerse")');
    expect(bookmarkRow).not.toContain("locked");
    expect(fs.readFileSync(path.join(ROOT, "lib/premium/plans.ts"), "utf8")).toContain(
      "Notes, highlights, bookmarks and collections are free on the device you write them on.",
    );
    for (const { name, letter } of LETTERS) {
      for (const line of letterLines(letter)) expect(line, name).not.toMatch(/\b(Plus|devices?|sync|every device)\b/);
    }
  });

  it("says what it is about, for a look to choose its picture and marks by", () => {
    const fasting = LETTERS.find((l) => l.name === "nativity new open")!.letter;
    // 2 December is the eighteenth day of the forty.
    expect(fasting.about).toEqual({ kind: "fasting_companion", fast: "nativity", fastKey: "nativity-2026", piece: "open", day: 18, of: 40, style: "new" });
    // The Old Calendar reader on the same civil day is on day 5 of their own forty.
    expect(LETTERS.find((l) => l.name === "nativity old open")!.letter.about).toMatchObject({ day: 5, of: 40, style: "old" });
    const patron = LETTERS.find((l) => l.name === "pick_up patron")!.letter;
    expect(patron.about).toEqual({ kind: "pick_up", line: "patron", saintSlug: "nicholas-of-myra", on: "2026-12-06" });
    expect(LETTERS.find((l) => l.name === "first_week verse")!.letter.about).toEqual({ kind: "first_week", step: "verse" });
    for (const { name, letter, fastDates } of LETTERS.filter((l) => l.fastDates)) {
      letter.days!.forEach((d, i) => {
        const status = fastingStatus(fastDates!.dates[i], fastDates!.style);
        const civil = fastDates!.dates[i];
        expect([d.fast, d.fastRule, d.iso, d.weekday, d.date], name).toEqual([
          { kind: status.kind, label: status.label },
          status.rule,
          civil.toISOString().slice(0, 10),
          civil.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
          String(civil.getUTCDate()),
        ]);
        // The kit's margin takes the day as it is.
        expect(kitDay(d), name).toMatchObject({ weekday: d.weekday, date: d.date, name: d.name, kind: d.kind, fastWords: status.label });
      });
    }
  });

  it("has one button, to a page of the site the app really has", () => {
    const pages: Record<string, string> = {
      "/prayers/morning": "app/(app)/prayers",
      "/settings": "app/(app)/settings/page.tsx",
      "/bible": "app/(app)/bible",
      "/bible/romans/8": "app/(app)/bible",
      "/bible/1-samuel/3": "app/(app)/bible",
      "/saints/john-chrysostom/on-the-priesthood": "app/(app)/saints/[slug]/[work]/page.tsx",
      "/saints/nicholas-of-myra": "app/(app)/saints/[slug]/page.tsx",
      "/plans/nativity": "app/(app)/plans",
      "/prayers/lent-ephrem": "app/(app)/prayers",
      "/calendar": "app/(app)/calendar",
    };
    for (const { name, letter } of LETTERS) {
      const url = new URL(letter.action.href);
      expect(Object.keys(pages), `${name}: ${url.pathname}`).toContain(url.pathname);
      expect(fs.existsSync(path.join(ROOT, pages[url.pathname])), pages[url.pathname]).toBe(true);
    }
    expect(RULES.find((r) => r.id === "lent-ephrem")?.href).toBe("/prayers/lent-ephrem");
    expect(RULES.find((r) => r.id === "morning")?.href).toBe("/prayers/morning");
  });

  it("is drawn by the stand-in with its own unsubscribe link and a text part that says the same", () => {
    for (const { name, letter } of LETTERS) {
      const email = standInEmail(letter, { eyebrow: "Your first week", footer: "Why. Purify.", unsubscribeHref: "https://purifyapp.net/email/unsubscribe?t=x&l=first_week" });
      expect(email.subject, name).toBe(letter.subject);
      expect(email.html, name).toContain("email/unsubscribe?t=x&amp;l=first_week");
      for (const line of letter.paragraphs) expect(email.text, name).toContain(line);
      expect(email.text, name).toContain(letter.action.href);
      // Gmail clips a message past about 100KB (docs/1.9-build/BRAINSTORM.md, "optimized").
      expect(Buffer.byteLength(email.html), name).toBeLessThan(100_000);
    }
  });
});

describe("where the words come from", () => {
  const catalog = en as Record<string, string>;
  const sentences = (s: string) => s.split(/(?<=\.)\s+/).filter(Boolean);

  it("reads its catalog lines word for word, and fails here if one is renamed", () => {
    for (const key of [
      "settings.calendar",
      "settings.calendarHint",
      "calendar.styleNew",
      "calendar.styleOld",
      "bible.bookmarkVerse",
      "plans.nativity.body",
      "calendar.fastingDisclaimer",
    ]) {
      expect(catalogLine(key)).toBe(catalog[key]);
    }
    expect(() => catalogLine("no.such.line")).toThrow();
  });

  it("speaks of the fast only in the calendar's words: each day's fast as fastingStatus names it, in the reader's reckoning", () => {
    for (const { name, letter, fastDates } of LETTERS.filter((l) => l.letter.kind === "fasting_companion")) {
      expect(letter.after, name).toContain(catalog["calendar.fastingDisclaimer"]);
      const { style, dates } = fastDates!;
      expect(letter.days?.length, name).toBe(dates.length);
      dates.forEach((d, i) => {
        const line = letter.days![i];
        expect(line.day, name).toBe(dayLabel(d));
        expect(line.name.endsWith(fastingStatus(d, style).label), `${name}: ${line.name}`).toBe(true);
      });
    }
  });

  it("writes no other sentence than the app's, the calendar's, the reader's own data and COPY's", () => {
    const fixed = new Set<string>([
      ...(Object.values(COPY) as unknown[]).filter((v): v is string => typeof v === "string"),
      ...RULES.flatMap((r) => [r.title, r.description ?? ""]),
      ...Object.values(catalog),
    ]);
    const shaped = [
      /^About \d+ minutes\. They are in Prayers\.$/,
      /^New or Old: it is chosen in Settings, under The calendar\.$/,
      /^Tap a verse on any chapter, then Bookmark verse\.$/,
      /^You were reading [^.]+ \d+\.$/,
      /^You were reading [^,]+, by St\. [^.]+\.$/,
      /^St\. [^,]+, whom you chose as your patron saint, is remembered on [A-Z][a-z]+day, [A-Z][a-z]+ \d+\.$/,
    ];
    for (const { name, letter } of LETTERS) {
      for (const paragraph of [...letter.paragraphs, ...(letter.after ?? [])]) {
        const ok = fixed.has(paragraph) || shaped.some((re) => re.test(paragraph)) || sentences(paragraph).every((s) => fixed.has(s));
        expect(ok, `${name}: "${paragraph}" is not from the app, the calendar or COPY`).toBe(true);
      }
    }
  });

  it("quotes no Scripture, no Father and no service", () => {
    for (const { name, letter } of LETTERS) {
      for (const line of letterLines(letter)) expect(line, name).not.toMatch(/[“”"«»]/);
    }
  });
});
