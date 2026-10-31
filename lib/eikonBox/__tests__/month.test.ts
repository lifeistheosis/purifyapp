import { describe, expect, it } from "vitest";

import { deadlineFromInput, deadlineInputValue } from "../deadline";
import {
  claimCounts,
  claimLabelCsv,
  monthAfter,
  monthName,
  monthStep,
  monthSteps,
  oneMove,
  packedLines,
  pickMonths,
  supplierLink,
  takeUpLine,
  type MonthDrop,
} from "../month";

/**
 * The EIKON Box as a month (the owner's pick, A and C mixed). What would go
 * wrong if this broke: the claim deadline moving by the browser's time zone
 * on every save (the bug the sheets found), the wrong month taken as the one
 * in hand, a move offered that the route refuses, or a label file that
 * carries the boxes still to come from Temu.
 */

describe("the claim deadline", () => {
  it("round-trips through the field without moving, whatever the browser's zone", () => {
    const stored = "2026-11-10T23:59:00.000Z";
    const shown = deadlineInputValue(stored);
    expect(shown).toBe("2026-11-10T23:59");
    expect(deadlineFromInput(shown)).toBe(stored);
    // Saved again and again: the old code moved it by the offset each time.
    let v = stored;
    for (let i = 0; i < 5; i++) v = deadlineFromInput(deadlineInputValue(v)) as string;
    expect(v).toBe(stored);
  });

  it("reads the field as UTC, not as the browser's local time", () => {
    expect(deadlineFromInput("2026-11-10T23:59")).toBe("2026-11-10T23:59:00.000Z");
    expect(deadlineFromInput("2026-11-10T23:59:30")).toBe("2026-11-10T23:59:30.000Z");
  });

  it("refuses an empty, garbled or impossible date rather than inventing one", () => {
    expect(deadlineFromInput("")).toBeNull();
    expect(deadlineFromInput("tomorrow")).toBeNull();
    expect(deadlineFromInput("2026-11-31T10:00")).toBeNull();
    expect(deadlineInputValue(null)).toBe("");
    expect(deadlineInputValue("not a date")).toBe("");
  });
});

const drop = (over: Partial<MonthDrop>): MonthDrop => ({
  id: "d",
  title: "Prayer rope with cross and tassel",
  period_month: "2026-10-01",
  status: "fulfilling",
  created_at: "2026-09-24T12:00:00Z",
  claims_open_at: null,
  claims_close_at: "2026-10-10T23:59:00Z",
  sourcing_notes: "Temu https://www.temu.com/goods.html?id=1. Cost $7.20",
  ...over,
});

describe("the five steps", () => {
  it("names a gathering drop's steps with their days, and lights the one it is on", () => {
    const steps = monthSteps(drop({}));
    expect(steps.map((s) => s.step)).toEqual(["Draft", "Open", "Closed", "Gathering", "Shipped"]);
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "now", "todo"]);
    expect(steps.map((s) => s.note)).toEqual(["Sep 24", "Oct 1 to 10", "Oct 10", "now", null]);
  });

  it("draws a shipped drop done all the way, and a cancelled one lit nowhere", () => {
    expect(monthSteps(drop({ status: "shipped" })).every((s) => s.state === "done")).toBe(true);
    expect(monthSteps(drop({ status: "cancelled" })).every((s) => s.state === "todo")).toBe(true);
    expect(monthStep("fulfilling")).toBe("Gathering");
    expect(monthStep("cancelled")).toBeNull();
  });
});

describe("which month is in hand", () => {
  it("takes the live drop as the month and a later draft as the next", () => {
    const sep = drop({ id: "sep", period_month: "2026-09-01", status: "shipped" });
    const oct = drop({ id: "oct", period_month: "2026-10-01", status: "fulfilling" });
    const nov = drop({ id: "nov", period_month: "2026-11-01", status: "draft" });
    const out = pickMonths([sep, nov, oct]);
    expect(out.current?.id).toBe("oct");
    expect(out.next?.id).toBe("nov");
  });

  it("falls back to the earliest draft, then the latest shipped month", () => {
    const nov = drop({ id: "nov", period_month: "2026-11-01", status: "draft" });
    const dec = drop({ id: "dec", period_month: "2026-12-01", status: "draft" });
    expect(pickMonths([dec, nov]).current?.id).toBe("nov");
    expect(pickMonths([dec, nov]).next).toBeNull();
    const sep = drop({ id: "sep", period_month: "2026-09-01", status: "shipped" });
    expect(pickMonths([sep]).current?.id).toBe("sep");
    expect(pickMonths([]).current).toBeNull();
  });
});

