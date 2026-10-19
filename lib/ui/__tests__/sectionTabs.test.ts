// A page in parts (1.7, components/layout/SectionTabs.tsx): which part a #
// opens, the # a part writes, and the keys that move along the switch.

import { describe, expect, it } from "vitest";

import { hashFor, tabForKey, tabFromHash } from "@/lib/ui/sectionTabs";

const PARTS = ["life", "writings", "miracles"] as const;

describe("the part a # opens", () => {
  it("is the part it names, if the page has it", () => {
    expect(tabFromHash("#writings", PARTS)).toBe("writings");
    expect(tabFromHash("#miracles", PARTS)).toBe("miracles");
    expect(tabFromHash("#Writings", PARTS)).toBe("writings");
    expect(tabFromHash("writings", PARTS)).toBe("writings");
  });

  it("is the first part otherwise, whatever the # holds", () => {
    expect(tabFromHash("", PARTS)).toBe("life");
    expect(tabFromHash("#", PARTS)).toBe("life");
    expect(tabFromHash("#v11", PARTS)).toBe("life");
    // A saint without miracles, reached by an old address that had them.
    expect(tabFromHash("#miracles", ["life", "writings"] as const)).toBe("life");
    // Not valid percent-encoding: no part, and no throw.
    expect(tabFromHash("#%E0%A4%A", PARTS)).toBe("life");
  });
});

describe("the # a part writes", () => {
  it("is nothing for the first part, so the page's own address stays plain", () => {
    expect(hashFor("life", PARTS)).toBe("");
    expect(hashFor("writings", PARTS)).toBe("#writings");
    expect(hashFor("miracles", PARTS)).toBe("#miracles");
  });

  it("reads back as the part that wrote it", () => {
    for (const part of PARTS) expect(tabFromHash(hashFor(part, PARTS), PARTS)).toBe(part);
  });
});

describe("the keys on the switch", () => {
  it("move with the reading direction and wrap", () => {
    expect(tabForKey("ArrowRight", 0, 3, false)).toBe(1);
    expect(tabForKey("ArrowLeft", 0, 3, false)).toBe(2);
    expect(tabForKey("ArrowRight", 2, 3, false)).toBe(0);
    // Arabic and Urdu read from the right: the next part is to the left.
    expect(tabForKey("ArrowLeft", 0, 3, true)).toBe(1);
    expect(tabForKey("ArrowRight", 0, 3, true)).toBe(2);
  });

  it("go to the ends with Home and End, and leave every other key alone", () => {
    expect(tabForKey("Home", 2, 3, false)).toBe(0);
    expect(tabForKey("End", 0, 3, false)).toBe(2);
    expect(tabForKey("Enter", 1, 3, false)).toBeNull();
    expect(tabForKey("ArrowDown", 1, 3, false)).toBeNull();
    expect(tabForKey("ArrowRight", 0, 0, false)).toBeNull();
  });
});
