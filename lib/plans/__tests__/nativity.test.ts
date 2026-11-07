// The Nativity Fast's plan (1.9, the owner's pick of 2026-11-07): the
// prophecies and Gospels the Church herself reads at the Nativity, one a
// day, each saying where it is read. Nothing in it is ours but the order of
// its days, which is the order of the services, and the questions, which
// are marked for our review. This holds it to the calendar's own readings.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { reviewItem } from "@/lib/admin/reviewQueue";
import { getBook } from "@/lib/bible/books";
import { NATIVITY_DAYS, dayLabel, getPlan, passage, passageVerses } from "@/lib/plans/plans";
import { seasonNow } from "@/lib/plans/season";
import { hrefOfReading } from "@/lib/plans/session";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const OFFICIAL = JSON.parse(read("data/calendar/official-readings.json")) as { days: Record<string, [string, string | null][]> };
const GUIDE = JSON.parse(read("data/plans/guide/en.json")) as Record<string, { days: { intro: string; q: string }[]; pool: string[] }>;
const PLAN_FILE = JSON.parse(read("data/plans/nativity.json"));

/** Every reference the calendar gives for the Nativity's services in 2026, with its label. */
const CYCLE = ["2026-12-13", "2026-12-19", "2026-12-20", "2026-12-24", "2026-12-25", "2026-12-26"].flatMap((d) => OFFICIAL.days[d] ?? []);

describe("the Nativity Fast's plan", () => {
  const plan = getPlan("nativity")!;

  it("is twenty-five days, one passage each, none read twice", () => {
    expect(plan.days).toHaveLength(25);
    const refs = NATIVITY_DAYS.map((d) => `${d.book} ${d.ref}`);
    expect(new Set(refs).size).toBe(25);
  });

  it("reads only what the calendar appoints for the Nativity's services, as it writes it", () => {
    for (const d of NATIVITY_DAYS) {
      const name = getBook(d.book)?.name;
      expect(name, d.book).toBeTruthy();
      const found = CYCLE.some(([ref]) => ref === `${name} ${d.ref}` || ref.includes(`(${name} ${d.ref})`));
      expect(found, `${name} ${d.ref}`).toBe(true);
    }
  });

  it("names a day as the calendar does, and opens each chapter at the verse it starts on", () => {
    const name = (slug: string) => getBook(slug)?.name ?? slug;
    expect(dayLabel(plan.days[9], name)).toBe("Micah 4:6-7; 5:2-4");
    expect(passage("micah", "4:6-7; 5:2-4").map((r) => [r.chapter, r.verse])).toEqual([[4, 6], [5, 2]]);
    expect(passage("baruch", "3:35-4:4").map((r) => [r.chapter, r.verse])).toEqual([[3, 35], [4, 1]]);
    expect(passage("isaiah", "7:10-16; 8:1-4, 9-10").map((r) => [r.chapter, r.verse])).toEqual([[7, 10], [8, 1]]);
    expect(passage("hebrews", "11:9-10, 17-23, 32-40").map((r) => [r.chapter, r.verse])).toEqual([[11, 9]]);
    expect(hrefOfReading(plan.days[9][1])).toBe("/bible/micah/5#v2");
    expect(hrefOfReading({ book: "matthew", chapter: 1, verse: 1 })).toBe("/bible/matthew/1");
    expect(hrefOfReading({ book: "psalms", chapter: 17 })).toBe("/bible/psalms/17");
  });

  it("counts only the passage's own verses for its minutes", () => {
    expect([...passageVerses("1:8-11, 15-17")]).toEqual([[1, [[8, 11], [15, 17]]]]);
    expect([...passageVerses("3:35-4:4")]).toEqual([[3, [[35, Number.MAX_SAFE_INTEGER]]], [4, [[1, 4]]]]);
    expect([...passageVerses("7:10-16; 8:1-4, 9-10")]).toEqual([[7, [[10, 16]]], [8, [[1, 4], [9, 10]]]]);
  });

  it("says each day where the Church reads it, in the plan file's own words", () => {
    const days = GUIDE.nativity.days;
    expect(days).toHaveLength(25);
    days.forEach((d, i) => expect(d.intro).toBe(`The Church reads this ${NATIVITY_DAYS[i].service}.`));
  });

  it("is on our review list, never marked for readers", () => {
    expect(reviewItem("data/plans/nativity.json", PLAN_FILE)).toMatchObject({ area: "plans", since: "2026-11-07" });
    expect(read("components/plans/PlansClient.tsx")).not.toMatch(/review/i);
  });
});

describe("the season's card", () => {
  const civil = (y: number, m: number, d: number) => new Date(y, m - 1, d);

  it("stands from two weeks before the fast, with the day it begins in the reader's calendar", () => {
    expect(seasonNow(civil(2026, 11, 7), "new")?.begins?.toISOString().slice(0, 10)).toBe("2026-11-15");
    expect(seasonNow(civil(2026, 11, 20), "old")?.begins?.toISOString().slice(0, 10)).toBe("2026-11-28");
    expect(seasonNow(civil(2026, 10, 31), "new")).toBeNull();
  });

  it("stands through the fast to the feast, and then goes", () => {
    expect(seasonNow(civil(2026, 11, 15), "new")).toEqual({ planId: "nativity", begins: null });
    expect(seasonNow(civil(2026, 12, 25), "new")).toEqual({ planId: "nativity", begins: null });
    expect(seasonNow(civil(2026, 12, 26), "new")).toBeNull();
    expect(seasonNow(civil(2027, 1, 7), "old")).toEqual({ planId: "nativity", begins: null });
    expect(seasonNow(civil(2027, 1, 8), "old")).toBeNull();
  });
});
