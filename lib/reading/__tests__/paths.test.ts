import { describe, expect, it } from "vitest";

import { ENTRIES, type WorkKey } from "../entries";
import { NATIVITY_PATH, nativityFastAround } from "../nativity";
import { pathPage } from "../pathView";
import { PATHS, getPath } from "../paths";
import { CHECKED_KEYS } from "../provenance";
import { statFor } from "../cards";

// Reading paths (1.8): every day is the Fathers' own words, from works the
// reading room checked word for word, never a retelling; every run of
// sections exists in its work; a day is about a quarter of an hour.

describe("reading paths", () => {
  it("read only works checked word for word, never a retelling", () => {
    for (const p of PATHS) {
      for (const r of p.days.flat()) {
        expect(ENTRIES[r.work as WorkKey]?.form, r.work).not.toBe("retelling");
        expect(CHECKED_KEYS, `${p.id}: ${r.work}`).toContain(r.work);
      }
    }
  });

  it("name only sections their works have, in order", () => {
    for (const p of PATHS) {
      for (const r of p.days.flat()) {
        const ns = statFor(r.work)!.sections.map(([n]) => n);
        if (r.from === undefined) continue;
        expect(ns, `${r.work} §${r.from}`).toContain(r.from);
        expect(ns, `${r.work} §${r.to}`).toContain(r.to ?? r.from);
        expect(r.from, r.work).toBeLessThanOrEqual(r.to ?? r.from);
      }
    }
  });

  it("keep each day short, and open each reading where it starts", () => {
    for (const p of PATHS) {
      const view = pathPage(p.id)!;
      expect(view.days).toHaveLength(p.days.length);
      for (const [i, day] of view.days.entries()) {
        expect(day.minutes, `${p.id} day ${i + 1}`).toBeLessThanOrEqual(45);
        for (const r of day.readings) expect(r.href, `${p.id} day ${i + 1}`).toMatch(/^\/saints\/[^/]+\/[^#]+#s\d+$/);
      }
    }
  });

  it("number the parts of a work read over several days", () => {
    const start = pathPage("start")!;
    expect(start.days[3].readings[0].part).toEqual({ n: 1, of: 2 });
    expect(start.days[4].readings[0].part).toEqual({ n: 2, of: 2 });
    expect(start.days[0].readings[0].part).toBeUndefined();
  });

  it("name the piece of a work read a section a day", () => {
    const nativity = pathPage(NATIVITY_PATH)!;
    expect(nativity.days[1].readings[0].place).toBe("Hymn I");
    expect(nativity.days[2].readings[0].place).toBe("Book III, Chapter I");
    expect(nativity.days[4].readings[0].place).toBe("Sermon XXI");
    expect(nativity.days[37].readings[0]).toMatchObject({ part: { n: 1, of: 3 } });
    expect(nativity.days[37].readings[0].place).toBeUndefined();
  });

  it("give the Nativity Fast a day for each of its forty days", () => {
    const [first, last] = nativityFastAround(new Date(2026, 10, 20), "new");
    expect(getPath(NATIVITY_PATH)!.days).toHaveLength(last - first + 1);
  });
});
