// The pictures at the top of a saint's page (1.7, lib/saints/heroes.ts).
//
// What this holds, because nothing else does:
//  - every row names a saint in the registry, and a file that is on the
//    website, and every file in the folder is a row's;
//  - every picture is public domain, says where that was read, and was
//    opened and looked at (the day in inspectedOn);
//  - every file is a real JPEG of the size its row says, four wide by five
//    tall, at least 900 pixels wide, and small. 900 is the floor at which no
//    phone enlarges it by as much as a third: a 390-point phone at three
//    times its density draws the full width at 1,170 pixels. A bundled icon,
//    about 300 wide, would be enlarged nearly four times;
//  - the folder is one the apps never carry, asked of the website by the
//    same address the read-aloud covers use (lib/media/streamed.ts).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isStreamedMedia, streamedUrl } from "@/lib/media/streamed";
import { SAINT_HEROES, heroSrc, saintHero } from "@/lib/saints/heroes";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "covers", "saints");
const rows = Object.entries(SAINT_HEROES);

/** A JPEG's pixel size, read from its frame header. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

describe("the saints' hero pictures", () => {
  it("are a real set, each for a saint Purify has", () => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
    const slugs = new Set(SAINTS.map((s) => s.slug));
    for (const [slug] of rows) expect(slugs.has(slug), slug).toBe(true);
  });

  it("hold every file in the folder, and nothing else is in it", () => {
    // Each picture also has its AVIF beside it (1.7.2, scripts/covers-avif.mjs), and nothing else is there.
    const onDisk = fs.readdirSync(DIR).map((f) => `/covers/saints/${f}`);
    const files = rows.map(([, h]) => h.file);
    expect(onDisk.filter((f) => !f.endsWith(".avif")).sort()).toEqual([...files].sort());
    expect(onDisk.filter((f) => f.endsWith(".avif")).sort()).toEqual(files.map((f) => f.replace(/\.jpg$/, ".avif")).sort());
  });

  for (const [slug, h] of rows) {
    describe(slug, () => {
      it("is public domain, read on its Commons page, and was opened", () => {
        expect(h.license).toMatch(/^(public domain|pd-art|cc0)$/i);
        expect(h.source.startsWith("File:"), `${slug}.source`).toBe(true);
        expect(h.evidenceUrl.startsWith("https://commons.wikimedia.org/wiki/File:"), `${slug}.evidenceUrl`).toBe(true);
        for (const field of ["work", "artist", "workDate"] as const) expect(h[field].trim(), `${slug}.${field}`).not.toBe("");
        expect(h.inspectedOn).toMatch(/^2\d{3}-\d{2}-\d{2}$/);
      });

      it("says what the picture shows", () => {
        expect(h.alt.length, `${slug}.alt`).toBeGreaterThan(40);
        expect(h.alt).not.toMatch(/^icon of /i);
        // No em dash in anything read to a reader (the standing rule).
        expect(h.alt.includes(String.fromCharCode(0x2014))).toBe(false);
      });

      it("is a sharp JPEG of the size its row says, four by five, small, named with its version", () => {
        expect(h.file).toMatch(new RegExp(`^/covers/saints/${slug}\\.v\\d+\\.jpg$`));
        const buf = fs.readFileSync(path.join(ROOT, "public", h.file));
        const size = jpegSize(buf);
        expect(size, `${h.file} size`).toEqual({ width: h.width, height: h.height });
        expect(h.width).toBeGreaterThanOrEqual(900);
        expect(Math.abs(h.height / h.width - 1.25)).toBeLessThan(0.01);
        expect(buf.length / 1024, `${h.file} KB`).toBeLessThan(400);
      });
    });
  }
});

describe("where a hero picture is", () => {
  it("is never inside the apps: the folder is a streamed one", () => {
    for (const [, h] of rows) expect(isStreamedMedia(h.file), h.file).toBe(true);
    const build = fs.readFileSync(path.join(ROOT, "scripts", "native-build.mjs"), "utf8");
    expect(build).toContain('["public", "covers"],');
  });

  it("is asked of the website in the apps, by the address every streamed file has", () => {
    for (const [, h] of rows) {
      expect(heroSrc(h, true)).toBe(streamedUrl(h.file, true));
      expect(heroSrc(h, false)).toBe(streamedUrl(h.file, false));
      expect(heroSrc(h, false)).toBe(h.file);
    }
  });

  it("is looked up by the saint, and a saint without one keeps his icon", () => {
    expect(saintHero("john-chrysostom")?.file).toBe("/covers/saints/john-chrysostom.v1.jpg");
    expect(saintHero("arsenius-the-great")).toBeNull();
    expect(saintHero("no-such-saint")).toBeNull();
  });
});
