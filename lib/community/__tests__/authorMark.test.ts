import { describe, expect, it } from "vitest";

import { asAuthorMark, authorMarkLabelKey, deriveAuthorMark } from "../authorMark";

const NOW = Date.parse("2026-09-05T12:00:00Z");
const PAST = "2026-09-01T00:00:00Z";
const FUTURE = "2026-10-01T00:00:00Z";

describe("deriveAuthorMark", () => {
  it("is null when neither column is present (the pre-migration row)", () => {
    expect(deriveAuthorMark({}, NOW)).toBeNull();
    expect(deriveAuthorMark(null, NOW)).toBeNull();
    expect(deriveAuthorMark(undefined, NOW)).toBeNull();
  });

  it("is null when both columns are null (opted out, or never subscribed)", () => {
    expect(
      deriveAuthorMark({ author_plus_until: null, author_pro_until: null }, NOW),
    ).toBeNull();
  });

  it("is null once the period has ended, with nothing written", () => {
    // The whole reason the columns are timestamps: the lapse needs no job.
    expect(
      deriveAuthorMark({ author_plus_until: PAST, author_pro_until: null }, NOW),
    ).toBeNull();
    expect(
      deriveAuthorMark({ author_plus_until: PAST, author_pro_until: PAST }, NOW),
    ).toBeNull();
  });

  it("is plus while the Plus period runs", () => {
    expect(
      deriveAuthorMark({ author_plus_until: FUTURE, author_pro_until: null }, NOW),
    ).toBe("plus");
  });

  it("is pro while the Pro period runs, whatever Plus says", () => {
    expect(
      deriveAuthorMark({ author_plus_until: FUTURE, author_pro_until: FUTURE }, NOW),
    ).toBe("pro");
    expect(
      deriveAuthorMark({ author_plus_until: null, author_pro_until: FUTURE }, NOW),
    ).toBe("pro");
  });

  it("falls from pro to plus when only the Pro period has ended", () => {
    expect(
      deriveAuthorMark({ author_plus_until: FUTURE, author_pro_until: PAST }, NOW),
    ).toBe("plus");
  });

  it("lapses to the second", () => {
    const edge = "2026-09-05T12:00:00Z";
    expect(deriveAuthorMark({ author_plus_until: edge }, NOW)).toBeNull();
    expect(deriveAuthorMark({ author_plus_until: edge }, NOW - 1)).toBe("plus");
  });

  it("treats a malformed value as no mark rather than throwing", () => {
    expect(deriveAuthorMark({ author_plus_until: "not a date" }, NOW)).toBeNull();
    expect(deriveAuthorMark({ author_pro_until: 12345 }, NOW)).toBeNull();
    expect(deriveAuthorMark({ author_plus_until: "" }, NOW)).toBeNull();
  });
});

describe("authorMarkLabelKey", () => {
  it("names a key per tier and nothing for no mark", () => {
    expect(authorMarkLabelKey("plus")).toBe("community.supporterMark");
    expect(authorMarkLabelKey("pro")).toBe("community.patronMark");
    expect(authorMarkLabelKey(null)).toBeNull();
    expect(authorMarkLabelKey(undefined)).toBeNull();
  });
});

describe("asAuthorMark", () => {
  it("accepts the two tiers and nothing else", () => {
    expect(asAuthorMark("plus")).toBe("plus");
    expect(asAuthorMark("pro")).toBe("pro");
    expect(asAuthorMark(null)).toBeNull();
    expect(asAuthorMark("supporter")).toBeNull();
    expect(asAuthorMark(true)).toBeNull();
  });
});
