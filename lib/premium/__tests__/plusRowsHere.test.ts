import { describe, expect, it } from "vitest";

import { PLUS_ROWS, plusRowsLedBy, rowsHere } from "@/lib/premium/plusRows";

// The owner's Identity 3 (1.9): Discord status works only in the Windows app,
// so only the Windows app's paywall lists it. Every other row is everywhere.
describe("the Plus rows a device can use", () => {
  it("leaves Discord status out off the Windows app, and nothing else", () => {
    const here = rowsHere(PLUS_ROWS, { desktopApp: false });
    expect(here.map((r) => r.id)).not.toContain("discord-frames");
    expect(here).toHaveLength(PLUS_ROWS.length - 1);
  });

  it("keeps every row in the Windows app", () => {
    expect(rowsHere(PLUS_ROWS, { desktopApp: true })).toHaveLength(PLUS_ROWS.length);
  });

  it("keeps the row a reader came for first", () => {
    const here = rowsHere(plusRowsLedBy("ambience"), { desktopApp: false });
    expect(here[0].feature).toBe("ambience");
  });

  it("marks only Discord status as the Windows app's", () => {
    expect(PLUS_ROWS.filter((r) => r.only).map((r) => r.id)).toEqual(["discord-frames"]);
  });
});
