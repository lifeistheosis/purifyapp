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

/** The record, with its line ends as the repository keeps them. */
const RECORD = fs.readFileSync(path.join(process.cwd(), "docs/licensing/SECTION_MEDIA.md"), "utf8").replace(/\r\n/g, "\n");

/** A JPEG's pixel size, read from its frame header. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0 to SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

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

      it("holds the size it records, when it records one", () => {
        // A portrait holds its place before it loads by these numbers, so a
        // new cut that keeps the old ones lays the page out wrong.
        if (media.width === undefined && media.height === undefined) return;
        const onDisk = path.join(process.cwd(), "public", media.src.replace(/^\//, ""));
        expect(jpegSize(fs.readFileSync(onDisk)), media.src).toEqual({ width: media.width, height: media.height });
      });

      it("is recorded in docs/licensing/SECTION_MEDIA.md, with the page its licence was read on", () => {
        const file = media.src.replace("/sections/", "");
        const row = RECORD.split("\n").find((line) => line.startsWith(`| \`${file}\` |`));
        expect(row, `no row for ${file} in SECTION_MEDIA.md`).toBeDefined();
        expect(row).toContain(media.evidenceUrl);
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
    // Files a screen outside this registry draws, so they stay when the
    // registry moves on. prayers.v2.jpg was kept for the onboarding stand-in
    // until that moved to prayers.v3.jpg (1.8), and then left the disk.
    // prayers.v3.jpg was kept the same way for a night, while the verse
    // picture's Christ look (lib/share/verseCard.ts) still named it, and left
    // the disk when that moved to v4. None today.
    const keptForOthers: string[] = [];
    const referenced = new Set([
      ...Object.values(SECTION_MEDIA).map((m) => m.src.replace("/sections/", "")),
      ...keptForOthers,
    ]);
    const orphans = onDisk.filter((f) => !referenced.has(f));
    expect(orphans, `orphaned section images: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("the Prayers Pantocrator", () => {
  // The owner's pick of 2026-10-28 (B, Homebase/boards/purify-master/r18/
  // choose/2-pantocrator.png): v3's framing, cut from the larger photograph
  // of the icon on Commons, up to 1290 wide.
  const media = SECTION_MEDIA.prayers;

  it("is the larger photograph, at v3's framing and no wider than 1290", () => {
    expect(media?.src).toBe("/sections/prayers.v4.jpg");
    expect(media?.source).toBe("File:Spas vsederzhitel sinay.jpg");
    expect(media?.evidenceUrl).toBe("https://commons.wikimedia.org/wiki/File%3ASpas_vsederzhitel_sinay.jpg");
    expect(media?.license).toBe("Public domain");
    expect({ width: media?.width, height: media?.height }).toEqual({ width: 1290, height: 1359 });
    // v3 was 619 by 652: the same shape, so every place it is drawn crops it the same.
    expect(Math.abs(1290 / 1359 - 619 / 652)).toBeLessThan(0.001);
  });

  it("is what the onboarding's stand-in wears too", () => {
    const pictures = fs.readFileSync(path.join(process.cwd(), "lib/onboarding/pictures.ts"), "utf8");
    expect(pictures).toContain('src: "/sections/prayers.v4.jpg"');
    expect(pictures).not.toContain("prayers.v3.jpg");
  });

  it("records where it came from, its licence as read, and how it was cut", () => {
    const at = RECORD.indexOf("`prayers.v4.jpg` replaced v3");
    expect(at).toBeGreaterThan(0);
    // One paragraph, read as one line.
    const record = RECORD.slice(at, RECORD.indexOf("\n\n", at)).replace(/\s+/g, " ");
    expect(record).toContain("`File:Spas vsederzhitel sinay.jpg`, 2023 by 3774");
    expect(record).toContain("`{{PD-Art|PD-old-100-expired}}`");
    expect(record).toContain("1554 by 1637 from 228px in and 229px down");
    expect(record).toContain("1290 by 1359, nothing enlarged");
    // No longer listed among the candidates turned down.
    const rejected = RECORD.slice(RECORD.indexOf("## Rejected"), RECORD.indexOf("## Today has no entry"));
    expect(rejected).not.toContain("Spas vsederzhitel sinay");
  });
});
