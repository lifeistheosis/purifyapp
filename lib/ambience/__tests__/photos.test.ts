// Each ambience sound's photograph (build 95, note 22, his word: "I want each
// button to have a photo of the corresponding aesthetic of the sound ...
// ensure the photos are fitting"). A real photograph for each sound, of the
// Church's setting where it can be, public domain or CC0 first and a CC
// licence only with its credit, never made by AI; bundled beside the sound,
// small, at the size the tile draws; its own colour under it until it paints;
// recorded in docs/licensing/AMBIENCE_PICTURES.md, and any photographer who
// asks to be named, named on the credits page.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AMBIENCE_PHOTO_SIZE, AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { isCcLicence, photoCredits } from "@/lib/credits/photos";

/** A JPEG's size, read from its frame header. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < buf.length) {
    if (buf[at] !== 0xff) return null;
    const marker = buf[at + 1];
    const length = buf.readUInt16BE(at + 2);
    // SOF0 to SOF15, leaving out DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(at + 5), width: buf.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  return null;
}

const PUBLIC = ["Public domain", "CC0"];

describe("each ambience sound's photograph (build 95, note 22)", () => {
  it("is a JPEG beside its sound, made at the tile's size, small enough to ride in the apps", () => {
    let total = 0;
    for (const t of AMBIENCE_TRACKS) {
      expect(path.posix.dirname(t.photo.src), t.id).toBe(path.posix.dirname(t.src));
      const file = path.join("public", t.photo.src);
      expect(fs.existsSync(file), t.id).toBe(true);
      const buf = fs.readFileSync(file);
      expect(jpegSize(buf), t.id).toEqual(AMBIENCE_PHOTO_SIZE);
      expect(buf.length, t.id).toBeLessThan(40_000);
      total += buf.length;
    }
    // Six pictures, about a tenth of a megabyte of a bundle with an 85 MB ceiling (lib/build/exportSize.ts).
    expect(total).toBeLessThan(200_000);
  });

  it("is public domain or CC0, or a CC licence with the credit its page asks for, read on its Commons page", () => {
    for (const t of AMBIENCE_TRACKS) {
      const p = t.photo;
      expect(PUBLIC.includes(p.license) || isCcLicence(p.license), `${t.id}: ${p.license}`).toBe(true);
      if (isCcLicence(p.license)) expect(p.credit, t.id).toBeTruthy();
      else expect(p.credit, t.id).toBeUndefined();
      expect(p.source, t.id).toMatch(/^File:/);
      expect(p.evidenceUrl, t.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(decodeURIComponent(p.evidenceUrl.replace(/_/g, " ")), t.id).toContain(p.source.replace(/_/g, " "));
      expect(p.work.length, t.id).toBeGreaterThan(10);
      expect(p.artist.length, t.id).toBeGreaterThan(1);
    }
  });

  it("has a photograph of its own: six sounds, six pictures", () => {
    expect(new Set(AMBIENCE_TRACKS.map((t) => t.photo.src)).size).toBe(AMBIENCE_TRACKS.length);
    expect(new Set(AMBIENCE_TRACKS.map((t) => t.photo.source)).size).toBe(AMBIENCE_TRACKS.length);
  });

  it("the sea is Simonopetra on Athos, public domain, read at its source (his word, 2026-11-13 about 14:29 UTC)", () => {
    const sea = AMBIENCE_TRACKS.find((t) => t.id === "sea")!.photo;
    expect(sea.source).toBe("File:Simonopetra Monastery, Mount Athos.jpg");
    expect(sea.license).toBe("Public domain");
    expect(sea.credit).toBeUndefined();
    const doc = fs.readFileSync("docs/licensing/AMBIENCE_PICTURES.md", "utf8");
    // Where its licence was read: the photographer's own mark on Flickr, and Commons' record of it.
    expect(doc).toContain("https://www.flickr.com/photos/194609185@N08/53874839234/");
    expect(doc).toContain("https://creativecommons.org/publicdomain/mark/1.0/");
    expect(doc).toContain("`PD-author-FlickrPDM`");
    // The pebble beach from Unsplash, whose review on Commons was still to be done, is gone.
    expect(AMBIENCE_TRACKS.some((t) => /Unsplash/.test(t.photo.source))).toBe(false);
  });

  it("has its own colour to stand under it until it paints", () => {
    for (const t of AMBIENCE_TRACKS) expect(t.photo.ground, t.id).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("is recorded in docs/licensing/AMBIENCE_PICTURES.md, and any photographer who asks is named on the credits page", () => {
    const doc = fs.readFileSync("docs/licensing/AMBIENCE_PICTURES.md", "utf8");
    const credited = new Set(photoCredits().map((c) => c.file));
    for (const t of AMBIENCE_TRACKS) {
      expect(doc, t.id).toContain(`\`${path.posix.basename(t.photo.src)}\``);
      expect(doc, t.id).toContain(t.photo.evidenceUrl);
      expect(credited.has(t.photo.src), t.id).toBe(isCcLicence(t.photo.license));
    }
  });
});
