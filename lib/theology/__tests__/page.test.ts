// A doctrine's own page and Theology's round 3 (1.8, r3-04): the owner's pick
// of 2026-10-30, "one A, two B and C, hybrid, three, C". The pure parts of
// the page: which doors a study has and which opens, the Fathers' medallions
// in order, the passage the deck opens on, and each study's cover.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DOCTRINE_DOORS,
  cardTextSize,
  doctrineDoors,
  doorsForAddress,
  epigraphIndex,
  fatherGroups,
  fatherKey,
  medallionInitial,
  medallionName,
  openingDoor,
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

describe("a doctrine's doors", () => {
  it("are B's four, in the design's order", () => {
    expect(DOCTRINE_DOORS).toEqual(["study", "fathers", "scripture", "related"]);
    expect(doctrineDoors({ passages: 3, scripture: 2, related: 1 })).toEqual(["study", "fathers", "scripture", "related"]);
  });

  it("are only the ones with something behind them; the study is always there", () => {
    expect(doctrineDoors({ passages: 0, scripture: 0, related: 0 })).toEqual(["study"]);
    expect(doctrineDoors({ passages: 4, scripture: 0, related: 2 })).toEqual(["study", "fathers", "related"]);
  });

  it("open on the Fathers, where the study has them, and the plain address names that door", () => {
    expect(openingDoor(["study", "fathers", "scripture"])).toBe("fathers");
    expect(openingDoor(["study", "scripture"])).toBe("study");
    // lib/ui/sectionTabs.ts gives the first part no #: the opening door.
    expect(doorsForAddress(["study", "fathers", "scripture", "related"])).toEqual(["fathers", "study", "scripture", "related"]);
    expect(doorsForAddress(["study", "related"])).toEqual(["study", "related"]);
  });

  it("every study has passages, so every page opens on the deck", () => {
    expect(studies.length).toBe(14);
    for (const { slug, body } of studies) expect(shown(body).length, slug).toBeGreaterThan(0);
  });
});

describe("a doctrine's cover", () => {
  it("is the icon of the subject the study belongs to, for every study", () => {
    for (const { slug } of studies) {
      const subject = subjectOfStudy(slug);
      expect(subject, slug).not.toBeNull();
      expect(fs.existsSync(path.join(process.cwd(), "public", subject!.picture.src)), subject!.picture.src).toBe(true);
    }
    expect(subjectOfStudy("essence-energies")?.id).toBe("salvation");
    expect(subjectOfStudy("no-such-study")).toBeNull();
  });
});

describe("the Fathers' medallions", () => {
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

  it("count every passage once, so All is the sum of the faces", () => {
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

describe("the passage the deck opens on (the study's epigraph)", () => {
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

describe("a card's words", () => {
  it("are set a step up when short and down when long, the design's 15px between", () => {
    expect(cardTextSize(120)).toBe(16.5);
    expect(cardTextSize(343)).toBe(15);
    expect(cardTextSize(700)).toBe(14);
    expect(cardTextSize(1508)).toBe(13);
  });
});
