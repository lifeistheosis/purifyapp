// A doctrine's own page (1.8): the pure parts. Round 3 r3-04 made it B's
// doors and C's deck; round 3 r3-13 (the owner's hybrid of B and C,
// 2026-10-30) made it B's cover, a Father's words over his portrait, and C's
// "before you read". Held here: the Fathers in order, the passage the cover
// opens on, each study's subject, and the cards' words.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CARD_LINES,
  CARD_TEXT,
  COVER_LINES,
  COVER_TEXT,
  epigraphIndex,
  fatherGroups,
  fatherKey,
  medallionInitial,
  medallionName,
  subjectOfStudy,
} from "@/lib/theology/page";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";
import type { TheologyBody } from "@/lib/theology/load";

const DATA = path.join(process.cwd(), "data", "theology");
const studies = THEOLOGY_TOPICS.filter((t) => !t.planned).map((t) => ({
  slug: t.slug,
  body: JSON.parse(fs.readFileSync(path.join(DATA, `${t.slug}.json`), "utf8")) as TheologyBody,
}));
/** The passages a reader is shown (lib/theology/load.ts, shownOnly). */
const shown = (body: TheologyBody) => body.florilegium.filter((q) => q.cite?.kind !== "untraced");

describe("a doctrine's subject", () => {
  it("is the subject the study belongs to, for every study, its icon on disk", () => {
    expect(studies.length).toBe(14);
    for (const { slug } of studies) {
      const subject = subjectOfStudy(slug);
      expect(subject, slug).not.toBeNull();
      expect(fs.existsSync(path.join(process.cwd(), "public", subject!.picture.src)), subject!.picture.src).toBe(true);
    }
    expect(subjectOfStudy("essence-energies")?.id).toBe("salvation");
    expect(subjectOfStudy("no-such-study")).toBeNull();
  });

  it("every study has passages, so every page has a cover of a Father's words", () => {
    for (const { slug, body } of studies) expect(shown(body).length, slug).toBeGreaterThan(0);
  });
});

describe("a study's Fathers", () => {
  it("are most quoted first, Fathers quoted as often in the order the study first quotes them", () => {
    const groups = fatherGroups([
      { saintSlug: "a", author: "A" },
      { saintSlug: "b", author: "B" },
      { saintSlug: "b", author: "B" },
      { author: "The Didache" },
      { saintSlug: "a", author: "A" },
      { saintSlug: "c", author: "C" },
      { author: "The Didache " },
    ]);
    expect(groups.map((g) => [g.key, g.count])).toEqual([
      ["a", 2],
      ["b", 2],
      ["author:The Didache", 2],
      ["c", 1],
    ]);
  });

  it("count every passage once", () => {
    for (const { slug, body } of studies) {
      const passages = shown(body);
      const groups = fatherGroups(passages);
      expect(groups.reduce((n, g) => n + g.count, 0), slug).toBe(passages.length);
      for (const p of passages) expect(groups.some((g) => g.key === fatherKey(p)), slug).toBe(true);
    }
  });

  it("are named as the saint web names its saints, without the St.", () => {
    expect(medallionName("St. Basil the Great")).toBe("Basil the Great");
    expect(medallionName("Sts. Cyril and Methodius")).toBe("Cyril and Methodius");
    expect(medallionName("The Divine Liturgy of St John Chrysostom")).toBe("The Divine Liturgy of St John Chrysostom");
    expect(medallionInitial("St. John of Damascus")).toBe("J");
    expect(medallionInitial("The Council of Laodicea")).toBe("C");
  });
});

describe("the passage the cover opens on (the study's epigraph)", () => {
  const passages = [{ text: "First words." }, { text: "It is plain, then,  that there is a God." }, { text: "Third." }];

  it("is the editors' pick, by its opening words, where the study has one", () => {
    expect(epigraphIndex(passages, "it is plain, then, that")).toBe(1);
  });

  it("is the first passage where it has none, or the pick names no passage the page shows", () => {
    expect(epigraphIndex(passages)).toBe(0);
    expect(epigraphIndex(passages, "  ")).toBe(0);
    expect(epigraphIndex(passages, "Words no passage begins with")).toBe(0);
  });

  it("names a passage the page shows, in every study that has a pick", () => {
    for (const { slug, body } of studies) {
      if (!body.epigraph) continue;
      const opening = body.epigraph.replace(/\s+/g, " ").trim().toLowerCase();
      expect(
        shown(body).some((q) => q.text.replace(/\s+/g, " ").trim().toLowerCase().startsWith(opening)),
        `${slug}: its epigraph opens no passage the page shows`,
      ).toBe(true);
    }
  });
});

describe("a card's words and the cover's (build 83: no card as tall as the longest passage)", () => {
  it("are B's 15.5px on a card and 18px on the cover, and fold after a few lines", () => {
    expect(CARD_TEXT).toEqual({ size: 15.5, lineHeight: 1.5 });
    expect(CARD_LINES).toBe(7);
    expect(COVER_TEXT).toEqual({ size: 18, lineHeight: 1.45 });
    expect(COVER_LINES).toBe(6);
  });

  it("each have somewhere Read where it's from opens them whole", () => {
    // The fold is resolved there: a place in the app, or a public-domain page.
    for (const { slug, body } of studies) {
      for (const q of shown(body)) {
        const inApp = q.cite ? ["work", "council", "inexact", "scripture"].includes(q.cite.kind) : false;
        expect(inApp || Boolean(q.source), `${slug}: ${q.author}`).toBe(true);
      }
    }
  });
});
