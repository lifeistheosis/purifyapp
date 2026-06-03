// Cross-link + citation gate for the Heresies archive (v8.5).
//
// Mirrors the discipline of the Topics patch: every cross-reference a heresy
// profile makes must resolve to something real, and every refutation
// citation must point at a section that actually exists in a hosted work.
// We read the saint/topic JSON directly (rather than via the server-only
// loaders) so this runs in the plain node test environment. heresies.ts
// imports TopicCitation as a type only, so importing HERESIES does not pull
// in any server-only module.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { HERESIES, getHeresy } from "@/lib/heresies/heresies";
import { COUNCILS } from "@/lib/councils/councils";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SAINTS_DIR = path.join(ROOT, "data", "saints");
const TOPICS_DIR = path.join(ROOT, "data", "topics");

const councilSlugs = new Set(COUNCILS.map((c) => c.slug));
const heresySlugs = new Set(HERESIES.map((h) => h.slug));

function loadWorkSections(
  saintSlug: string,
  workSlug: string,
): { n: number; paragraphs: string[] }[] | null {
  const file = path.join(SAINTS_DIR, saintSlug, `${workSlug}.json`);
  if (!fs.existsSync(file)) return null;
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json.sections ?? null;
}

function topicExists(slug: string): boolean {
  return fs.existsSync(path.join(TOPICS_DIR, `${slug}.json`));
}

describe("Heresies registry", () => {
  it("ships the seven conciliar heresies with unique slugs", () => {
    expect(HERESIES.length).toBe(7);
    expect(heresySlugs.size).toBe(HERESIES.length);
  });

  for (const h of HERESIES) {
    describe(h.name, () => {
      it("has the required editorial fields", () => {
        expect(h.slug).toBeTruthy();
        expect(h.name).toBeTruthy();
        expect(h.era).toBeTruthy();
        expect(h.heresiarch).toBeTruthy();
        expect(h.shortBio).toBeTruthy();
        expect(h.definition.length).toBeGreaterThan(40);
        expect(h.response.length).toBeGreaterThan(40);
      });

      it("is condemned by at least one real council", () => {
        expect(h.condemnedBy.length).toBeGreaterThan(0);
        for (const slug of h.condemnedBy) {
          expect(councilSlugs.has(slug), `council "${slug}"`).toBe(true);
        }
      });

      it("points relatedTopic at a real topic when set", () => {
        if (h.relatedTopic) {
          expect(topicExists(h.relatedTopic), `topic "${h.relatedTopic}"`).toBe(
            true,
          );
        }
      });

      it("points relatedHeresies at real heresies when set", () => {
        for (const slug of h.relatedHeresies ?? []) {
          expect(heresySlugs.has(slug), `heresy "${slug}"`).toBe(true);
        }
      });

      it("every refutation citation resolves to a real section", () => {
        for (const c of h.refutedBy) {
          expect(c.stance).toBe("refutes");
          const sections = loadWorkSections(c.saintSlug, c.workSlug);
          expect(
            sections,
            `work ${c.saintSlug}/${c.workSlug}`,
          ).not.toBeNull();
          const section = sections!.find((s) => s.n === c.sectionN);
          expect(
            section,
            `${c.saintSlug}/${c.workSlug} #s${c.sectionN}`,
          ).toBeTruthy();
          expect(section!.paragraphs.length).toBeGreaterThan(0);
          if (typeof c.paragraphIndex === "number") {
            expect(c.paragraphIndex).toBeLessThan(section!.paragraphs.length);
          }
        }
      });
    });
  }

  it("getHeresy resolves known slugs and rejects unknown", () => {
    expect(getHeresy("arianism")?.name).toBe("Arianism");
    expect(getHeresy("not-a-heresy")).toBeNull();
  });
});

describe("Council → heresy back-links", () => {
  it("every principalOpposed slug resolves to a shipped heresy", () => {
    for (const c of COUNCILS) {
      for (const o of c.principalOpposed ?? []) {
        if (o.slug) {
          expect(heresySlugs.has(o.slug), `${c.slug} → "${o.slug}"`).toBe(true);
        }
      }
    }
  });
});
