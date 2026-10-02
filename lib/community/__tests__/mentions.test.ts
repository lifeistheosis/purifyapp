import { describe, expect, it } from "vitest";

import { extractMentions, mentionAt, splitMentions } from "../mentions";

describe("splitMentions", () => {
  it("finds a mention and keeps the text around it", () => {
    expect(splitMentions("Thank you @maria.p for this.")).toEqual([
      { text: "Thank you " },
      { handle: "maria.p", text: "@maria.p" },
      { text: " for this." },
    ]);
  });

  it("leaves a sentence's last dot outside the handle", () => {
    const parts = splitMentions("Ask @ioannis.");
    expect(parts[1]).toEqual({ handle: "ioannis", text: "@ioannis" });
    expect(parts[2]).toEqual({ text: "." });
  });

  it("is not fooled by an email address or a short word", () => {
    expect(splitMentions("write to name@example.com").every((p) => !("handle" in p))).toBe(true);
    expect(splitMentions("@ab is too short").every((p) => !("handle" in p))).toBe(true);
  });

  it("lowercases what a reader typed", () => {
    expect(splitMentions("@Maria.P")[0]).toEqual({ handle: "maria.p", text: "@Maria.P" });
  });
});

describe("extractMentions", () => {
  it("dedupes across title and body and stops at five", () => {
    expect(extractMentions(["@aaa and @bbb", "@aaa again"])).toEqual(["aaa", "bbb"]);
    expect(extractMentions(["@aaa @bbb @ccc @ddd @eee @fff"])).toHaveLength(5);
  });
});

describe("mentionAt", () => {
  it("knows when the caret is inside a mention being typed", () => {
    expect(mentionAt("hello @ma", 9)).toEqual({ start: 6, query: "ma" });
    expect(mentionAt("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionAt("mail me@x", 9)).toBeNull();
    expect(mentionAt("hello @maria done", 17)).toBeNull();
  });
});