describe("the one move now", () => {
  const counts = claimCounts([
    ...Array.from({ length: 5 }, () => ({ status: "claimed" as const })),
    ...Array.from({ length: 9 }, () => ({ status: "packed" as const })),
    { status: "packed" as const, lapsed: true },
    { status: "cancelled" as const },
  ]);
  const now = new Date("2026-10-30T12:00:00Z");

  it("counts the claims by where each box is, leaving the cancelled out", () => {
    expect(counts).toEqual({ waiting: 5, packed: 10, posted: 0, lapsed: 1, total: 15 });
  });

  it("while gathering: order what is still to come, file the labels, paste the trackings", () => {
    const m = oneMove(drop({}), counts, now);
    expect(m.line).toBe("15 claims. 10 are here and packed; 5 are still to come from Temu.");
    expect(m.primary).toEqual({ kind: "temu", url: "https://www.temu.com/goods.html?id=1", label: "Order 5 on Temu" });
    expect(m.also).toEqual(["mark-packed", "label-file", "trackings"]);
  });

  it("offers only the moves the route allows from each status", () => {
    const zero = claimCounts([]);
    expect(oneMove(drop({ status: "open" }), zero, now).primary).toEqual({ kind: "status", to: "closed", label: "Close claims" });
    expect(oneMove(drop({ status: "draft", claims_close_at: "2026-11-10T23:59:00Z" }), zero, now).primary).toEqual({
      kind: "status",
      to: "open",
      label: "Open claims",
    });
    // A draft whose deadline has passed cannot be opened (the route answers 409): set one first.
    expect(oneMove(drop({ status: "draft", claims_close_at: "2026-10-10T23:59:00Z" }), zero, now).primary?.kind).toBe("edit");
    expect(oneMove(drop({ status: "fulfilling" }), claimCounts([{ status: "shipped" }]), now).primary).toEqual({
      kind: "status",
      to: "shipped",
      label: "Mark the month shipped",
    });
    expect(oneMove(drop({ status: "shipped" }), zero, now).primary).toBeNull();
  });

  it("says where the take-up stands", () => {
    expect(takeUpLine(61, 14, 1)).toBe("Lapsed: Pro ended after claiming. Of 61 Pro members, 47 did not claim.");
    expect(takeUpLine(1, 3, 0)).toBe("Of 1 Pro member, 0 did not claim.");
  });
});

describe("the paperwork", () => {
  const address = {
    name: "U. Sample",
    address: { line1: "1 Example Road", line2: null, city: "Brookside", state: "ST", postal_code: "00000", country: "US" },
  };

  it("files labels for the packed boxes only", () => {
    const csv = claimLabelCsv([
      { id: "aaaaaaaa-0000-0000-0000-000000000000", email: "u@example.com", status: "packed", address },
      { id: "bbbbbbbb-0000-0000-0000-000000000000", email: "q@example.com", status: "claimed", address },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("BOX-AAAAAAAA,U. Sample,1 Example Road,,Brookside,ST,00000,US,u@example.com,");
    expect(packedLines([{ id: "a", status: "packed", address }])).toEqual([{ id: "a", who: "U. Sample", where: "Brookside, ST" }]);
  });

  it("finds the Temu link in the sourcing notes", () => {
    expect(supplierLink("Supplier: https://www.temu.com/x.html?y=1, $7.20")).toBe("https://www.temu.com/x.html?y=1");
    expect(supplierLink("no link yet")).toBeNull();
    expect(supplierLink(null)).toBeNull();
  });

  it("names the months for the shelf", () => {
    expect(monthName("2026-10-01")).toBe("October");
    expect(monthName("2026-10-01", true)).toBe("October 2026");
    expect(monthAfter("2026-11-01", new Date())).toBe("2026-12-01");
    expect(monthAfter("2026-12-01", new Date())).toBe("2027-01-01");
  });
});
