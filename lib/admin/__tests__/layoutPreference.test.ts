import { describe, expect, it } from "vitest";

import { LAYOUT_DEFAULT, parseLayout } from "../layoutPreference";

/** His own A and B in Settings (lib/admin/layoutPreference.ts). */
describe("parseLayout", () => {
  it("keeps A or B, and falls back to Money leads and Still counting", () => {
    expect(LAYOUT_DEFAULT).toEqual({ home: "b", today: "a" });
    expect(parseLayout("a", "home")).toBe("a");
    expect(parseLayout("b", "today")).toBe("b");
    expect(parseLayout("c", "home")).toBe("b");
    expect(parseLayout(null, "today")).toBe("a");
  });
});
