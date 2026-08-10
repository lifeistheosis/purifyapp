// The Pascha-relative lectionary. Until 2026-08-09 every pre-Pascha offset in
// data/calendar/movable-readings.json sat one week late: Palm Sunday was keyed
// -5 and the five Lenten Sundays were each a week short, so a reader in Lent
// was shown the previous Sunday's Epistle and Gospel. The rest of the calendar
// had the right arithmetic all along (fastingStatus and currentSeason both use
// addDays(pascha, -7) for Palm Sunday), so the data file was the lone outlier.
//
// The invariant these tests lock down: a Sunday n weeks before Pascha is keyed
// -7n, Lazarus Saturday is -8, Holy Week is -6 through -1, and Ascension is
// +39. Readings are cross-checked against the OCA daily readings for the 2026
// Paschal cycle (Pascha 2026-04-12).

import { describe, expect, it } from "vitest";
import { movableLabelOn, readingsOn, orthodoxPascha } from "@/lib/calendar/orthodox";
import movableReadings from "@/data/calendar/movable-readings.json";

const OFFSETS = (movableReadings as { offsets: Record<string, unknown> }).offsets;

/** The date that sits `offset` days from Orthodox Pascha in `year`. */
function fromPascha(year: number, offset: number): Date {
  const d = new Date(orthodoxPascha(year));
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

describe("movable lectionary keys", () => {
  // Every named Sunday, and the weekday of the week it must land on.
  const sundays: Array<[number, string]> = [
    [-77, "Sunday of Zacchaeus (pre-Triodion)"],
    [-70, "Sunday of the Publican and the Pharisee"],
    [-63, "Sunday of the Prodigal Son"],
    [-56, "Sunday of the Last Judgment (Meatfare)"],
    [-49, "Forgiveness Sunday (Cheesefare)"],
    [-42, "Sunday of Orthodoxy (1st of Great Lent)"],
    [-35, "Sunday of St Gregory Palamas (2nd of Great Lent)"],
    [-28, "Sunday of the Holy Cross (3rd of Great Lent)"],
    [-21, "Sunday of St John of the Ladder (4th of Great Lent)"],
    [-14, "Sunday of St Mary of Egypt (5th of Great Lent)"],
    [-7, "Palm Sunday, the Entry of the Lord into Jerusalem"],
    [0, "Pascha, the Feast of Feasts"],
    [7, "Sunday of St Thomas (Antipascha)"],
    [14, "Sunday of the Myrrh-Bearing Women"],
    [21, "Sunday of the Paralytic"],
    [28, "Sunday of the Samaritan Woman"],
    [35, "Sunday of the Blind Man"],
    [42, "Sunday of the Holy Fathers of the First Ecumenical Council"],
    [49, "Pentecost, the Descent of the Holy Spirit"],
    [56, "Sunday of All Saints"],
  ];

  for (const [offset, label] of sundays) {
    it(`keys "${label}" at ${offset}, a Sunday`, () => {
      expect(movableLabelOn(fromPascha(2026, offset))).toBe(label);
      expect(fromPascha(2026, offset).getUTCDay()).toBe(0);
    });
  }

  it("keys every Sunday of the cycle at a multiple of seven", () => {
    // Math.abs, because -63 % 7 is -0 and toBe uses Object.is.
    for (const [offset] of sundays) expect(Math.abs(offset % 7)).toBe(0);
  });

  it("puts Lazarus Saturday the day before Palm Sunday", () => {
    const lazarus = fromPascha(2026, -8);
    expect(movableLabelOn(lazarus)).toBe("Lazarus Saturday");
    expect(lazarus.getUTCDay()).toBe(6);
  });
});

describe("Holy Week", () => {
  const week: Array<[number, string, number]> = [
    [-6, "Great and Holy Monday", 1],
    [-5, "Great and Holy Tuesday", 2],
    [-4, "Great and Holy Wednesday", 3],
    [-3, "Great and Holy Thursday", 4],
    [-2, "Great and Holy Friday", 5],
    [-1, "Great and Holy Saturday", 6],
  ];

  for (const [offset, label, weekday] of week) {
    it(`has ${label} at ${offset}`, () => {
      const d = fromPascha(2026, offset);
      expect(movableLabelOn(d)).toBe(label);
      expect(d.getUTCDay()).toBe(weekday);
      expect(readingsOn(d).length).toBeGreaterThan(0);
    });
  }

  it("leaves no gap between Palm Sunday and Pascha", () => {
    for (let offset = -7; offset <= 0; offset += 1) {
      expect(OFFSETS[String(offset)], `offset ${offset}`).toBeDefined();
    }
  });

  it("appoints the Vesperal Liturgy readings on Great and Holy Saturday", () => {
    const readings = readingsOn(fromPascha(2026, -1));
    expect(readings.map((r) => r.label)).toEqual([
      "Romans 6:3-11",
      "Matthew 28:1-20",
    ]);
  });
});

describe("Ascension", () => {
  it("falls on the Thursday forty days after Pascha, keyed +39", () => {
    const d = fromPascha(2026, 39);
    expect(movableLabelOn(d)).toBe("The Ascension of the Lord");
    expect(d.getUTCDay()).toBe(4);
    expect(readingsOn(d).map((r) => r.label)).toEqual([
      "Acts 1:1-12",
      "Luke 24:36-53",
    ]);
  });
});

describe("lectionary data shape", () => {
  it("stays inside the +/-90 day window readingsOn searches", () => {
    for (const key of Object.keys(OFFSETS)) {
      const offset = Number(key);
      expect(Number.isInteger(offset), `offset key ${key}`).toBe(true);
      expect(Math.abs(offset), `offset key ${key}`).toBeLessThanOrEqual(90);
    }
  });

  it("carries no em dashes in the labels a reader sees", () => {
    for (const [key, entry] of Object.entries(OFFSETS)) {
      const { label, readings } = entry as {
        label: string;
        readings: Array<{ label: string }>;
      };
      expect(label, `offset ${key}`).not.toMatch(/[—]/);
      for (const r of readings) expect(r.label, `offset ${key}`).not.toMatch(/[—]/);
    }
  });

  it("gives every entry at least one reading with a sane verse range", () => {
    for (const [key, entry] of Object.entries(OFFSETS)) {
      const { readings } = entry as {
        readings: Array<{ kind: string; chapter: number; from: number; to: number }>;
      };
      expect(readings.length, `offset ${key}`).toBeGreaterThan(0);
      for (const r of readings) {
        expect(["epistle", "gospel", "ot"], `offset ${key}`).toContain(r.kind);
        expect(r.chapter, `offset ${key}`).toBeGreaterThan(0);
        expect(r.to, `offset ${key}`).toBeGreaterThanOrEqual(r.from);
      }
    }
  });

  it("agrees with the Pascha arithmetic in every year it can be asked about", () => {
    // The offsets are year-independent by construction, so the only way this
    // breaks is if a key drifts off its weekday. Check the whole paschalion
    // range the Pascha tests cover.
    for (let year = 2024; year <= 2030; year += 1) {
      expect(movableLabelOn(fromPascha(year, -7))).toBe(
        "Palm Sunday, the Entry of the Lord into Jerusalem",
      );
      expect(movableLabelOn(fromPascha(year, -42))).toBe(
        "Sunday of Orthodoxy (1st of Great Lent)",
      );
      expect(movableLabelOn(fromPascha(year, 39))).toBe("The Ascension of the Lord");
    }
  });
});
