import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { iconRightsFor } from "@/lib/saints/iconRights";
import {
  DONE_MONTHS,
  ENTRY_MAX_WORDS,
  type MonthData,
  type MonthSaint,
  monthLines,
  monthNumber,
  monthProblems,
  monthRows,
  pageProblems,
} from "@/lib/saints/month";
import { SAINTS } from "@/lib/saints/saints";
import DAILY_SAINTS from "@/data/calendar/daily-saints.json";

/**
 * A month of the Church's calendar, done and kept done (1.9; the owner's word
 * of 2026-11-10: every saint a month commemorates shown, with a page, and the
 * path repeated each month; docs/editorial/menologion-month.md).
 *
 * The first block holds every month in DONE_MONTHS to the rule book in
 * lib/saints/month.ts, with the app's own data: every saint's line has a page
 * or a stated reason, and every page of the new standard carries no life of
 * ours, a short entry with its source, an icon only with settled rights, and
 * works whose every passage says whose words it holds and where they are
 * printed. The second block proves the rule book on pages made to fail, so a
 * rule cannot go quiet without somebody deleting an assertion.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");

const sectionsOf = (saint: string, work: string) => {
  const file = path.join(ROOT, "data", "saints", saint, `${work}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")).sections;
};

const appData = (held: MonthData["held"] = []): MonthData => ({
  calendar: DAILY_SAINTS as MonthData["calendar"],
  saints: SAINTS,
  iconSettled: (src) => Boolean(iconRightsFor(src)),
  sectionsOf,
  held,
});

describe("a month marked done", () => {
  it("names at least November, the first month done this way", () => {
    expect(Object.keys(DONE_MONTHS)).toContain("november");
  });

  for (const [name, { month, held }] of Object.entries(DONE_MONTHS)) {
    it(`${name}: every saint's line has a page, and every new page meets the standard`, () => {
      expect(monthNumber(name)).toBe(month);
      expect(monthProblems(month, appData(held))).toEqual([]);
    });

    it(`${name}: every line it holds back is a line of that month with no page`, () => {
      const lines = monthLines(DAILY_SAINTS as MonthData["calendar"], month);
      for (const h of held) {
        const line = lines.find((l) => l.day === h.day && l.line.name === h.name);
        expect(line, `${h.day} ${h.name}`).toBeDefined();
        expect(line!.line.slug, `${h.day} ${h.name} has a page now; take it off the held list`).toBeUndefined();
      }
    });

    it(`${name}: its new pages read their facts from a named source and carry their works`, () => {
      const rows = monthRows(month, appData(held)).filter((r) => r.page === "entry");
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const saint = SAINTS.find((s) => s.slug === r.slug)!;
        expect(saint.entrySource!.length, saint.slug).toBeGreaterThan(10);
        expect(saint.life, saint.slug).toEqual([]);
      }
    });
  }
});

describe("the rule book, on pages made to fail", () => {
  const settled = "/saints/icons/settled.jpg";
  const files: Record<string, { voice?: string; citation?: string; paragraphs: string[] }[]> = {
    "a/witness": [{ voice: "witness", citation: "Eusebius, Church History VII.28 (NPNF2 1, 1890)", paragraphs: ["…"] }],
    "a/ours": [{ voice: "editorial", citation: "Purify", paragraphs: ["…"] }],
    "a/uncited": [{ voice: "witness", citation: " ", paragraphs: ["…"] }],
    "a/unvoiced": [{ citation: "Butler, Lives of the Saints (1866)", paragraphs: ["…"] }],
  };
  const page = (more: Partial<MonthSaint>): MonthSaint => ({
    slug: "a",
    name: "A",
    shortBio: "A martyr of Melitene under Diocletian.",
    entrySource: "The Menologion of Basil II, November 7",
    life: [],
    works: [{ slug: "witness" }],
    ...more,
  });
  const data: Pick<MonthData, "iconSettled" | "sectionsOf"> = {
    iconSettled: (src) => src === settled,
    sectionsOf: (saint, work) => files[`${saint}/${work}`] ?? null,
  };

  it("passes a page of the standard", () => {
    expect(pageProblems(page({ iconUrl: settled }), data)).toEqual([]);
  });

  it("leaves an older page alone: reported, never failed", () => {
    expect(pageProblems(page({ entrySource: undefined, life: ["A life of ours."], iconUrl: "/x.jpg" }), data)).toEqual([]);
  });

  it("fails a life of ours, a long entry, an unsettled icon, a missing file", () => {
    expect(pageProblems(page({ life: ["He was born in a village."] }), data)[0]).toMatch(/life of ours/);
    expect(pageProblems(page({ shortBio: "word ".repeat(ENTRY_MAX_WORDS + 1) }), data)[0]).toMatch(/past 80/);
    expect(pageProblems(page({ iconUrl: "/saints/icons/unsettled.jpg" }), data)[0]).toMatch(/no settled rights/);
    expect(pageProblems(page({ works: [{ slug: "lost" }] }), data)[0]).toMatch(/no file/);
  });

  it("fails a passage of ours, an uncited passage, a passage that does not say whose words it holds", () => {
    expect(pageProblems(page({ works: [{ slug: "ours" }] }), data)[0]).toMatch(/prose of ours/);
    expect(pageProblems(page({ works: [{ slug: "uncited" }] }), data)[0]).toMatch(/no citation/);
    expect(pageProblems(page({ works: [{ slug: "unvoiced" }] }), data)[0]).toMatch(/whose words/);
  });

  it("fails a saint's line with no page unless it is held with a reason; a feast needs none", () => {
    const calendar = {
      "12-01": [{ name: "Prophet Nahum" }, { name: "Entry into the Temple", kind: "feast" }],
      "12-02": [{ name: "A", slug: "a" }, { name: "B", slug: "b" }],
    };
    const base = { calendar, saints: [page({})], ...data };
    expect(monthProblems(12, base).map((p) => p.problem)).toEqual(["no page, and not held", "its slug b names no page"]);
    const held = [{ day: "12-01", name: "Prophet Nahum", reason: "" }];
    expect(monthProblems(12, { ...base, held }).map((p) => p.problem)).toContain("held with no reason given");
    const heldWell = [{ day: "12-01", name: "Prophet Nahum", reason: "His book is in the Bible tab; no life survives." }];
    expect(monthProblems(12, { ...base, held: heldWell }).map((p) => p.problem)).toEqual(["its slug b names no page"]);
  });

  it("reads a month by name or number, and nothing else", () => {
    expect(monthNumber("December")).toBe(12);
    expect(monthNumber("11")).toBe(11);
    expect(monthNumber("13")).toBeNull();
    expect(monthNumber("Brumaire")).toBeNull();
  });
});
