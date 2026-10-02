import { describe, expect, it } from "vitest";

import { relativeTime } from "../relativeTime";

describe("relativeTime", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");

  it("says how long ago, in the reader's language", () => {
    expect(relativeTime("2026-10-02T09:00:00Z", "en", now)).toBe("3 hours ago");
    expect(relativeTime("2026-10-01T12:00:00Z", "en", now)).toBe("yesterday");
    expect(relativeTime("2026-10-02T09:00:00Z", "es", now)).toBe("hace 3 horas");
  });

  it("calls a moment ago now, and a bad date nothing", () => {
    expect(relativeTime("2026-10-02T11:59:50Z", "en", now)).toBe("now");
    expect(relativeTime("not a date", "en", now)).toBe("");
  });
});
