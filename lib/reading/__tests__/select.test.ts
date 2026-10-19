// What the reading room draws (lib/reading/select.ts), from the cards the
// server builds (lib/reading/cards.ts): the rows, More like this, the search
// and its filters, and the book for the day.

import { describe, expect, it } from "vitest";

import { orthodoxPascha } from "@/lib/calendar/pascha";
import { THEMES, lengthBucket, themesIn } from "@/lib/reading/catalog";
import { buildRoom, bookPage } from "@/lib/reading/cards";
import {
  beginRow,
  featuredFor,
  fold,
  hrefFor,
  moreLikeThis,
  optionCounts,
  searchCards,
  seasonRow,
  shortRow,
  themeRow,
  traditionRows,
  type SearchLabels,
} from "@/lib/reading/select";
import { SAINTS } from "@/lib/saints/saints";

const room = buildRoom(false);
const labels: SearchLabels = {
  theme: (id) => THEMES.find((t) => t.id === id)!.label,
  tradition: (id) => id,
  era: (id) => id,
};
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

describe("the room's cards", () => {
  it("are every work once, the twin registration left out", () => {
    const works = SAINTS.reduce((n, s) => n + s.works.length, 0);
    expect(room.cards).toHaveLength(works - 1);
    expect(room.cards.some((c) => c.key === "anthony-the-great/life-of-antony")).toBe(false);
    expect(new Set(room.cards.map((c) => c.key)).size).toBe(room.cards.length);
  });

  it("say By, About or nothing as the entry does, and carry a cover only where a picture is settled", () => {
    const antony = room.cards.find((c) => c.key === "athanasius-the-great/life-of-antony")!;
    expect(antony.byline).toBe("by");
    expect(antony.authorSlug).toBe("athanasius-the-great");
    const pilgrim = room.cards.find((c) => c.key === "theophan-the-recluse/way-of-a-pilgrim")!;
    expect(pilgrim.byline).toBe("anonymous");
    expect(pilgrim.author).toBeNull();
    expect(pilgrim.cover).toBeUndefined();
    const pimen = room.cards.find((c) => c.key === "pimen-the-great/the-shepherd-of-scetis")!;
    expect(pimen.byline).toBe("about");
    expect(pimen.retelling).toBe(true);
    const unverified = room.cards.filter((c) => c.cover && /\/saints\/icons\//.test(c.cover.src));
    for (const c of unverified) expect(c.cover!.src, c.key).toMatch(/^\/saints\/icons\/[a-z-]+\.jpg$/);
  });
});

describe("the rows", () => {
  it("open each passion, virtue and trouble of daily life on its one best reading, in order", () => {
    for (const group of ["passions", "virtues", "life"] as const) {
      const row = themeRow(room, group);
      expect(row.map((p) => p.theme)).toEqual(themesIn(group));
      for (const p of row) {
        const card = room.cards.find((c) => c.key === p.key)!;
        expect(card.retelling, p.key).toBeUndefined();
        expect(p.minutes).toBeGreaterThan(0);
      }
    }
    // Anger: Cassian's Institutes, Book 8, from its first chapter.
    const anger = themeRow(room, "passions").find((p) => p.theme === "anger")!;
    expect(anger.href).toBe("/saints/john-cassian/institutes#s157");
    expect(anger.part).toEqual({ kind: "book", from: 8 });
  });

  it("have a row for each tradition with four works or more, and none for an empty one", () => {
    const ids = traditionRows(room).map((r) => r.id);
    for (const id of ["greek", "latin", "egypt", "antioch", "syriac", "russian", "desert"] as const) expect(ids).toContain(id);
    for (const id of ["serbian", "romanian", "georgian"] as const) expect(ids).not.toContain(id);
    for (const row of traditionRows(room)) {
      const per = new Map<string, number>();
      for (const c of row.cards.slice(0, 6)) per.set(c.authorSlug ?? c.key, (per.get(c.authorSlug ?? c.key) ?? 0) + 1);
      expect(Math.max(...per.values()), row.id).toBeLessThanOrEqual(2);
    }
  });

  it("keep short reads whole, short and in the Fathers' own words", () => {
    const short = shortRow(room);
    expect(short.length).toBeGreaterThanOrEqual(6);
    for (const c of short) {
      expect(c.minutes, c.key).toBeLessThanOrEqual(20);
      expect(c.selections, c.key).toBeUndefined();
      expect(c.retelling, c.key).toBeUndefined();
    }
  });

  it("begin with the editor's first reads, in order", () => {
    expect(beginRow(room).map((c) => c.key)[0]).toBe("athanasius-the-great/on-the-incarnation");
    expect(beginRow(room)).toHaveLength(room.begin.length);
  });

  it("give each season of the year its readings", () => {
    for (const season of ["lent", "holyWeek", "pascha", "nativity"] as const) {
      expect(seasonRow(room, season).length, season).toBeGreaterThanOrEqual(3);
    }
    const holyWeek = seasonRow(room, "holyWeek");
    expect(holyWeek.some((p) => p.href === "/saints/john-chrysostom/homilies-on-matthew#s80")).toBe(true);
  });
});

describe("More like this", () => {
  it("never offers the book itself, nor more than two of one author", () => {
    for (const key of ["john-cassian/institutes", "athanasius-the-great/on-the-incarnation", "theophan-the-recluse/way-of-a-pilgrim"]) {
      const like = moreLikeThis(room, key, 8);
      expect(like.length, key).toBeGreaterThan(0);
      expect(like.some((c) => c.key === key)).toBe(false);
      const per = new Map<string, number>();
      for (const c of like) per.set(c.authorSlug ?? c.key, (per.get(c.authorSlug ?? c.key) ?? 0) + 1);
      expect(Math.max(...per.values()), key).toBeLessThanOrEqual(2);
    }
  });

  it("leads with what shares a theme", () => {
    const like = moreLikeThis(room, "john-cassian/institutes", 8);
    const institutes = room.cards.find((c) => c.key === "john-cassian/institutes")!;
    expect(like[0].themes.some((t) => institutes.themes.includes(t))).toBe(true);
  });

  it("shows a work registered twice by its twin", () => {
    const page = bookPage(SAINTS.find((s) => s.slug === "anthony-the-great")!, "life-of-antony", false)!;
    expect(page.key).toBe("athanasius-the-great/life-of-antony");
    expect(page.like.some((c) => c.key === page.key)).toBe(false);
    expect(page.header.card.byline).toBe("by");
  });
});

describe("the search", () => {
  it("finds a title, an author and a theme, whatever the accents and the case", () => {
    expect(searchCards(room, "incarnation", {}, labels)[0].key).toBe("athanasius-the-great/on-the-incarnation");
    expect(searchCards(room, "CASSIAN", {}, labels).map((c) => c.key)).toEqual(expect.arrayContaining(["john-cassian/institutes", "john-cassian/conferences"]));
    expect(searchCards(room, "vainglory", {}, labels).length).toBeGreaterThan(0);
    expect(fold("Ἐφραίμ Éphrem")).toBe(fold("Εφραιμ ephrem"));
  });

  it("narrows by every filter, and opens a work at the part a theme names", () => {
    const anger = searchCards(room, "", { theme: "anger" }, labels);
    expect(anger.map((c) => c.key)).toContain("john-cassian/institutes");
    const institutes = anger.find((c) => c.key === "john-cassian/institutes")!;
    expect(hrefFor(institutes, "anger")).toBe("/saints/john-cassian/institutes#s157");
    expect(hrefFor(institutes)).toBe("/saints/john-cassian/institutes");
    for (const c of searchCards(room, "", { tradition: "russian" }, labels)) expect(c.traditions).toContain("russian");
    for (const c of searchCards(room, "", { length: "under20" }, labels)) expect(c.minutes).toBeLessThanOrEqual(20);
    for (const c of searchCards(room, "", { era: "byzantine" }, labels)) expect(c.era).toBe("byzantine");
    for (const c of searchCards(room, "", { author: "john-chrysostom" }, labels)) expect(c.authorSlug).toBe("john-chrysostom");
    expect(searchCards(room, "zzzz no such book", {}, labels)).toEqual([]);
  });

  it("counts what each choice would leave, the words and the other filters as they are", () => {
    const counts = optionCounts(room, "", { tradition: "russian" }, labels, "length", ["under20", "longer"]);
    const russian = room.cards.filter((c) => c.traditions.includes("russian"));
    expect(counts.get("under20")).toBe(russian.filter((c) => lengthBucket(c.minutes) === "under20").length);
    const words = optionCounts(room, "Cassian", {}, labels, "theme", ["anger", "grief"]);
    expect(words.get("anger")).toBe(2);
    expect(words.get("grief")).toBe(0);
  });
});

describe("the book for the day", () => {
  it("is a book of the saint the Church keeps today, on either calendar", () => {
    // St Antony, January 17; on the Old Calendar the civil January 30.
    expect(featuredFor(room, day(2027, 1, 17), "new")).toEqual({ key: "athanasius-the-great/life-of-antony", reason: "feast" });
    expect(featuredFor(room, day(2027, 1, 30), "old")).toEqual({ key: "athanasius-the-great/life-of-antony", reason: "feast" });
  });

  it("else one kept for the season, else one for the week", () => {
    const pascha = orthodoxPascha(2027);
    const bright = new Date(pascha.getTime() + 2 * 86_400_000);
    const pick = featuredFor(room, bright, "new")!;
    expect(["feast", "season"]).toContain(pick.reason);
    // A Monday and a Tuesday of one week with no feast in the pool: the same book.
    const october = featuredFor(room, day(2026, 10, 12), "new")!;
    expect(october.reason).toBe("week");
    expect(featuredFor(room, day(2026, 10, 13), "new")).toEqual(october);
  });

  it("stands a book with a picture on the stage, whenever the week has one", () => {
    // 2026-10-18: Confessions, which has no settled picture, stood there as a bare plate.
    const hasPicture = (key: string) => Boolean(room.cards.find((c) => c.key === key)?.cover);
    for (let d = 0; d < 7 * 12; d += 7) {
      const pick = featuredFor(room, day(2026, 10, 18 + d), "new")!;
      if (pick.reason !== "feast") expect(hasPicture(pick.key)).toBe(true);
    }
  });
});
