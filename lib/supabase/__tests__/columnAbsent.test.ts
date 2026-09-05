import { describe, expect, it } from "vitest";

import { isColumnAbsent } from "../columnAbsent";

describe("isColumnAbsent", () => {
  it("recognises Postgres and PostgREST spellings of an unknown column", () => {
    expect(isColumnAbsent({ code: "42703", message: "" })).toBe(true);
    expect(isColumnAbsent({ code: "PGRST204", message: "" })).toBe(true);
    expect(
      isColumnAbsent({
        code: null,
        message: "column community_posts.author_plus_until does not exist",
      }),
    ).toBe(true);
  });

  it("does not mistake other failures for a missing column", () => {
    expect(isColumnAbsent(null)).toBe(false);
    expect(isColumnAbsent({ code: "42P01", message: "relation does not exist" })).toBe(false);
    expect(isColumnAbsent({ code: "PGRST205", message: "Could not find the table" })).toBe(false);
    expect(isColumnAbsent({ code: "57014", message: "canceling statement" })).toBe(false);
  });
});
