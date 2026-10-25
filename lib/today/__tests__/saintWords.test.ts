import { describe, expect, it } from "vitest";

import { shownWork, workFile } from "@/lib/citations/shown";
import { SAINTS } from "@/lib/saints/saints";

import { SAINT_WORDS_SLUGS, saintWordsFor } from "../saintWords";

// Today's saint in their own words (1.8): every line is the saint's, word
// for word in the paragraph its source line opens, or a traced quotation of
// theirs; the card says "In his own words", so no saint here is a woman
// until it can say "her".

describe("Today's saint in their own words", () => {
  it("holds only saints the registry has, each a man until the card can say her", () => {
    for (const slug of SAINT_WORDS_SLUGS) {
      const saint = SAINTS.find((s) => s.slug === slug);
      expect(saint, slug).toBeDefined();
      expect(saint?.pronoun ?? "his", slug).toBe("his");
    }
  });

  it("shows each line where it stands, word for word", () => {
    for (const slug of SAINT_WORDS_SLUGS) {
      const w = saintWordsFor(slug)!;
      if (w.shown.kind !== "father") {
        // A traced quotation in a public-domain text the app does not carry: it is the saint's own quote line.
        const q = SAINTS.find((s) => s.slug === slug)!.quotes!.find((x) => x.text === w.text);
        expect(q, slug).toBeDefined();
        continue;
      }
      const m = w.shown.href.match(/^\/saints\/([^/]+)\/([^#]+)#p-(\d+)-(\d+)$/);
      expect(m, `${slug}: ${w.shown.href}`).not.toBeNull();
      const [, saint, work, section, paragraph] = m!;
      const para = workFile(saint, work)!.sections.find((s) => s.n === Number(section))!.paragraphs[Number(paragraph)];
      const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      expect(squash(para).includes(squash(w.text)), slug).toBe(true);
      expect(w.shown, slug).toEqual(shownWork({ saint, work, section: Number(section), paragraph: Number(paragraph) }));
    }
  });

  it("says nothing for a saint with no line", () => {
    expect(saintWordsFor("seraphim-of-sarov")).toBeNull();
    expect(saintWordsFor(null)).toBeNull();
  });
});
