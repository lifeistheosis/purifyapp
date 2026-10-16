// What a reading plan says around each day (1.7, the owner's note 22): an
// intro and a question for every day, a pool of questions per plan, and a
// saying of the Fathers only where its words are copied exactly from a
// public-domain text the app already carries (docs/editorial-standards.md:
// verbatim, cited, nothing invented).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/data/plans/guide/en.json";
import sayings from "@/data/plans/sayings.json";

import { dayGuide, firstLine, questionKeys, sayingFor, type GuideContent, type SayingsContent } from "../guide";
import { READING_PLANS } from "../plans";

const ROOT = process.cwd();
const guide = en as GuideContent;
const said = sayings as SayingsContent;
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

describe("every day of every plan", () => {
  it("has an intro and its own question in English", () => {
    for (const plan of READING_PLANS) {
      const days = guide[plan.id]?.days ?? [];
      expect(days, plan.id).toHaveLength(plan.days.length);
      days.forEach((d, i) => {
        expect(d?.intro?.trim().length ?? 0, `${plan.id} day ${i + 1} intro`).toBeGreaterThan(40);
        expect(d?.q?.trim().endsWith("?"), `${plan.id} day ${i + 1} question`).toBe(true);
      });
    }
  });

  it("has a pool of eight questions per plan, each a question", () => {
    for (const plan of READING_PLANS) {
      const pool = guide[plan.id]?.pool ?? [];
      expect(pool, plan.id).toHaveLength(8);
      for (const q of pool) expect(q.trim().endsWith("?"), q).toBe(true);
    }
  });

  it("asks two questions a day: its own, then one from the pool, turning with the days", () => {
    expect(questionKeys("gospels", 4, 8)).toEqual(["gospels.d5.q", "gospels.q.5"]);
    expect(questionKeys("gospels", 8, 8)).toEqual(["gospels.d9.q", "gospels.q.1"]);
    const day = dayGuide(guide, guide, "gospels", 4);
    expect(day?.questions.map((q) => q.key)).toEqual(["gospels.d5.q", "gospels.q.5"]);
    expect(day?.questions[0].text).toBe(guide.gospels?.days?.[4]?.q);
    expect(day?.english).toBe(false);
  });

  it("is shown in the reader's language where it has the day, and in English, marked, where not", () => {
    const greek: GuideContent = { gospels: { pool: [], days: [{ intro: "Ο Ματθαίος αρχίζει.", q: "Τι;" }] } };
    expect(dayGuide(greek, guide, "gospels", 0)).toMatchObject({ intro: "Ο Ματθαίος αρχίζει.", english: true });
    expect(dayGuide(greek, guide, "gospels", 1)?.intro).toBe(guide.gospels?.days?.[1]?.intro);
    expect(dayGuide(greek, guide, "gospels", 1)?.english).toBe(true);
  });

  it("is nothing for a day the plan does not have", () => {
    expect(dayGuide(guide, guide, "gospels", 89)).toBeNull();
    expect(dayGuide(guide, guide, "gospels", -1)).toBeNull();
    expect(dayGuide(guide, guide, "missing", 0)).toBeNull();
  });

  it("looks ahead to tomorrow with the intro's first sentence", () => {
    expect(firstLine("One. Two.")).toBe("One.");
    expect(firstLine("No stop at all")).toBe("No stop at all");
    expect(firstLine(null)).toBeNull();
  });
});

describe("the sayings of the Fathers", () => {
  const all = Object.entries(said).flatMap(([plan, days]) => Object.entries(days ?? {}).map(([day, s]) => ({ plan, day: Number(day), s: s! })));

  it("belong to a plan's real days", () => {
    for (const { plan, day } of all) {
      const p = READING_PLANS.find((x) => x.id === plan);
      expect(p, plan).toBeDefined();
      expect(day >= 1 && day <= p!.days.length, `${plan} day ${day}`).toBe(true);
    }
  });

  // A Father's work in the app (data/saints/<saint>/<work>.json): the
  // paragraph that holds the words, which must itself cite the day's chapter.
  type Work = { saint: string; title: string; sections: { paragraphs: string[] }[] };
  const roman = (r: string) => {
    const v: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
    const s = r.toLowerCase();
    let n = 0;
    for (let i = 0; i < s.length; i++) n += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
    return n;
  };
  const citesChapter = (paragraph: string, book: string, chapter: number) => {
    const name = book === "proverbs" ? "Prov(?:erbs|\\.)" : null;
    if (!name) return false;
    const re = new RegExp(`${name}\\s*([ivxlc]+|\\d+)[\\s.,:]+\\d+`, "gi");
    for (const m of paragraph.matchAll(re)) if ((/^\d+$/.test(m[1]) ? Number(m[1]) : roman(m[1])) === chapter) return true;
    return false;
  };

  it("are copied word for word from the file they name, and carry author, work and citation", () => {
    for (const { plan, day, s } of all) {
      const where = `${plan} day ${day}`;
      expect(s.author && s.work && s.citation, `${where} is cited`).toBeTruthy();
      expect(s.text.length, `${where} is a saying, not a page`).toBeLessThanOrEqual(420);
      const file = path.join(ROOT, s.from);
      expect(fs.existsSync(file), `${where}: ${s.from}`).toBe(true);
      if (s.from.startsWith("data/saints/")) {
        const work = JSON.parse(fs.readFileSync(file, "utf8")) as Work;
        const found = work.sections.some((sec) => sec.paragraphs.some((p) => squash(p).includes(squash(s.text))));
        expect(found, `${where}: the words are in ${s.from}`).toBe(true);
        expect(s.work, `${where}: the work is the source's`).toBe(work.title);
        continue;
      }
      const source = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, { author: string; work: string; citation: string; text: string }[]>;
      const notes = Object.values(source).flat();
      const match = notes.find((n) => squash(n.text).includes(squash(s.text)));
      expect(match, `${where}: the words are in ${s.from}`).toBeDefined();
      expect(match?.author, `${where}: the author is the source's`).toBe(s.author);
      expect(match?.work, `${where}: the work is the source's`).toBe(s.work);
      expect(match?.citation, `${where}: the citation is the source's`).toBe(s.citation);
    }
  });

  it("are on the day's own chapters: its commentary, or a Father's paragraph that cites them", () => {
    for (const { plan, day, s } of all) {
      const p = READING_PLANS.find((x) => x.id === plan)!;
      const readings = p.days[day - 1];
      if (s.from.startsWith("data/saints/")) {
        const work = JSON.parse(fs.readFileSync(path.join(ROOT, s.from), "utf8")) as Work;
        const paragraph = work.sections.flatMap((sec) => sec.paragraphs).find((para) => squash(para).includes(squash(s.text))) ?? "";
        expect(readings.some((r) => citesChapter(paragraph, r.book, r.chapter)), `${plan} day ${day}: the paragraph cites the day's chapter`).toBe(true);
        continue;
      }
      const files = readings.map((r) => `data/bible/commentary/${r.book}/${r.chapter}.json`);
      expect(files, `${plan} day ${day}: ${s.from}`).toContain(s.from);
    }
  });

  it("are found by day", () => {
    const first = all[0];
    if (!first) return;
    expect(sayingFor(said, first.plan, first.day - 1)).toEqual(first.s);
    expect(sayingFor(said, first.plan, 999)).toBeNull();
  });
});

describe("the words of the plans", () => {
  it("hold no em dash anywhere in data/plans", () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    for (const file of walk(path.join(ROOT, "data/plans"))) {
      expect(fs.readFileSync(file, "utf8").includes("—"), path.relative(ROOT, file)).toBe(false);
    }
  });
});
