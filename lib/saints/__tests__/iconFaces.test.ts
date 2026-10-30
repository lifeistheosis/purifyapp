// Where the saint web cuts each icon for its circles (1.8, round 3, r3-06;
// lib/saints/iconFaces.ts). What a reader would notice if this broke: St John
// Chrysostom's circle on his own web showing his vestments and no face, as it
// did in build 80, or a new standing figure arriving with the same fault.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ICON_FACES, WEB_FACE_DEFAULT, iconFace } from "@/lib/saints/iconFaces";

const DIR = path.join(process.cwd(), "public/saints/icons");

/** A JPEG's width and height, from its first frame header. */
function jpegSize(file: string): { width: number; height: number } {
  const b = fs.readFileSync(file);
  let at = 2;
  while (at < b.length) {
    if (b[at] !== 0xff) {
      at += 1;
      continue;
    }
    const marker = b[at + 1];
    const length = b.readUInt16BE(at + 2);
    // Start of frame: every C0 to CF but the tables C4, C8 and CC.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(at + 5), width: b.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error(`${file}: no frame header`);
}

describe("where the web cuts an icon", () => {
  it("keeps a point for icons that are files the app carries, inside the picture", () => {
    for (const [file, point] of Object.entries(ICON_FACES)) {
      expect(fs.existsSync(path.join(DIR, file)), file).toBe(true);
      expect(point, file).toBeGreaterThanOrEqual(0);
      expect(point, file).toBeLessThanOrEqual(100);
    }
  });

  it("has a point for every standing figure, two and a half times as tall as it is wide or more", () => {
    const tall = fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".jpg"))
      .filter((f) => {
        const { width, height } = jpegSize(path.join(DIR, f));
        return height / width >= 2.5;
      });
    expect(tall.length).toBeGreaterThan(0);
    for (const file of tall) expect(ICON_FACES[file], `${file} has no face point`).toBeDefined();
  });

  it("shows St John Chrysostom's face: his circle starts within the icon's top tenth", () => {
    const { width, height } = jpegSize(path.join(DIR, "john-chrysostom.jpg"));
    const point = iconFace("/saints/icons/john-chrysostom.jpg");
    // object-position: the share of the overflow above the circle.
    const top = ((height - width) * point) / 100 / height;
    expect(top).toBeLessThan(0.1);
    // The old cut, 20%, started the circle below his face.
    expect(((height - width) * WEB_FACE_DEFAULT) / 100 / height).toBeGreaterThan(0.12);
  });

  it("keeps 20% for every other icon, and reads the file from any address", () => {
    expect(iconFace(undefined)).toBe(WEB_FACE_DEFAULT);
    expect(iconFace("/saints/icons/basil-the-great.jpg")).toBe(20);
    expect(iconFace("/saints/icons/john-chrysostom.jpg?v=2")).toBe(ICON_FACES["john-chrysostom.jpg"]);
    expect(iconFace("https://purifyapp.net/saints/icons/celestine-of-rome.jpg")).toBe(ICON_FACES["celestine-of-rome.jpg"]);
  });
});
