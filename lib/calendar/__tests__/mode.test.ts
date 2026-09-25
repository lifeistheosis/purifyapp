import { describe, expect, it } from "vitest";

import {
  MODE_BY_FAST_KIND,
  modeFor,
  resolveMode,
  type LiturgicalMode,
} from "@/lib/calendar/mode";
import { fastingStatus, monthGrid, type FastKind } from "@/lib/calendar/orthodox";

/**
 * The mode is a projection of facts the engine already owns, so these tests
 * assert properties of that projection rather than naming days: naming them
 * would be authoring a liturgical claim in a test, and the engine's own
 * suite (orthodox.test.ts) is where such claims are checked.
 */

const KINDS = Object.keys(MODE_BY_FAST_KIND) as FastKind[];

/** Every day of a civil year, in the UTC-noon frame the calendar uses. */
function yearDays(year: number): Date[] {
  const out: Date[] = [];
  for (let d = new Date(Date.UTC(year, 0, 1, 12)); d.getUTCFullYear() === year; ) {
    out.push(d);
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
  return out;
}

/** A cell's civil date back in the UTC-noon frame. */
function cellDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

describe("modeFor", () => {
  it("lets a feast win over every fasting kind, as toneFor does", () => {
    for (const fast of KINDS) {
      expect(modeFor({ hasFeast: true, fast }), fast).toBe("feast");
    }
  });

  it("reads the fasting table when there is no feast", () => {
    for (const fast of KINDS) {
      expect(modeFor({ hasFeast: false, fast }), fast).toBe(MODE_BY_FAST_KIND[fast]);
    }
  });

  it("never maps a fasting kind to feast: only the data's feast flag can do that", () => {
    for (const fast of KINDS) {
      expect(MODE_BY_FAST_KIND[fast], fast).not.toBe("feast");
    }
  });
});

describe("resolveMode", () => {
  it("covers every fasting kind the engine actually emits", () => {
    // The Record type already forces an entry per FastKind at compile time;
    // this catches the other direction, an engine that starts returning a
    // value outside the union through a cast or a JSON path.
    for (const year of [2026, 2027]) {
      for (const day of yearDays(year)) {
        const kind = fastingStatus(day).kind;
        expect(MODE_BY_FAST_KIND[kind], `${kind} on ${day.toISOString()}`).toBeDefined();
      }
    }
  });

  it("agrees with the month grid on every cell, in both reckonings", () => {
    // The whole point of reading the grid's own facts: a household screen and
    // the calendar must never colour the same day differently.
    const today = new Date(Date.UTC(2026, 8, 25, 12));
    for (const style of ["new", "old"] as const) {
      for (const [year, month] of [
        [2026, 0],
        [2026, 3],
        [2026, 7],
        [2026, 11],
        [2027, 3],
        [2027, 10],
      ]) {
        for (const cell of monthGrid(year, month, today, style)) {
          expect(
            resolveMode(cellDate(cell.iso), style),
            `${style} ${cell.iso}`,
          ).toBe(modeFor({ hasFeast: cell.hasFeast, fast: cell.fast }));
        }
      }
    }
  });

  it("produces all three modes across a year, in both reckonings", () => {
    // A guard against a degenerate projection, e.g. a feast test that reads
    // every commemoration as a feast and turns the whole year gold.
    for (const style of ["new", "old"] as const) {
      const seen = new Set<LiturgicalMode>();
      for (const day of yearDays(2026)) seen.add(resolveMode(day, style));
      expect([...seen].sort(), style).toEqual(["fast", "feast", "ordinary"]);
    }
  });

  it("defaults to the new reckoning", () => {
    for (const day of yearDays(2026).filter((_, i) => i % 7 === 0)) {
      expect(resolveMode(day)).toBe(resolveMode(day, "new"));
    }
  });
});
