// The house's words inside a work carry no em dash (1.9; AGENTS.md and
// docs/editorial-standards.md). A work's own words keep the dashes their
// edition prints (lib/ui/__tests__/editionDashes.test.ts), and the reader
// tells checkMock so on every section that is not marked the editors' own
// (components/saints/WritingReader.tsx). That allowance is why no walk could
// see a dash the house wrote there: in a section's heading, its editor's
// note, its citation and its notes, and in the Lives the editors compiled
// themselves, whose sections are not marked editorial. The arbiter found four
// in St Ignatius's Life and fourteen in Photius's Bibliotheca on 2026-11-11
// (titles, framing and notes); St Olympias's Life held three more. A heading
// is ours even where an edition wrote it: the chapter headings of the
// Ante-Nicene Fathers are their editors' summaries, and on screen our
// navigation in our type, so St Justin's chapter X takes a colon where the
// edition prints a dash (the arbiter's word, 2026-11-11), recorded in
// data/reading/provenance.json.
//
// What would go wrong if this broke: an em dash of ours on a reader's screen,
// waved through by the allowance meant for the Fathers' editions.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SAINTS } from "@/lib/saints/saints";

const DIR = path.resolve(__dirname, "..", "..", "..", "data", "saints");
const EM_DASH = "—";

/** A Life the editors of Purify compiled: every paragraph is the house's own words. */
const COMPILED = /^Compiled by the editors of Purify\b/;

type Section = { n?: number; title?: string; framing?: string; citation?: string; notes?: unknown; voice?: string; voiceAuthor?: string; paragraphs?: unknown };
type Work = { title?: string; subtitle?: string; source?: string; sections?: Section[] };

function works(): { key: string; work: Work }[] {
  const out: { key: string; work: Work }[] = [];
  for (const saint of fs.readdirSync(DIR)) {
    const folder = path.join(DIR, saint);
    if (!fs.statSync(folder).isDirectory()) continue;
    for (const file of fs.readdirSync(folder)) {
      if (!file.endsWith(".json")) continue;
      const work = JSON.parse(fs.readFileSync(path.join(folder, file), "utf8")) as Work;
      if (work && Array.isArray(work.sections)) out.push({ key: `${saint}/${file.slice(0, -5)}`, work });
    }
  }
  return out;
}

/** Every string in a value, however deep (notes are a list, sometimes of lists). */
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

/** The house's words in a work that hold an em dash, each named by work and field. */
function houseDashes(): string[] {
  const found: string[] = [];
  for (const { key, work } of works()) {
    const compiled = COMPILED.test(work.source ?? "");
    for (const field of ["title", "subtitle", "source"] as const) {
      if ((work[field] ?? "").includes(EM_DASH)) found.push(`${key} ${field}`);
    }
    for (const sec of work.sections ?? []) {
      const at = `${key} section ${sec.n}`;
      if (sec.title?.includes(EM_DASH)) found.push(`${at} title`);
      for (const field of ["framing", "citation", "voiceAuthor", "notes"] as const) {
        if (strings(sec[field]).some((s) => s.includes(EM_DASH))) found.push(`${at} ${field}`);
      }
      if ((compiled || sec.voice === "editorial") && strings(sec.paragraphs).some((s) => s.includes(EM_DASH))) {
        found.push(`${at} paragraphs (${compiled ? "a Life the editors compiled" : "an editorial section"})`);
      }
    }
  }
  return found;
}

describe("the house's words in a work", () => {
  it("are read in every work on disk, at least as many as the registry names", () => {
    expect(works().length).toBeGreaterThanOrEqual(SAINTS.reduce((n, s) => n + s.works.length, 0));
  });

  it("carry no em dash: headings (an edition's too), editor's notes, citations, notes, and the Lives the editors compiled", () => {
    expect(houseDashes()).toEqual([]);
  });
});
