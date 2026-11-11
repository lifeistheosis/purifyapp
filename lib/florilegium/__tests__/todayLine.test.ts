// A line from the reader's own florilegium on Today (1.9, s5-07).

import { describe, expect, it } from "vitest";

import type { Florilegium, FlorilegiumItem } from "@/lib/florilegium/florilegium";
import { STARTERS, starterItems } from "@/lib/florilegium/starters";
import { lineForDay } from "@/lib/florilegium/todayLine";

const verse = (id: string, addedAt: number): FlorilegiumItem => ({
  id,
  addedAt,
  kind: "scripture",
  text: `words ${id}`,
  reference: "John 1:1",
  book: "john",
  chapter: 1,
  verse: 1,
});
const gathering = (id: string, items: FlorilegiumItem[]): Florilegium => ({ id, title: id, createdAt: 0, updatedAt: 0, items });

describe("the day's line from the reader's florilegium", () => {
  it("is none while nothing is gathered", () => {
    expect(lineForDay([], "2026-11-07")).toBeNull();
    expect(lineForDay([gathering("a", [])], "2026-11-07")).toBeNull();
  });

  it("is the same all day and another the next, every line coming round in turn, across gatherings", () => {
    const all = [gathering("a", [verse("1", 10), verse("3", 30)]), gathering("b", [verse("2", 20)])];
    const seen = ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"].map((d) => lineForDay(all, d)!.item.id);
    expect(lineForDay(all, "2026-11-07")!.item.id).toBe(seen[0]);
    expect(new Set(seen.slice(0, 3))).toEqual(new Set(["1", "2", "3"]));
    expect(seen[3]).toBe(seen[0]);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });

  it("names the gathering the line is in", () => {
    const all = [gathering("Lent", [verse("1", 10)])];
    expect(lineForDay(all, "2026-11-07")?.florilegium.title).toBe("Lent");
  });

  it("passes over a line with no words", () => {
    const all = [gathering("a", [{ ...verse("1", 10), text: "  " }, verse("2", 20)])];
    expect(lineForDay(all, "2026-11-07")?.item.id).toBe("2");
  });
});

// "Your Florilegium" is what the reader gathered (build 93 note 19). The
// owner had kept one of the four starters, gathered nothing else, and Today
// said "Your Florilegium" over Luke 1:53: "I'm not sure why the Your
// Florilegium just is the song of the Theotokos."
describe("a starter's verses are the Florilegium's, not the reader's", () => {
  const song = STARTERS.find((s) => s.id === "magnificat")!;
  /** The starter as Keep writes it into the reader's gatherings. */
  const kept = (id: string, extra: FlorilegiumItem[] = []): Florilegium =>
    gathering(id, [...extra, ...starterItems(song, "Luke").map((item, i) => ({ ...item, id: `${id}-${i}`, addedAt: 100 + i }) as FlorilegiumItem)]);
  const days = ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"];

  it("his case: one starter kept and nothing else, so the line is the starter's and says so", () => {
    for (const day of days) {
      const line = lineForDay([kept("song")], day)!;
      expect(line.fromStarter, day).toBe(true);
      expect(line.item.kind === "scripture" && line.item.book === "luke" && line.item.chapter === 1, day).toBe(true);
    }
  });

  it("once the reader has gathered a line of their own, Today shows theirs, and only theirs", () => {
    const mine = gathering("Lent", [verse("mine-1", 10), verse("mine-2", 20)]);
    const seen = days.map((day) => lineForDay([kept("song"), mine], day)!);
    for (const line of seen) expect(line.fromStarter).toBe(false);
    expect(new Set(seen.map((l) => l.item.id))).toEqual(new Set(["mine-1", "mine-2"]));
  });

  it("a line the reader added to a kept starter is theirs", () => {
    const added: FlorilegiumItem = { id: "added", addedAt: 500, kind: "father", text: "words of a Father", author: "St. Ephrem the Syrian" };
    const seen = days.map((day) => lineForDay([kept("song", [added])], day)!);
    for (const line of seen) {
      expect(line.item.id).toBe("added");
      expect(line.fromStarter).toBe(false);
    }
  });

  it("a gathering of the reader's own that happens to hold a verse of a starter is still theirs", () => {
    // One verse of the Song, gathered by hand: not the whole starter, so not a kept starter.
    const one: FlorilegiumItem = { id: "v46", addedAt: 5, kind: "scripture", text: "My soul doth magnify the Lord", reference: "Luke 1:46", book: "luke", chapter: 1, verse: 46 };
    expect(lineForDay([gathering("Mine", [one])], "2026-11-07")!.fromStarter).toBe(false);
  });

  it("the card heads the one The Florilegium and the other Your Florilegium", async () => {
    const fs = await import("node:fs");
    const card = fs.readFileSync("components/today/FlorilegiumLineCard.tsx", "utf8");
    expect(card).toContain('t(fromStarter ? "study.florilegium.title" : "community.yourFlorilegium")');
    const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;
    expect(en["study.florilegium.title"]).toBe("The Florilegium");
    expect(en["community.yourFlorilegium"]).toBe("Your Florilegium");
  });
});

