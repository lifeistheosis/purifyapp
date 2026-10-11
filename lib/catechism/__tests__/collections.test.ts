// The collection config loader, the progress math, and the committed file.
//
// Two promises worth pinning: progress is a set that only grows, and a
// completion is never revoked when the bank grows. The loader's refusals
// are pinned too, because a theme_id that names no palette would make a
// completed collection offer a palette that does nothing.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import raw from "@/data/catechism/collections.json";
import { READING_THEMES } from "@/lib/reader/readingModes";

import {
  collectionIndex,
  isComplete,
  loadCollections,
  progressFor,
  readCollection,
  tagQuestions,
  unionIds,
  type Collection,
} from "../collections";
import { collectionSchema, parseCollections } from "../collectionsSchema";
import { fixtureId, makeBank } from "./fixture";

const css = fs.readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");

const councils: Collection = {
  slug: "the-seven-councils",
  name: "The Seven Councils",
  description: "Every question drawn from the seven ecumenical councils.",
  tag: "councils",
  theme_id: "councils",
  sort_order: 1,
};

describe("parseCollections", () => {
  it("accepts a sound file and sorts by sort_order", () => {
    const r = parseCollections([
      { ...councils, slug: "b", sort_order: 2 },
      { ...councils, slug: "a", sort_order: 1 },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.collections.map((c) => c.slug)).toEqual(["a", "b"]);
  });

  it("rejects a theme_id that is not a collection palette", () => {
    for (const theme_id of ["sepia", "candlelight", "parchment", "default", ""]) {
      const r = parseCollections([{ ...councils, theme_id }]);
      expect(r.ok, theme_id).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toMatch(/theme_id/);
    }
  });

  it("rejects a duplicate slug, an unknown field, and an em dash", () => {
    expect(parseCollections([councils, councils]).ok).toBe(false);
    expect(parseCollections([{ ...councils, extra: 1 }]).ok).toBe(false);
    expect(parseCollections([{ ...councils, name: "The Seven \u2014 Councils" }]).ok).toBe(false);
    expect(parseCollections({}).ok).toBe(false);
  });

  it("names the row and the field in every error", () => {
    const r = parseCollections([{ ...councils, tag: "Not A Slug" }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/^row 0: tag/);
  });
});

describe("data/catechism/collections.json", () => {
  it("is a file the loader accepts whole, and every theme_id has a token block", () => {
    const r = parseCollections(raw);
    expect(r.ok, r.ok ? "" : r.errors.join("; ")).toBe(true);
    expect(loadCollections()).toHaveLength((raw as unknown[]).length);
    for (const c of loadCollections()) {
      expect(READING_THEMES.some((t) => t.id === c.theme_id && t.collection), c.slug).toBe(true);
      expect(css.includes(`html[data-reading-mode="${c.theme_id}"] {`), c.theme_id).toBe(true);
    }
  });

  it("never carries an em dash", () => {
    expect(JSON.stringify(raw).includes("\u2014")).toBe(false);
  });
});

describe("tagQuestions and the index", () => {
  it("keeps only published questions carrying the tag", () => {
    const bank = makeBank(10, (i) =>
      i === 3 ? { retired_at: "2026-01-01" } : i === 8 ? { published_at: "2030-01-01" } : {},
    );
    // Fixture tags cycle creed, saints, scripture, councils, prayer: councils is 3 and 8.
    expect(tagQuestions(bank, "councils", "2026-09-05").map((q) => q.id)).toEqual([]);
    const later = tagQuestions(bank, "councils", "2030-01-02").map((q) => q.id);
    expect(later).toEqual([fixtureId(8)]);
    expect(tagQuestions(bank, "creed", "2026-09-05").map((q) => q.id)).toEqual([fixtureId(0), fixtureId(5)]);
  });

  it("indexes each collection with its published ids", () => {
    const bank = makeBank(10);
    const idx = collectionIndex([{ ...councils, tag: "creed" }], bank, "2026-09-05");
    expect(idx[0].question_ids).toEqual([fixtureId(0), fixtureId(5)]);
  });
});

describe("progress", () => {
  it("counts only ids in the published set, and completes at all of them", () => {
    const published = [fixtureId(0), fixtureId(5)];
    expect(progressFor([], published)).toEqual({ done: 0, total: 2, complete: false });
    expect(progressFor([fixtureId(0), fixtureId(99)], published)).toEqual({ done: 1, total: 2, complete: false });
    expect(progressFor([fixtureId(5), fixtureId(0)], published)).toEqual({ done: 2, total: 2, complete: true });
    expect(isComplete([fixtureId(0)], [])).toBe(false);
  });

  it("unions and never drops", () => {
    const a = unionIds(["x", "y"], ["y", "z"]);
    expect(a).toEqual(["x", "y", "z"]);
    expect(unionIds(a, [])).toEqual(a);
    expect(unionIds([], a)).toEqual(a);
  });

  it("recomputes completion against a grown bank without touching the set", () => {
    const set = [fixtureId(0), fixtureId(5)];
    expect(isComplete(set, [fixtureId(0), fixtureId(5)])).toBe(true);
    // A new question with the tag: the collection is no longer complete on
    // read, but the set is what it was. completed_at, held by the stores,
    // is what a completion rests on (see progress.test.ts).
    expect(isComplete(set, [fixtureId(0), fixtureId(5), fixtureId(10)])).toBe(false);
    expect(set).toEqual([fixtureId(0), fixtureId(5)]);
  });
});

describe("the check the app reads the file with", () => {
  // ../collections.ts ships in the client bundle, so it reads the file with
  // a check written out by hand, and the zod schema lives apart from it. Two
  // checks of one file can drift, so every row here is put to both.
  const EM = String.fromCharCode(0x2014);
  const rows: unknown[] = [
    councils,
    { ...councils, name: "  The Seven Councils  " },
    { ...councils, sort_order: 0 },
    { ...councils, sort_order: 10_000 },
    { ...councils, slug: "a" },
    { ...councils, slug: "Not A Slug" },
    { ...councils, slug: "trailing-" },
    { ...councils, slug: "x".repeat(65) },
    { ...councils, name: "" },
    { ...councils, name: "   " },
    { ...councils, name: "n".repeat(81) },
    { ...councils, name: `The Seven ${EM} Councils` },
    { ...councils, description: "d".repeat(401) },
    { ...councils, description: `One ${EM} two` },
    { ...councils, tag: "Councils" },
    { ...councils, tag: "t".repeat(65) },
    { ...councils, theme_id: "default" },
    { ...councils, theme_id: "no-such-palette" },
    { ...councils, theme_id: 7 },
    { ...councils, sort_order: -1 },
    { ...councils, sort_order: 10_001 },
    { ...councils, sort_order: 1.5 },
    { ...councils, sort_order: "1" },
    { ...councils, extra: 1 },
    Object.fromEntries(Object.entries(councils).filter(([field]) => field !== "name")),
    null,
    [],
    "councils",
    7,
  ];

  it("gives the schema's answer for every row, and the same collection when it is one", () => {
    for (const row of rows) {
      const byHand = readCollection(row);
      const bySchema = collectionSchema.safeParse(row);
      expect(byHand.ok, JSON.stringify(row)).toBe(bySchema.success);
      if (byHand.ok && bySchema.success) expect(byHand.collection).toEqual(bySchema.data);
    }
  });

  it("trims a name the way the schema does", () => {
    const r = readCollection({ ...councils, name: "  The Seven Councils  " });
    expect(r.ok && r.collection.name).toBe("The Seven Councils");
  });

  it("is reached by the app without zod", () => {
    // The profile bridge runs on every screen and reaches these files. With
    // zod among them every cold open of the app read 263 KB it never used.
    const reached = [
      "collections.ts",
      "progressLocal.ts",
      "progressSync.ts",
      "useCollectionProgress.ts",
      "useCompletionCount.ts",
      "local.ts",
      "grade.ts",
      "dates.ts",
    ];
    for (const name of reached) {
      const source = fs.readFileSync(path.resolve(__dirname, "..", name), "utf8");
      expect(source, name).not.toMatch(/from "zod"/);
      expect(source.includes('from "./collectionsSchema"'), name).toBe(false);
    }
  });
});
