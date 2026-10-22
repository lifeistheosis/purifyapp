import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { formsFor, KNOWN_FORMS, nameCore, nameTable, NOT_BY_NAME } from "../nameForms";
import { SAINT_NAME_FORMS } from "../nameIndex.generated";
import { segmentNames } from "../nameLinks";
import { SAINTS } from "../saints";

const join = (t: string) => segmentNames(t).map((p) => p.text).join("");
const links = (t: string, skip?: string) => segmentNames(t, skip).filter((p) => p.slug).map((p) => [p.text, p.slug]);

describe("the name table", () => {
  it("is the one scripts/saint-names.mjs writes from the registry now", () => {
    expect(SAINT_NAME_FORMS).toEqual(nameTable(SAINTS));
  });

  it("never holds a bare first name", () => {
    for (const [form] of SAINT_NAME_FORMS) expect(form, form).toMatch(/\s/);
  });

  it("names only saints the registry knows", () => {
    const slugs = new Set(SAINTS.map((s) => s.slug));
    for (const slug of [...Object.keys(KNOWN_FORMS), ...Object.keys(NOT_BY_NAME)]) expect(slugs.has(slug), slug).toBe(true);
  });

  it("takes the honorific off a registry name", () => {
    expect(nameCore("St. Leo the Great")).toBe("Leo the Great");
    expect(nameCore("Holy Apostle Paul")).toBe("Apostle Paul");
    expect(formsFor({ slug: "x", name: "St. Jerome" })).toEqual([]);
    expect(formsFor({ slug: "x", name: "St. Titus, Bishop of Crete" })).toEqual([]);
  });

  it("is written by the script the test names", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "lib/saints/nameIndex.generated.ts"), "utf8");
    expect(file).toContain("scripts/saint-names.mjs");
  });
});

describe("segmentNames", () => {
  it("gives back the text exactly", () => {
    const t = "When St. Basil the Great wrote to Gregory of Nyssa, his brother, Basil the Great was ill.";
    expect(join(t)).toBe(t);
    expect(join("")).toBe("");
    expect(segmentNames("No saint here.")).toEqual([{ text: "No saint here." }]);
  });

  it("takes in a St, St. or Saint before the name", () => {
    expect(links("as St Leo the Great wrote")).toEqual([["St Leo the Great", "leo-the-great"]]);
    expect(links("as St. Leo the Great wrote")).toEqual([["St. Leo the Great", "leo-the-great"]]);
    expect(links("as Saint Leo the Great wrote")).toEqual([["Saint Leo the Great", "leo-the-great"]]);
    expect(links("as Leo the Great wrote")).toEqual([["Leo the Great", "leo-the-great"]]);
  });

  it("links each saint once, at the first naming", () => {
    const parts = links("Cyril of Alexandria answered, and Cyril of Alexandria wrote again to Celestine of Rome.");
    expect(parts).toEqual([
      ["Cyril of Alexandria", "cyril-of-alexandria"],
      ["Celestine of Rome", "celestine-of-rome"],
    ]);
  });

  it("never links the saint whose page this is", () => {
    expect(links("Leo the Great and Celestine of Rome", "leo-the-great")).toEqual([["Celestine of Rome", "celestine-of-rome"]]);
  });

  it("never links a bare first name, nor a name inside a longer word", () => {
    expect(links("Basil said to Gregory that Leo was right.")).toEqual([]);
    expect(links("the Gregory of Nyssan school")).toEqual([]);
  });

  it("prefers the longest form", () => {
    expect(links("St Peter of Moscow")).toEqual([["St Peter of Moscow", "peter-of-moscow"]]);
    expect(links("St Peter and St Paul")).toEqual([
      ["St Peter", "apostle-peter"],
      ["St Paul", "apostle-paul"],
    ]);
  });

  it("links each saint once across the pieces of one paragraph", () => {
    const done = new Set<string>();
    expect(segmentNames("Cyril of Alexandria wrote", done).some((p) => p.slug)).toBe(true);
    expect(segmentNames(" and Cyril of Alexandria answered", done).some((p) => p.slug)).toBe(false);
    expect([...done]).toEqual(["cyril-of-alexandria"]);
  });

  it("leaves the emperor called Theodosius the Great alone", () => {
    expect(links("the emperor Theodosius the Great")).toEqual([]);
  });
});
