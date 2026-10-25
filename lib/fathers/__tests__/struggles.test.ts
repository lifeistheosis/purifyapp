import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { entryFor } from "@/lib/reading/entries";

import { STRUGGLES, STRUGGLE_ROWS, strugglePassages } from "../struggles";

// The Fathers on everyday struggles (1.8): every passage is the Father's own
// words, character for character as the reading room holds them, from a work
// by a saint that is not a retelling, in a section in his own voice.

type Section = { n: number; voice?: string; paragraphs: string[] };

function paragraphOf(saint: string, work: string, section: number, paragraph: number): { text: string | undefined; voice: string | undefined } {
  const file = path.join("data", "saints", saint, `${work}.json`);
  const content = JSON.parse(fs.readFileSync(file, "utf8")) as { sections: Section[] };
  const sec = content.sections.find((s) => s.n === section);
  return { text: sec?.paragraphs[paragraph], voice: sec?.voice };
}

describe("the Fathers on everyday struggles", () => {
  it("gives each struggle five to eight passages", () => {
    for (const s of STRUGGLES) {
      expect(STRUGGLE_ROWS[s].length, s).toBeGreaterThanOrEqual(5);
      expect(STRUGGLE_ROWS[s].length, s).toBeLessThanOrEqual(8);
    }
  });

  it("holds every passage to its paragraph, word for word", () => {
    for (const s of STRUGGLES) {
      for (const r of STRUGGLE_ROWS[s]) {
        const where = `${s}: ${r.saint}/${r.work} §${r.section} ¶${r.paragraph}`;
        const { text, voice } = paragraphOf(r.saint, r.work, r.section, r.paragraph);
        expect(text, where).toBeDefined();
        expect(text!.includes(r.quote), where).toBe(true);
        expect([undefined, "saint"], where).toContain(voice);
        expect(r.quote.split(/\s+/).length, where).toBeLessThanOrEqual(90);
      }
    }
  });

  it("takes them only from works by a saint that are not retellings", () => {
    for (const s of STRUGGLES) {
      for (const r of STRUGGLE_ROWS[s]) {
        const entry = entryFor(`${r.saint}/${r.work}`);
        expect(entry, `${r.saint}/${r.work}`).not.toBeNull();
        expect(entry!.form, `${r.saint}/${r.work}`).not.toBe("retelling");
        expect(entry!.by, `${r.saint}/${r.work}`).toBeTruthy();
      }
    }
  });

  it("gives every passage a source line that opens it where it stands", () => {
    for (const s of STRUGGLES) {
      const passages = strugglePassages(s);
      expect(passages.length, s).toBe(STRUGGLE_ROWS[s].length);
      for (const p of passages) expect(p.shown.href, s).toMatch(/^\/saints\/[a-z0-9-]+\/[a-z0-9-]+#p-\d+-\d+$/);
    }
  });

  it("never sends one passage twice", () => {
    const seen = STRUGGLES.flatMap((s) => STRUGGLE_ROWS[s].map((r) => r.quote));
    expect(new Set(seen).size).toBe(seen.length);
  });
});
