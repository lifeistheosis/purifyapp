// The councils' own words against each error (1.8, lib/heresies/conciliar.ts):
// every line is in the hosted text it names, letter for letter, spacing aside.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { CONCILIAR_HERESIES, CONDEMNATIONS, OTHER_COUNCILS } from "@/lib/heresies/conciliar";
import { HERESIES } from "@/lib/heresies/heresies";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const flat = (v: unknown): string => (typeof v === "string" ? v : JSON.stringify(v));

function councilText(council: string, document: string, section: number): string | null {
  const file = path.join(ROOT, "data", "councils", council, `${document}.json`);
  if (!fs.existsSync(file)) return null;
  const doc = JSON.parse(fs.readFileSync(file, "utf8")) as { sections: { n: number; paragraphs: unknown[] }[] };
  const s = doc.sections.find((x) => x.n === section);
  return s ? squash(s.paragraphs.map(flat).join(" ")) : null;
}

function historyText(event: string): string | null {
  const file = path.join(ROOT, "data", "history", `${event}.json`);
  return fs.existsSync(file) ? squash(fs.readFileSync(file, "utf8").replace(/\\"/g, '"')) : null;
}

describe("the councils' own words against each error", () => {
  it("names at least one for every heresy in the archive", () => {
    for (const h of HERESIES) expect(CONDEMNATIONS[h.slug]?.length ?? 0, h.slug).toBeGreaterThan(0);
  });

  for (const [slug, list] of Object.entries(CONDEMNATIONS)) {
    it(`${slug}: every line is in its text`, () => {
      expect(HERESIES.some((h) => h.slug === slug), slug).toBe(true);
      for (const c of list) {
        if (c.kind === "council") {
          expect(COUNCILS.some((x) => x.slug === c.council), c.council).toBe(true);
          const text = councilText(c.council, c.document, c.section);
          expect(text, `${c.council}/${c.document} section ${c.section}`).not.toBeNull();
          expect(text!.includes(squash(c.words)), `${slug}: ${c.words}`).toBe(true);
        } else {
          const text = historyText(c.event);
          expect(text, c.event).not.toBeNull();
          expect(text!.includes(squash(c.words)), `${slug}: ${c.words}`).toBe(true);
          expect(text!.includes(c.source.split(",")[0]), c.source).toBe(true);
        }
      }
    });
  }

  it("names each council outside the Seven with the history page or the document that tells of it", () => {
    for (const list of Object.values(OTHER_COUNCILS)) {
      for (const c of list) {
        expect(Boolean(c.history) !== Boolean(c.href), c.name).toBe(true);
        if (c.history) expect(fs.existsSync(path.join(ROOT, "data", "history", `${c.history}.json`)), c.history).toBe(true);
        if (c.href) {
          const m = c.href.match(/^\/councils\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
          expect(m, c.href).not.toBeNull();
          expect(COUNCILS.find((x) => x.slug === m![1])?.documents.some((d) => d.slug === m![2] && !d.href), c.href).toBe(true);
        }
      }
    }
  });

  it("writes the added errors in our own words, with no em dash and no long quotation", () => {
    const dash = String.fromCharCode(0x2014);
    for (const h of CONCILIAR_HERESIES) {
      const text = [h.name, h.shortBio, h.definition, h.response, h.heresiarch, ...(h.alsoCalled ?? [])].join("\n");
      expect(text.includes(dash), h.slug).toBe(false);
      expect(/["“”]/.test(text), h.slug).toBe(false);
    }
  });
});
