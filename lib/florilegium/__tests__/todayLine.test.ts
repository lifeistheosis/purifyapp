// A line from the reader's own florilegium on Today (1.9, s5-07).

import { describe, expect, it } from "vitest";

import type { Florilegium, FlorilegiumItem } from "@/lib/florilegium/florilegium";
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
