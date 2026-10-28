// The Hymns door (1.8, lib/saints/hymns.ts): the Church's hymns to a saint
// that the library already holds. The list and the library must agree both
// ways: a liturgical section a saint's work carries is on his Hymns door, and
// the door shows nothing that is not a liturgical section of one of his works.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { WritingContent } from "@/lib/saints/load";
import { HYMNS, hymnsOf } from "@/lib/saints/hymns";
import { SAINTS } from "@/lib/saints/saints";

const read = (saint: string, work: string): WritingContent | null => {
  const file = path.join(process.cwd(), "data", "saints", saint, `${work}.json`);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as WritingContent) : null;
};

describe("a saint's hymns", () => {
  it("are liturgical sections of his own works, each where the list says", () => {
    for (const [slug, refs] of Object.entries(HYMNS)) {
      const saint = SAINTS.find((s) => s.slug === slug);
      expect(saint, slug).toBeTruthy();
      expect(refs.length, slug).toBeGreaterThan(0);
      for (const ref of refs) {
        expect(saint!.works.some((w) => w.slug === ref.work), `${slug}/${ref.work}`).toBe(true);
        const section = read(slug, ref.work)?.sections.find((s) => s.n === ref.section);
        expect(section?.voice, `${slug}/${ref.work}#s${ref.section}`).toBe("liturgical");
        expect(section?.paragraphs.join("").trim().length ?? 0, `${slug}/${ref.work}#s${ref.section}`).toBeGreaterThan(20);
      }
    }
  });

  it("leave out none the library holds", () => {
    for (const saint of SAINTS) {
      for (const work of saint.works) {
        for (const section of read(saint.slug, work.slug)?.sections ?? []) {
          if (section.voice !== "liturgical") continue;
          expect(
            hymnsOf(saint.slug).some((h) => h.work === work.slug && h.section === section.n),
            `${saint.slug}/${work.slug}#s${section.n} is a hymn: add it to lib/saints/hymns.ts`,
          ).toBe(true);
        }
      }
    }
  });

  it("are none for a saint the list does not name", () => {
    expect(hymnsOf("john-chrysostom")).toEqual([]);
    expect(hymnsOf("nicholas-the-wonderworker")).toEqual([{ work: "stories-and-prayers", section: 2 }]);
  });
});
