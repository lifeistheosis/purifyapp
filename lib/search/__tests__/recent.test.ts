// The search's recent rows (lib/search/recent.ts): the last five results a
// reader opened, newest first, kept on this device only.
//
// What a reader would notice if this broke: the same result listed twice,
// an old one never giving way, or a search that does not open at all because
// storage held something it did not expect.

import { describe, expect, it } from "vitest";

import { RECENT_MAX, clearRecent, parseRecent, readRecent, rememberRecent, withRecent } from "../recent";
import type { SearchItem } from "../types";

const item = (id: string, href = `/x/${id}`): SearchItem => ({ id, label: id.toUpperCase(), href, group: "Other" });

describe("the recent rows", () => {
  it("keep the newest first, once, and five at most", () => {
    let list = withRecent([], item("a"));
    list = withRecent(list, item("b"));
    list = withRecent(list, item("a"));
    expect(list.map((r) => r.id)).toEqual(["a", "b"]);
    for (const id of ["c", "d", "e", "f", "g"]) list = withRecent(list, item(id));
    expect(RECENT_MAX).toBe(5);
    expect(list.map((r) => r.id)).toEqual(["g", "f", "e", "d", "c"]);
  });

  it("keep one row for one address, whatever it was found as", () => {
    const list = withRecent(withRecent([], item("ref-john-3-16", "/bible/john/3#v16")), item("john-3", "/bible/john/3#v16"));
    expect(list.map((r) => r.id)).toEqual(["john-3"]);
  });

  it("keep only what a row needs", () => {
    const [kept] = withRecent([], { ...item("a"), keywords: "x y", labelKey: "nav.today" });
    expect(kept).toEqual({ id: "a", label: "A", href: "/x/a", group: "Other" });
  });

  it("read back only what was written, and nothing that leaves the app", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent(JSON.stringify({ id: "a" }))).toEqual([]);
    const good = { id: "a", label: "A", href: "/a", group: "Saints" };
    expect(parseRecent(JSON.stringify([good, 3, null, "x"]))).toEqual([good]);
    for (const href of ["https://example.com", "//example.com", "javascript:alert(1)", ""]) {
      expect(parseRecent(JSON.stringify([{ ...good, href }])), href).toEqual([]);
    }
    expect(parseRecent(JSON.stringify([{ ...good, group: "Nowhere" }]))).toEqual([]);
    expect(parseRecent(JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ ...good, id: `a${i}`, href: `/a${i}` }))))).toHaveLength(RECENT_MAX);
  });

  it("never throw where there is no storage at all", () => {
    // vitest runs in node: there is no window here, as in a page's first render.
    expect(readRecent()).toEqual([]);
    expect(() => clearRecent()).not.toThrow();
    expect(rememberRecent(item("a")).map((r) => r.id)).toEqual(["a"]);
  });
});
