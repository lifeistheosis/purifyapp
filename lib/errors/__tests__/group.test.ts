// The admin's list of errors readers hit (A10): one line per fault.

import { describe, expect, it } from "vitest";

import { groupErrors, type ErrorRow } from "../group";

const row = (over: Partial<ErrorRow>): ErrorRow => ({
  at: "2026-11-09T10:00:00Z",
  source: "server",
  page: "/bible/john/1",
  message: "boom",
  route: "/(app)/bible/[book]/[chapter]/page",
  status: 500,
  app_version: null,
  platform: "web",
  ...over,
});

describe("groupErrors", () => {
  it("folds a server fault by its route, whatever page it was on", () => {
    const g = groupErrors([
      row({ page: "/bible/john/1", at: "2026-11-09T10:00:00Z" }),
      row({ page: "/bible/mark/2", at: "2026-11-09T11:00:00Z" }),
      row({ message: "other", at: "2026-11-09T09:00:00Z" }),
    ]);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ count: 2, page: "/bible/mark/2", firstAt: "2026-11-09T10:00:00Z", lastAt: "2026-11-09T11:00:00Z" });
  });

  it("folds a screen fault by its page and message, and counts devices and versions", () => {
    const g = groupErrors([
      row({ source: "screen", route: null, page: "/today", message: "x", platform: "android", app_version: "1.8" }),
      row({ source: "screen", route: null, page: "/today", message: "x", platform: "ios", app_version: "1.9" }),
      row({ source: "screen", route: null, page: "/today", message: "x", platform: "android", app_version: "1.9" }),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].platforms).toEqual({ android: 2, ios: 1 });
    expect(g[0].versions).toEqual(["1.9", "1.8"]);
  });

  it("puts the most frequent first, then the most recent, and stops at the limit", () => {
    const rows = [
      row({ message: "a", at: "2026-11-09T01:00:00Z" }),
      row({ message: "b", at: "2026-11-09T02:00:00Z" }),
      row({ message: "b", at: "2026-11-09T03:00:00Z" }),
      row({ message: "c", at: "2026-11-09T04:00:00Z" }),
    ];
    expect(groupErrors(rows).map((g) => g.message)).toEqual(["b", "c", "a"]);
    expect(groupErrors(rows, 2)).toHaveLength(2);
  });
});
