import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SECTION_MEDIA, sectionMedia } from "@/lib/media/sections";

/**
 * The rights bar for section imagery, mirroring the history media integrity
 * suite. This exists because public/saints/icons/ has 110 files and no
 * provenance at all, two of which turned out to be watermarked contemporary
 * works (docs/licensing/icon-provenance.md). A registry without a test is a
 * registry that rots.
 */

// Identical to lib/history/__tests__/events.integrity.test.ts.
const ALLOWED = /^(public domain|pd-art|cc0|cc by(-sa)?( \d\.\d)?)$/i;

describe("section media registry", () => {
  const entries = Object.entries(SECTION_MEDIA);

  it("has at least one section image", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [key, media] of entries) {
    describe(key, () => {
      it("is rights-complete", () => {
        for (const field of [
          "alt",
          "work",
          "artist",
          "workDate",
          "source",
          "license",
          "evidenceUrl",
        ] as const) {
          expect(String(media[field] ?? "").trim(), `${key}.${field}`).not.toBe("");
        }
      });

      it("carries an allowed license", () => {
        expect(
          ALLOWED.test(media.license),
          `${key} license '${media.license}' not in the allowed set`,
        ).toBe(true);
      });

      it("records where the license was verified", () => {
        expect(media.evidenceUrl.startsWith("https://"), `${key}.evidenceUrl`).toBe(
          true,
        );
      });

      it("points at a real bundled image", () => {
        expect(media.src.startsWith("/sections/"), `${key}.src`).toBe(true);
        const onDisk = path.join(process.cwd(), "public", media.src.replace(/^\//, ""));
        expect(fs.existsSync(onDisk), `${key} file missing: ${media.src}`).toBe(true);
        // Guard against an HTML error page saved with a .jpg name, which is
        // what a rate-limited Commons fetch produces.
        const head = fs.readFileSync(onDisk).subarray(0, 8);
        const isJpeg = head[0] === 0xff && head[1] === 0xd8;
        const isPng = head[0] === 0x89 && head[1] === 0x50;
        expect(isJpeg || isPng, `${key} is not a real image`).toBe(true);
      });

      it("keeps the file small enough to bundle into the Android export", () => {
        const onDisk = path.join(process.cwd(), "public", media.src.replace(/^\//, ""));
        const kb = fs.statSync(onDisk).size / 1024;
        expect(kb, `${key} is ${kb.toFixed(0)} KB`).toBeLessThan(800);
      });

      it("describes the picture rather than the section", () => {
        // A lazy alt like "Bible" or "Discover" helps nobody using a screen
        // reader, and the alt text on the prayer slideshow was wrong for
        // three of four frames before 2026-07-25.
        expect(media.alt.length).toBeGreaterThan(24);
        expect(media.alt.toLowerCase()).not.toBe(key);
      });
    });
  }

  it("returns null for a section with no image rather than throwing", () => {
    expect(sectionMedia("bible")).not.toBeNull();
    // `today` is intentionally unregistered: it uses the day's saint icon.
    expect(sectionMedia("today")).toBeNull();
    // @ts-expect-error deliberately probing an unknown key at runtime
    expect(sectionMedia("nope")).toBeNull();
  });

  it("ships no orphan files in public/sections", () => {
    // An image bundled into the Android export but referenced by nothing is
    // dead weight in the APK, which already runs close to the size ceiling.
    const dir = path.join(process.cwd(), "public", "sections");
    if (!fs.existsSync(dir)) return;
    const onDisk = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f));
    const referenced = new Set(
      Object.values(SECTION_MEDIA).map((m) => m.src.replace("/sections/", "")),
    );
    const orphans = onDisk.filter((f) => !referenced.has(f));
    expect(orphans, `orphaned section images: ${orphans.join(", ")}`).toEqual([]);
  });
});
