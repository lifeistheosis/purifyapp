// A study read one part at a time (1.8, round 3 r3-13, C's "one part at a
// time" in the owner's hybrid of B and C): its parts are its own headings,
// and each Father's passages stand at the end of the part whose paragraph
// first names him, or where the editors set them. What a reader would notice
// if this broke: a part with nothing in it, a passage shown twice or never,
// or St. Basil's words read before the paragraph that brings him in.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { EssayBlock, TheologyBody } from "@/lib/theology/load";
import { nameForm, namesFather, placePassages, splitParts } from "@/lib/theology/parts";
import { studyPassages } from "@/lib/theology/passages";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";

const DATA = path.join(process.cwd(), "data", "theology");
const bodyOf = (slug: string) => JSON.parse(fs.readFileSync(path.join(DATA, `${slug}.json`), "utf8")) as TheologyBody;
const shown = (body: TheologyBody) => ({ ...body, florilegium: body.florilegium.filter((q) => q.cite?.kind !== "untraced") });

const para = (text: string): EssayBlock => ({ kind: "para", text });
const heading = (text: string): EssayBlock => ({ kind: "heading", text });

describe("a study's parts", () => {
  it("are its headings, what comes before the first opening part one", () => {
    const parts = splitParts([para("Lead."), heading("One"), para("a"), heading("Two"), para("b"), para("c")]);
    expect(parts.map((p) => p.heading)).toEqual(["One", "Two"]);
    expect(parts[0].blocks.map((b) => (b.kind === "para" ? b.text : ""))).toEqual(["Lead.", "a"]);
    expect(parts[1].blocks).toHaveLength(2);
  });

  it("are one part with no heading when the essay has none", () => {
    expect(splitParts([para("a"), para("b")])).toEqual([{ heading: "", blocks: [para("a"), para("b")] }]);
  });

  it("are every study's headings, none empty", () => {
    for (const t of THEOLOGY_TOPICS.filter((x) => !x.planned)) {
      const parts = splitParts(bodyOf(t.slug).essay);
      expect(parts.length, t.slug).toBeGreaterThanOrEqual(2);
      for (const p of parts) expect(p.blocks.length, `${t.slug}: ${p.heading}`).toBeGreaterThan(0);
    }
  });
});

describe("a Father, named", () => {
  it("is named whole, St. or St as the paragraph writes it", () => {
    expect(nameForm("St. Basil the Great")).toBe("St Basil the Great");
    expect(namesFather("St Basil the Great wrote Letters 234 and 235.", ["St. Basil the Great"])).toBe(true);
    // A part of his name is not his name, nor his name inside another word.
    expect(namesFather("St Athanasius had already put it.", ["St. Athanasius the Great"])).toBe(false);
    expect(namesFather("St Basil the Greatest", ["St Basil the Great"])).toBe(false);
    expect(namesFather("as St Gregory the Theologian says", ["St. Gregory the Theologian", "St Gregory Nazianzen"])).toBe(true);
  });
});

describe("where each passage stands", () => {
  it("is, in The Essence and the Energies, as the sheet counts it: 12 in their parts, 6 at the end", () => {
    const { placed, passages } = studyPassages(shown(bodyOf("essence-energies")));
    expect(placed.parts.map((p) => p.passages.length)).toEqual([0, 6, 3, 3, 0]);
    expect(placed.end).toHaveLength(6);
    // St. Basil's six in "What St Basil actually says", the part whose paragraph brings him in.
    expect(placed.parts[1].heading).toBe("What St Basil actually says");
    expect(new Set(placed.parts[1].passages.map((i) => passages[i].saintSlug))).toEqual(new Set(["basil-the-great"]));
    // At the end, the Fathers no paragraph names whole.
    expect(new Set(placed.end.map((i) => passages[i].saintSlug))).toEqual(
      new Set(["irenaeus-of-lyons", "cyril-of-jerusalem", "john-chrysostom", "athanasius-the-great"]),
    );
  });

  it("is where the editors set it, when they do: a part, or the end", () => {
    const essay = [heading("One"), para("St Basil the Great says."), heading("Two"), para("Nothing.")];
    const placed = placePassages(essay, [
      { names: ["St Basil the Great"] },
      { names: ["St Basil the Great"], placement: 2 },
      { names: ["St Basil the Great"], placement: "end" },
      { names: ["Nobody"], placement: 1 },
      { names: ["St Basil the Great"], placement: 9 },
    ]);
    expect(placed.parts.map((p) => p.passages)).toEqual([[0, 3, 4], [1]]);
    expect(placed.end).toEqual([2]);
  });

  it("puts every passage of every study in one place, once", () => {
    for (const t of THEOLOGY_TOPICS.filter((x) => !x.planned)) {
      const body = shown(bodyOf(t.slug));
      const { placed, passages } = studyPassages(body);
      const all = [...placed.parts.flatMap((p) => p.passages), ...placed.end].sort((a, b) => a - b);
      expect(all, t.slug).toEqual(passages.map((_, i) => i));
    }
  });
});
