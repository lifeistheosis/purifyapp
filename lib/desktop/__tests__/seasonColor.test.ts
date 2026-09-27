import { describe, expect, it } from "vitest";

import { orthodoxPascha } from "@/lib/calendar/orthodox";
import { liturgicalColorOn } from "@/lib/desktop/seasonColor";

const day = (s: string) => new Date(`${s}T12:00:00Z`);
const on = (s: string, style: "new" | "old" = "new") => liturgicalColorOn(day(s), style, orthodoxPascha);

// 2026: Pascha 12 April, so Clean Monday 23 February, Palm Sunday 5 April,
// Pentecost 31 May.
describe("the church season's color", () => {
  it("follows the Paschal cycle", () => {
    expect(orthodoxPascha(2026).toISOString().slice(0, 10)).toBe("2026-04-12");
    expect(on("2026-02-22")).toEqual({ color: "gold", reason: "ordinary" });
    expect(on("2026-02-23")).toEqual({ color: "purple", reason: "lent" });
    expect(on("2026-04-04")).toEqual({ color: "purple", reason: "lent" });
    expect(on("2026-04-05")).toEqual({ color: "green", reason: "palm" });
    expect(on("2026-04-06")).toEqual({ color: "crimson", reason: "holyWeek" });
    expect(on("2026-04-11")).toEqual({ color: "crimson", reason: "holyWeek" });
    expect(on("2026-04-12")).toEqual({ color: "gold", reason: "pascha" });
    expect(on("2026-05-20")).toEqual({ color: "gold", reason: "pascha" });
    expect(on("2026-05-31")).toEqual({ color: "green", reason: "pentecost" });
    expect(on("2026-06-01")).toEqual({ color: "green", reason: "pentecost" });
    expect(on("2026-06-02")).toEqual({ color: "gold", reason: "ordinary" });
  });

  it("keeps the fixed feasts, the Annunciation even in Lent", () => {
    expect(on("2026-03-25")).toEqual({ color: "blue", reason: "theotokos" });
    expect(on("2026-08-15")).toEqual({ color: "blue", reason: "theotokos" });
    expect(on("2026-09-14")).toEqual({ color: "crimson", reason: "cross" });
    expect(on("2026-08-06")).toEqual({ color: "white", reason: "transfiguration" });
    expect(on("2026-12-25")).toEqual({ color: "white", reason: "nativity" });
    expect(on("2027-01-06")).toEqual({ color: "white", reason: "nativity" });
    expect(on("2027-01-07")).toEqual({ color: "gold", reason: "ordinary" });
    // The day this was built: an ordinary day, gold.
    expect(on("2026-09-26")).toEqual({ color: "gold", reason: "ordinary" });
  });

  it("reads fixed feasts on the church date for the Old Calendar", () => {
    expect(on("2027-01-07", "old")).toEqual({ color: "white", reason: "nativity" });
    expect(on("2026-12-25", "old")).toEqual({ color: "gold", reason: "ordinary" });
    expect(on("2026-08-28", "old")).toEqual({ color: "blue", reason: "theotokos" });
    // Movable days are the same civil days on both calendars.
    expect(on("2026-04-12", "old")).toEqual({ color: "gold", reason: "pascha" });
  });
});
