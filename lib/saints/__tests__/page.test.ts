// A saint's page on a phone (1.7, the owner's note 19 of 2026-10-16), and its
// doors (1.8, round 3b D, "Fade and doors"): the decisions it makes, as plain
// functions. Which doors a saint's page offers, what the line under his name
// says, and what the line under the request says. How the page is drawn is
// held in saintPage.test.ts.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listAkathists } from "@/lib/prayers/akathists";
import { hymnsOf } from "@/lib/saints/hymns";
import { askLine, heroTitle, saintDoors, saintTabs } from "@/lib/saints/page";
import { SAINTS } from "@/lib/saints/saints";
import { hasWeb, saintWeb } from "@/lib/saints/web";

const licensed = (slug: string): number => {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "data", "saints", slug, "licensed-works.json"), "utf8");
    return (JSON.parse(raw) as { works: unknown[] }).works.length;
  } catch {
    return 0;
  }
};

const akathists = (slug: string) => listAkathists().filter((a) => a.slug === slug).length;

const doorsOf = (slug: string) => {
  const saint = SAINTS.find((s) => s.slug === slug)!;
  return saintDoors({
    works: saint.works.length,
    licensed: licensed(slug),
    web: hasWeb(slug),
    hymns: hymnsOf(slug).length + akathists(slug),
  });
};

describe("the doors a saint's page offers", () => {
  it("are his Life, his Writings, his Web and his Hymns, in that order, and only those he has", () => {
    expect(saintDoors({ works: 0, licensed: 0, web: false, hymns: 0 })).toEqual(["life"]);
    expect(saintDoors({ works: 3, licensed: 0, web: false, hymns: 0 })).toEqual(["life", "writings"]);
    expect(saintDoors({ works: 0, licensed: 2, web: false, hymns: 0 })).toEqual(["life", "writings"]);
    expect(saintDoors({ works: 0, licensed: 0, web: true, hymns: 0 })).toEqual(["life", "web"]);
    expect(saintDoors({ works: 0, licensed: 0, web: false, hymns: 1 })).toEqual(["life", "hymns"]);
    expect(saintDoors({ works: 1, licensed: 1, web: true, hymns: 2 })).toEqual(["life", "writings", "web", "hymns"]);
  });

  it("switch the page below them, but for the Web, which opens the saint web", () => {
    expect(saintTabs(["life", "writings", "web", "hymns"])).toEqual(["life", "writings", "hymns"]);
    expect(saintTabs(["life", "web"])).toEqual(["life"]);
  });

  it("gives the real saints the doors their data holds", () => {
    // St John Chrysostom: nineteen works and two books in print, and a web.
    expect(doorsOf("john-chrysostom")).toEqual(["life", "writings", "web"]);
    // St Nicholas: his troparion is in his Stories and Prayers.
    expect(doorsOf("nicholas-the-wonderworker")).toEqual(["life", "writings", "web", "hymns"]);
    // The Theotokos: her Akathist is her hymn.
    expect(doorsOf("theotokos")).toContain("hymns");
    // St Anthony's miracles are in his Life now, not a door of their own.
    expect(doorsOf("anthony-the-great")).not.toContain("miracles");
    // A saint with his Life alone, nobody joined to him, and no hymn: no doors.
    const alone = SAINTS.filter((s) => doorsOf(s.slug).length === 1);
    expect(alone.length).toBeGreaterThan(20);
    for (const s of alone) expect(doorsOf(s.slug), s.slug).toEqual(["life"]);
  });

  it("never offers an empty door", () => {
    for (const s of SAINTS) {
      const doors = doorsOf(s.slug);
      if (doors.includes("writings")) expect(s.works.length + licensed(s.slug), s.slug).toBeGreaterThan(0);
      if (doors.includes("web")) expect(saintWeb(s.slug)?.nodes.length ?? 0, s.slug).toBeGreaterThan(0);
      if (doors.includes("hymns")) expect(hymnsOf(s.slug).length + akathists(s.slug), s.slug).toBeGreaterThan(0);
      if (s.hasMiracles) expect(fs.existsSync(path.join(process.cwd(), "data", "saints", s.slug, "miracles.json")), s.slug).toBe(true);
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
