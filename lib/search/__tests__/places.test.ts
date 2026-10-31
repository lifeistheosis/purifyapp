// Where the one search can be turned (1.8, the owner's pick of r3-12, "C,
// with the mix of B"): its doors, each door's kinds, the names a caller may
// give, and the one way to open it (lib/search/open.ts).
//
// What a reader would notice if this broke: a door with no picture or a key
// printed for its name; Theology's pill opening on Everything; the
// dictionary's field opening anywhere but its words; a magnifier that opens
// the wrong place for the page it is on.

import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SEARCH_OPEN_EVENT, openSearch, placeOf } from "@/lib/search/open";
import {
  DOORS,
  DOOR_HINT,
  DOOR_KINDS,
  EVERYTHING,
  GROUP_DOOR,
  GROUP_LABEL,
  KIND_LABEL,
  PLACES,
  placeForPath,
  turnFor,
} from "@/lib/search/places";
import { GROUP_ORDER } from "@/lib/search/types";
import { THEOLOGY_SECTIONS } from "@/lib/theology/searchKinds";

const ROOT = process.cwd();
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8")) as Record<string, string>;

describe("the doors", () => {
  it("are named by lines every catalog has, and wear pictures the apps carry", () => {
    expect(DOORS[0].id).toBe("all");
    expect(DOORS[0].picture).toBeUndefined();
    for (const door of DOORS) {
      expect(EN[door.labelKey], door.id).toBeTruthy();
      if (door.picture) expect(fs.existsSync(path.join(ROOT, "public", door.picture)), door.picture).toBe(true);
    }
    expect(new Set(DOORS.map((d) => d.id)).size).toBe(DOORS.length);
  });

  it("name their kinds and lines by keys English has", () => {
    for (const key of [...Object.values(KIND_LABEL), ...Object.values(GROUP_LABEL), ...Object.values(DOOR_HINT)]) {
      expect(EN[key], key).toBeTruthy();
    }
    for (const group of GROUP_ORDER) expect(GROUP_LABEL[group], group).toBeTruthy();
    for (const group of GROUP_ORDER) {
      const door = GROUP_DOOR[group];
      if (door) expect(DOORS.some((d) => d.id === door), group).toBe(true);
    }
  });

  it("give Theology the library's own kinds in its own order, the dictionary after them", () => {
    expect(DOOR_KINDS.theology).toEqual([...THEOLOGY_SECTIONS.map((s) => s.toLowerCase()), "dictionary"]);
    // No strip where a door holds one kind.
    for (const door of ["all", "bible", "history", "shop"] as const) expect(DOOR_KINDS[door]).toBeUndefined();
  });
});

describe("a place's name", () => {
  it("turns the search to its door, and the dictionary to Theology's Dictionary", () => {
    expect(turnFor("theology")).toEqual({ door: "theology", kind: null });
    expect(turnFor("bible")).toEqual({ door: "bible", kind: null });
    expect(turnFor("dictionary")).toEqual({ door: "theology", kind: "dictionary" });
    expect(turnFor("Theology")).toEqual({ door: "theology", kind: null });
    for (const [name, turn] of Object.entries(PLACES)) {
      expect(DOORS.some((d) => d.id === turn.door), name).toBe(true);
      if (turn.kind) expect(DOOR_KINDS[turn.door], name).toContain(turn.kind);
    }
  });

  it("opens on Everything when it names nothing the search knows", () => {
    expect(turnFor(undefined)).toEqual(EVERYTHING);
    expect(turnFor("")).toEqual(EVERYTHING);
    expect(turnFor("somewhere")).toEqual(EVERYTHING);
  });

  it("is read from the address when an opening names none", () => {
    expect(placeForPath("/theology/filioque")).toBe("theology");
    expect(placeForPath("/heresies/arianism")).toBe("theology");
    expect(placeForPath("/apologetics/sola-scriptura")).toBe("theology");
    expect(placeForPath("/dictionary")).toBe("dictionary");
    expect(placeForPath("/bible/john/3")).toBe("bible");
    expect(placeForPath("/saints/basil-the-great/on-the-holy-spirit")).toBe("saints");
    expect(placeForPath("/chants/prayer-rope-anthem")).toBe("prayers");
    expect(placeForPath("/history?era=early")).toBe("history");
    expect(placeForPath("/")).toBe("all");
    expect(placeForPath("/today")).toBe("all");
    expect(placeForPath(null)).toBe("all");
  });
});

describe("the one way to open it", () => {
  const had = (globalThis as { window?: unknown }).window;
  afterEach(() => {
    if (had === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = had;
  });

  it("is one event with the place in it, and nothing at all where there is no window", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(() => openSearch("theology")).not.toThrow();

    const target = new EventTarget();
    (globalThis as { window?: unknown }).window = target;
    const heard: (string | undefined)[] = [];
    target.addEventListener(SEARCH_OPEN_EVENT, (e) => heard.push(placeOf(e)));
    openSearch("theology");
    openSearch();
    expect(SEARCH_OPEN_EVENT).toBe("purify:search-open");
    expect(heard).toEqual(["theology", undefined]);
    // An event from anywhere else under the name reads as naming no place.
    expect(placeOf(new Event(SEARCH_OPEN_EVENT))).toBeUndefined();
    expect(placeOf(new CustomEvent(SEARCH_OPEN_EVENT, { detail: { place: 7 } }))).toBeUndefined();
  });
});
