import { describe, expect, it } from "vitest";

import { monthGrid, type MonthCell } from "@/lib/calendar/orthodox";

/**
 * monthGrid's output crosses the RSC boundary into CalendarGrid, which is a
 * client component, so every field is serialized into the flight payload 42
 * times over.
 *
 * It used to carry `saints: Saint[]` and `commemorations: Commemoration[]`
 * with each commemoration's `saint` resolved. Nothing on the client read
 * either. Measured on the built export, they were 151,385 of the page's
 * 201,837 characters, 75% of the payload, and embedded 51 complete Saint
 * records with their shortBio, life, works and quotes.
 *
 * The obvious way to regress this is not malice, it is convenience: someone
 * needs a saint's icon in a tile, sees that the server already resolved one a
 * few lines up, and passes the record through. These tests exist to make that
 * fail loudly at the boundary rather than quietly in the payload.
 */
describe("monthGrid keeps the client payload minimal", () => {
  const grid = monthGrid(2026, 3, new Date(Date.UTC(2026, 3, 12, 12)), "new");

  it("returns 42 cells", () => {
    expect(grid).toHaveLength(42);
  });

  it("carries no resolved saint or commemoration records", () => {
    for (const cell of grid) {
      expect(cell).not.toHaveProperty("saints");
      expect(cell).not.toHaveProperty("commemorations");
      expect(cell).not.toHaveProperty("headline");
    }
  });

  it("exposes exactly the fields a tile paints, and no others", () => {
    const allowed = new Set<keyof MonthCell>([
      "iso",
      "day",
      "inMonth",
      "isToday",
      "hasFeast",
      "headlineName",
      "fast",
    ]);
    for (const cell of grid) {
      for (const key of Object.keys(cell)) {
        expect(
          allowed.has(key as keyof MonthCell),
          `monthGrid emitted an unexpected field "${key}". Every field here is serialized 42 times into the client payload. If a tile genuinely paints it, add it to this list and to the MonthCell docblock; if it does not, resolve it on the server instead.`,
        ).toBe(true);
      }
    }
  });

  it("serializes to a small payload", () => {
    // The whole point. A generous ceiling: the real figure for a dense
    // menologion month is a few KB, and the version this replaced was 151 KB.
    const bytes = JSON.stringify(grid).length;
    expect(bytes).toBeLessThan(12_000);
  });

  it("carries no nested objects, so nothing rich can ride along unnoticed", () => {
    for (const cell of grid) {
      for (const value of Object.values(cell)) {
        expect(typeof value === "object" && value !== null).toBe(false);
      }
    }
  });

  it("dates are ISO strings, not Dates", () => {
    for (const cell of grid) {
      expect(typeof cell.iso).toBe("string");
      expect(cell.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("marks the right day as today and the right days as in-month", () => {
    const today = grid.filter((c) => c.isToday);
    expect(today).toHaveLength(1);
    expect(today[0]?.iso).toBe("2026-04-12");
    // April 2026 has 30 days.
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
  });
});
