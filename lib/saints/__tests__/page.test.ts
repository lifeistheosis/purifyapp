// A saint's page on a phone (1.7, the owner's note 19 of 2026-10-16): the
// decisions it makes, as plain functions. Which parts a saint's page offers,
// what the line under his name says, and what the line under the request
// says. How the page is drawn is held in saintPage.test.ts.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { askLine, heroTitle, saintTabs } from "@/lib/saints/page";
import { SAINTS } from "@/lib/saints/saints";

const licensed = (slug: string): number => {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "data", "saints", slug, "licensed-works.json"), "utf8");
    return (JSON.parse(raw) as { works: unknown[] }).works.length;
  } catch {
    return 0;
  }
};

const tabsOf = (slug: string) => {
  const saint = SAINTS.find((s) => s.slug === slug)!;
  return saintTabs({ works: saint.works.length, licensed: licensed(slug), miracles: Boolean(saint.hasMiracles) });
};

describe("the parts a saint's page offers", () => {
  it("is his Life, then his Writings, then his Miracles, and only those he has", () => {
    expect(saintTabs({ works: 0, licensed: 0, miracles: false })).toEqual(["life"]);
    expect(saintTabs({ works: 3, licensed: 0, miracles: false })).toEqual(["life", "writings"]);
    expect(saintTabs({ works: 0, licensed: 2, miracles: false })).toEqual(["life", "writings"]);
    expect(saintTabs({ works: 1, licensed: 1, miracles: true })).toEqual(["life", "writings", "miracles"]);
    expect(saintTabs({ works: 0, licensed: 0, miracles: true })).toEqual(["life", "miracles"]);
  });

  it("gives the real saints the parts the owner was shown", () => {
    // St John Chrysostom: nineteen works and two books in print.
    expect(tabsOf("john-chrysostom")).toEqual(["life", "writings"]);
    // St Anthony: the one saint with a verbatim account of his miracles.
    expect(tabsOf("anthony-the-great")).toEqual(["life", "writings", "miracles"]);
    // A saint with no work on Purify and no book in print has his life alone,
    // and no switch.
    const lifeOnly = SAINTS.filter((s) => s.works.length === 0 && licensed(s.slug) === 0 && !s.hasMiracles);
    expect(lifeOnly.length).toBeGreaterThan(30);
    for (const s of lifeOnly) expect(tabsOf(s.slug), s.slug).toEqual(["life"]);
  });

  it("never offers an empty part", () => {
    for (const s of SAINTS) {
      const tabs = tabsOf(s.slug);
      if (tabs.includes("writings")) expect(s.works.length + licensed(s.slug), s.slug).toBeGreaterThan(0);
      if (tabs.includes("miracles")) {
        expect(fs.existsSync(path.join(process.cwd(), "data", "saints", s.slug, "miracles.json")), s.slug).toBe(true);
      }
    }
  });
});

describe("the line under a saint's name", () => {
  it("is the first part of his epithet: his office or his place", () => {
    expect(heroTitle("Archbishop of Constantinople · Golden-Mouth")).toBe("Archbishop of Constantinople");
    expect(heroTitle("Mother of God · Panagia")).toBe("Mother of God");
    expect(heroTitle("Father of Monks · The Great")).toBe("Father of Monks");
    expect(heroTitle("  Pillar-saint ")).toBe("Pillar-saint");
    expect(heroTitle("")).toBe("");
  });

  it("is never empty for a saint in the registry", () => {
    for (const s of SAINTS) expect(heroTitle(s.epithet).length, s.slug).toBeGreaterThan(2);
  });
});

describe("the line under the request", () => {
  it("invites the first reader and never shows a bare 0", () => {
    expect(askLine(0)).toEqual({ key: "saints.ask.first" });
    expect(askLine(-3)).toEqual({ key: "saints.ask.first" });
    expect(askLine(Number.NaN)).toEqual({ key: "saints.ask.first" });
  });

  it("counts the readers who asked, in words", () => {
    expect(askLine(1)).toEqual({ key: "saints.ask.count", count: 1 });
    expect(askLine(12)).toEqual({ key: "saints.ask.count", count: 12 });
    expect(askLine(12.7)).toEqual({ key: "saints.ask.count", count: 12 });
  });
});
