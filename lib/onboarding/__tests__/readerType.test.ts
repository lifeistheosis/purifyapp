import { describe, expect, it } from "vitest";

import { READER_TYPES, readerTypeOf } from "../readerType";

// The one answer every transitionary screen reads (the owner's word of
// 2026-10-28): what the reader said of their practice first, then where they
// come from, and Purify as it always was when neither is known.

describe("the reader's type", () => {
  it("follows the level the reader gave", () => {
    expect(readerTypeOf("practicing", null)).toBe("orthodox");
    expect(readerTypeOf("learning", null)).toBe("learning");
    expect(readerTypeOf("inquirer", null)).toBe("new");
  });

  it("puts the level before the background", () => {
    expect(readerTypeOf("inquirer", "orthodox")).toBe("new");
    expect(readerTypeOf("practicing", "protestant")).toBe("orthodox");
    expect(readerTypeOf("learning", "catholic")).toBe("learning");
  });

  it("reads the background when no level is kept", () => {
    expect(readerTypeOf(null, "orthodox")).toBe("orthodox");
    for (const b of ["catholic", "protestant", "other-faith", "none"] as const) expect(readerTypeOf(null, b), b).toBe("new");
  });

  it("shows Purify as it always was when nothing is known, or the reader would rather not say", () => {
    expect(readerTypeOf(null, null)).toBe("orthodox");
    expect(readerTypeOf(null, "prefer-not")).toBe("orthodox");
  });

  it("has three types, each reachable", () => {
    const seen = new Set([readerTypeOf("practicing", null), readerTypeOf("learning", null), readerTypeOf("inquirer", null)]);
    expect([...seen].sort()).toEqual([...READER_TYPES].sort());
  });
});
