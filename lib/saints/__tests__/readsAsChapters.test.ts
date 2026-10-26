// What a reader would notice if this broke: the Confessions drawing all
// thirteen books at once again, "super laggy" on a phone (the owner,
// 2026-10-26), or a short work turned into a list to open.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readsAsChapters } from "../readsAsChapters";

const sections = (key: string) =>
  (JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "saints", `${key}.json`), "utf8")) as {
    sections: { paragraphs: string[] }[];
  }).sections;

describe("a work read as a list of its chapters", () => {
  it("is a long work in a few big sections", () => {
    expect(readsAsChapters(sections("augustine-of-hippo/confessions"))).toBe(true);
    expect(readsAsChapters(sections("athanasius-the-great/four-discourses-against-the-arians"))).toBe(true);
  });

  it("is still any work of twenty sections or more", () => {
    expect(readsAsChapters(sections("john-chrysostom/homilies-on-matthew"))).toBe(true);
  });

  it("is not a short work, nor a work in one section", () => {
    expect(readsAsChapters(sections("leo-the-great/sermons-on-the-nativity"))).toBe(false);
    expect(readsAsChapters(sections("gregory-theologian/oration-on-the-nativity"))).toBe(false);
    expect(readsAsChapters(sections("athanasius-the-great/on-the-incarnation"))).toBe(false);
  });
});
