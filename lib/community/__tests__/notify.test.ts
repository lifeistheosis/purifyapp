// The excerpt an inbox row shows.
//
// Pure, so it is testable under the node-environment vitest the repo uses;
// the surrounding notifyOfReply talks to Supabase and is deliberately best
// effort rather than unit-tested here.

import { describe, expect, it } from "vitest";

import { trimExcerpt } from "@/lib/community/notify";

describe("trimExcerpt", () => {
  it("leaves a short reply exactly as written", () => {
    expect(trimExcerpt("Thank you, this helped.")).toBe("Thank you, this helped.");
  });

  it("collapses the whitespace a multi-line reply carries", () => {
    expect(trimExcerpt("Thank you.\n\n  This helped.")).toBe("Thank you. This helped.");
  });

  it("cuts a long reply and marks that it was cut", () => {
    const out = trimExcerpt("a".repeat(400));
    expect(out.length).toBeLessThanOrEqual(141);
    expect(out.endsWith("…")).toBe(true);
  });

  it("cuts on a word boundary rather than mid-word", () => {
    const body = ("lorem ipsum dolor sit amet ").repeat(20);
    const out = trimExcerpt(body);
    // The character before the ellipsis should not be a half-word: the cut
    // lands after a whole token.
    expect(out.endsWith("…")).toBe(true);
    expect(out.slice(0, -1).trimEnd()).toBe(out.slice(0, -1));
  });

  it("does not add an ellipsis to something exactly at the limit", () => {
    const exact = "b".repeat(140);
    expect(trimExcerpt(exact)).toBe(exact);
  });

  it("handles an empty body without throwing", () => {
    expect(trimExcerpt("   ")).toBe("");
  });
});
