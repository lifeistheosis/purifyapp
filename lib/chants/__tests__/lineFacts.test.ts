// A chant's line in a list (1.9): with a tradition chosen on the Chants home,
// the line names that tradition and its own recording's length, never the
// first version's. Fable Themes' finding of 2026-11-11: "Psalm 135, Arabic ·
// Psalm · 4:13" under Greek. The why is in ../lineFacts.ts.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { chantLineFacts } from "../lineFacts";
import type { ChantIndexRow, ChantIndexVariant, ChantTradition } from "../types";

function version(id: string, tradition: ChantTradition, durationSec: number, language = "en"): ChantIndexVariant {
  return { id, language, label: id, tradition, performer: null, audio: { src: `/audio/chants/psalm-135/${id}.mp3`, durationSec }, preview: { from: 0, to: 10 } } as ChantIndexVariant;
}

/** A psalm sung in Arabic first, then twice in Greek. */
const PSALM: ChantIndexRow = {
  slug: "psalm-135",
  key: "psalm-135",
  title: "Psalm 135",
  kind: "psalm",
  when: { anytime: true },
  addedOn: "2026-10-30",
  traditions: ["antiochian", "greek"],
  shortest: 200,
  variants: [version("ar", "antiochian", 253, "ar"), version("el-1", "greek", 310, "el"), version("el-2", "greek", 200, "el")],
} as ChantIndexRow;

describe("a chant's line in a list", () => {
  it("with no tradition chosen, names the first tradition and the shortest recording of all", () => {
    expect(chantLineFacts(PSALM)).toEqual({ tradition: "antiochian", seconds: 200 });
    expect(chantLineFacts(PSALM, null)).toEqual({ tradition: "antiochian", seconds: 200 });
  });

  it("with a tradition chosen, names that tradition and its own shortest recording", () => {
    expect(chantLineFacts(PSALM, "greek")).toEqual({ tradition: "greek", seconds: 200 });
    expect(chantLineFacts(PSALM, "antiochian")).toEqual({ tradition: "antiochian", seconds: 253 });
  });

  it("with a tradition the chant is not sung in, falls back to the first, as before", () => {
    expect(chantLineFacts(PSALM, "russian")).toEqual({ tradition: "antiochian", seconds: 200 });
  });

  it("is what the home's list by tradition shows", () => {
    const home = fs.readFileSync(path.join(process.cwd(), "components/chants/ChantsHome.tsx"), "utf8");
    expect(home).toContain("<ChantListItem row={r} tradition={tradition} />");
    const row = fs.readFileSync(path.join(process.cwd(), "components/chants/ChantRow.tsx"), "utf8");
    expect(row).toContain("const facts = chantLineFacts(row, tradition);");
    expect(row).toContain("{metaOf(row, t, tradition).join(\" · \")}");
  });
});
