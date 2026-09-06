// The device store: a union, a merge, and a completed_at that is written
// once. Nothing in the module can take an id away, and this holds it so.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CollectionIndexEntry } from "../collections";
import {
  COLLECTIONS_EVENT,
  addCorrectIds,
  completedCollections,
  mergeRemoteProgress,
  readCollectionProgress,
  recordCorrectAnswers,
  settleCompletion,
} from "../progressLocal";
import { fixtureId } from "./fixture";

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const NOW = new Date("2026-09-05T12:00:00.000Z");

const creed: CollectionIndexEntry = {
  slug: "the-creed",
  name: "The Creed",
  description: "Line by line.",
  tag: "creed",
  theme_id: "councils",
  sort_order: 1,
  question_ids: [fixtureId(0), fixtureId(5)],
};

const councils: CollectionIndexEntry = {
  ...creed,
  slug: "the-seven-councils",
  name: "The Seven Councils",
  tag: "councils",
  question_ids: [fixtureId(3), fixtureId(8)],
};

describe("collection progress on the device", () => {
  let events: string[];

  beforeEach(() => {
    events = [];
    vi.stubGlobal("window", {
      localStorage: storage(),
      dispatchEvent: (e: Event) => {
        events.push(e.type);
        return true;
      },
    });
    vi.stubGlobal("CustomEvent", class extends Event {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts empty and unions on every add", () => {
    expect(readCollectionProgress()).toEqual({});
    addCorrectIds("the-creed", [fixtureId(0)]);
    addCorrectIds("the-creed", [fixtureId(0), fixtureId(5)]);
    addCorrectIds("the-creed", []);
    expect(readCollectionProgress()["the-creed"].ids).toEqual([fixtureId(0), fixtureId(5)]);
    expect(events).toContain(COLLECTIONS_EVENT);
  });

  it("stamps completed_at once the published set is covered, and only once", () => {
    addCorrectIds("the-creed", [fixtureId(0)], creed.question_ids, NOW);
    expect(readCollectionProgress()["the-creed"].completed_at).toBeNull();
    addCorrectIds("the-creed", [fixtureId(5)], creed.question_ids, NOW);
    expect(readCollectionProgress()["the-creed"].completed_at).toBe(NOW.toISOString());
    const later = new Date("2026-10-01T00:00:00.000Z");
    addCorrectIds("the-creed", [fixtureId(5)], creed.question_ids, later);
    expect(readCollectionProgress()["the-creed"].completed_at).toBe(NOW.toISOString());
  });

  it("advances every collection a correct answer belongs to", () => {
    const touched = recordCorrectAnswers([creed, councils], [fixtureId(0), fixtureId(3), fixtureId(1)], NOW);
    expect(touched.map((t) => t.slug).sort()).toEqual(["the-creed", "the-seven-councils"]);
    expect(readCollectionProgress()["the-creed"].ids).toEqual([fixtureId(0)]);
    expect(readCollectionProgress()["the-seven-councils"].ids).toEqual([fixtureId(3)]);
    expect(recordCorrectAnswers([creed, councils], [], NOW)).toEqual([]);
  });

  it("keeps a completion when the index grows, and settles one the index now allows", () => {
    addCorrectIds("the-creed", [fixtureId(0), fixtureId(5)], creed.question_ids, NOW);
    const grown = { ...creed, question_ids: [...creed.question_ids, fixtureId(10)] };
    settleCompletion([grown]);
    recordCorrectAnswers([grown], [fixtureId(10)], new Date("2026-11-01T00:00:00.000Z"));
    expect(readCollectionProgress()["the-creed"].completed_at).toBe(NOW.toISOString());

    // The ids arrived before any page carried the index (a merge from the
    // account, say); the next read against the index settles it.
    addCorrectIds("the-seven-councils", councils.question_ids);
    expect(readCollectionProgress()["the-seven-councils"].completed_at).toBeNull();
    settleCompletion([councils], NOW);
    expect(readCollectionProgress()["the-seven-councils"].completed_at).toBe(NOW.toISOString());
  });

  it("merges the account's rows in without dropping what the device has", () => {
    addCorrectIds("the-creed", [fixtureId(5)]);
    mergeRemoteProgress([
      { slug: "the-creed", correct_question_ids: [fixtureId(0)], completed_at: "2026-08-01T00:00:00.000Z" },
      { slug: "the-seven-councils", correct_question_ids: null, completed_at: null },
      { slug: "", correct_question_ids: [fixtureId(9)], completed_at: null },
    ]);
    const map = readCollectionProgress();
    expect(map["the-creed"].ids).toEqual([fixtureId(5), fixtureId(0)]);
    expect(map["the-creed"].completed_at).toBe("2026-08-01T00:00:00.000Z");
    expect(map["the-seven-councils"]).toEqual({ ids: [], completed_at: null });
    expect(map[""]).toBeUndefined();

    // A second merge with fewer ids changes nothing.
    mergeRemoteProgress([{ slug: "the-creed", correct_question_ids: [], completed_at: null }]);
    expect(readCollectionProgress()["the-creed"].ids).toEqual([fixtureId(5), fixtureId(0)]);
  });

  it("lists completed collections oldest first", () => {
    addCorrectIds("b", [fixtureId(1)], [fixtureId(1)], new Date("2026-09-02T00:00:00.000Z"));
    addCorrectIds("a", [fixtureId(2)], [fixtureId(2)], new Date("2026-09-01T00:00:00.000Z"));
    addCorrectIds("c", [fixtureId(3)]);
    expect(completedCollections().map((c) => c.slug)).toEqual(["a", "b"]);
  });

  it("survives junk in storage", () => {
    window.localStorage.setItem("purify:catechism:collections", "{not json");
    expect(readCollectionProgress()).toEqual({});
    window.localStorage.setItem("purify:catechism:collections", JSON.stringify({ x: { ids: "no" }, y: [1] }));
    expect(readCollectionProgress()).toEqual({});
  });
});
