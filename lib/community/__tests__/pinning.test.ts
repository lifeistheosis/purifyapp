import { describe, expect, it } from "vitest";

import { MAX_PINNED, pinnedPosts, sortPinnedFirst } from "../pinning";

type P = { id: string; pinned_at?: string | null; created_at: string };

const post = (id: string, created_at: string, pinned_at: string | null = null): P => ({
  id,
  created_at,
  pinned_at,
});

describe("sortPinnedFirst", () => {
  it("puts an announcement above a newer ordinary post", () => {
    // The whole point. An old post that has been pinned outranks everything
    // written since, which is the opposite of what created_at alone gives.
    const out = sortPinnedFirst([
      post("new", "2026-09-01T10:00:00Z"),
      post("old-pinned", "2026-06-01T10:00:00Z", "2026-08-30T10:00:00Z"),
    ]);
    expect(out.map((p) => p.id)).toEqual(["old-pinned", "new"]);
  });

  it("orders several announcements by when they were pinned, newest first", () => {
    const out = sortPinnedFirst([
      post("a", "2026-01-01T00:00:00Z", "2026-08-01T00:00:00Z"),
      post("b", "2026-01-01T00:00:00Z", "2026-08-03T00:00:00Z"),
      post("c", "2026-01-01T00:00:00Z", "2026-08-02T00:00:00Z"),
    ]);
    expect(out.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("orders unpinned posts newest first", () => {
    const out = sortPinnedFirst([
      post("older", "2026-08-01T00:00:00Z"),
      post("newer", "2026-08-09T00:00:00Z"),
    ]);
    expect(out.map((p) => p.id)).toEqual(["newer", "older"]);
  });

  it("treats a missing pinned_at exactly like an explicit null", () => {
    // A cached feed served from before the column existed carries neither.
    const out = sortPinnedFirst([
      { id: "absent", created_at: "2026-08-01T00:00:00Z" },
      post("pinned", "2026-01-01T00:00:00Z", "2026-08-02T00:00:00Z"),
    ]);
    expect(out[0].id).toBe("pinned");
  });

  it("breaks a pinned tie on created_at so the order cannot flicker", () => {
    // Two pins written by one operation share a timestamp. Without a tiebreak
    // their relative order is whatever the sort happened to do, which can
    // differ between renders and make the top of the feed jump.
    const same = "2026-08-05T00:00:00Z";
    const input = [
      post("older", "2026-01-01T00:00:00Z", same),
      post("newer", "2026-02-01T00:00:00Z", same),
    ];
    expect(sortPinnedFirst(input).map((p) => p.id)).toEqual(["newer", "older"]);
    // And it is stable: sorting the result again changes nothing.
    expect(sortPinnedFirst(sortPinnedFirst(input)).map((p) => p.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("does not mutate the caller's array", () => {
    // The feed array is React state. Sorting it in place is a mutation React
    // cannot see, so the list would reorder without re-rendering.
    const input = [
      post("a", "2026-08-01T00:00:00Z"),
      post("b", "2026-08-09T00:00:00Z"),
    ];
    const before = input.map((p) => p.id);
    sortPinnedFirst(input);
    expect(input.map((p) => p.id)).toEqual(before);
  });

  it("handles an empty feed", () => {
    expect(sortPinnedFirst([])).toEqual([]);
  });
});

describe("pinnedPosts", () => {
  it("returns only the announcements, in display order", () => {
    const out = pinnedPosts([
      post("plain", "2026-09-01T00:00:00Z"),
      post("first", "2026-01-01T00:00:00Z", "2026-08-01T00:00:00Z"),
      post("second", "2026-01-01T00:00:00Z", "2026-08-04T00:00:00Z"),
    ]);
    expect(out.map((p) => p.id)).toEqual(["second", "first"]);
  });

  it("is empty when nothing is pinned", () => {
    expect(pinnedPosts([post("a", "2026-08-01T00:00:00Z")])).toEqual([]);
  });
});

describe("MAX_PINNED", () => {
  it("leaves room for a feed underneath the announcements", () => {
    // A cap of zero would disable the feature and a large one would let the
    // first screen become entirely announcements, which is the failure the
    // constant exists to prevent.
    expect(MAX_PINNED).toBeGreaterThan(0);
    expect(MAX_PINNED).toBeLessThanOrEqual(5);
  });
});
