// The pictures on the books' covers (lib/reading/coverArt.ts), held to their
// files and their rights.
//
// What a reader would notice if this broke: a broken picture on a cover, an
// icon nobody ever opened or sourced on the front of a book (covers multiply
// the reach of every icon), or a picture carried inside the apps that should
// have stayed on the website.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { streamedUrl } from "@/lib/media/streamed";
import { AUTHOR_COVERS, WORK_COVERS } from "@/lib/reading/authorCovers";
import { buildRoom } from "@/lib/reading/cards";
import { COVER_ART, coverSrc } from "@/lib/reading/coverArt";
import { AUTHOR_META, SUBJECTS } from "@/lib/reading/entries";
import { iconRightsFor, isUnverified } from "@/lib/saints/iconRights";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(ROOT, "public", "covers", "authors");
const PD = /^(public domain|cc0)$/i;
const EM_DASH = String.fromCharCode(0x2014);

describe("the covers' pictures", () => {
  it("are of saints the room knows", () => {
    for (const slug of Object.keys(COVER_ART)) expect(Boolean(AUTHOR_META[slug] || SUBJECTS[slug]), slug).toBe(true);
  });

  it("each have their file, and every file a row", () => {
    // A book with no saint to show carries its own (WORK_COVERS, 1.7.2).
    const streamed = [...Object.values(COVER_ART), ...Object.values(WORK_COVERS)].filter((a) => a.kind === "streamed");
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".jpg"));
    expect(streamed.map((a) => path.basename(a.file)).sort()).toEqual([...files].sort());
    for (const art of streamed) {
      expect(art.file, art.file).toMatch(/^\/covers\/authors\/[a-z-]+\.v\d+\.jpg$/);
      const bytes = fs.statSync(path.join(ROOT, "public", art.file)).size;
      expect(bytes, art.file).toBeLessThan(200 * 1024);
    }
  });

  it("are public domain as their pages state, with every rights field written", () => {
    for (const [slug, art] of [...Object.entries(COVER_ART), ...Object.entries(WORK_COVERS)]) {
      if (art.kind !== "streamed") continue;
      for (const field of ["alt", "work", "artist", "workDate", "source", "evidenceUrl", "inspectedOn"] as const) {
        expect(art[field]?.trim(), `${slug} ${field}`).toBeTruthy();
        expect(art[field].includes(EM_DASH), `${slug} ${field}`).toBe(false);
      }
      expect(art.license, slug).toMatch(PD);
      expect(art.source, slug).toMatch(/^File:/);
      expect(art.evidenceUrl, slug).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(art.width / art.height, slug).toBeCloseTo(0.8, 2);
      expect(art.width, slug).toBeGreaterThanOrEqual(480);
    }
    // The Commons rows are one source among the covers, under the same rules.
    for (const slug of Object.keys(AUTHOR_COVERS)) expect(COVER_ART[slug], slug).toBe(AUTHOR_COVERS[slug]);
  });

  it("from the app's own icons, are only those whose rights are settled", () => {
    for (const [slug, art] of Object.entries(COVER_ART)) {
      if (art.kind !== "bundled") continue;
      expect(iconRightsFor(art.file), `${slug}: ${art.file} has no settled rights`).not.toBeNull();
      expect(isUnverified(art.file), slug).toBe(false);
      expect(fs.existsSync(path.join(ROOT, "public", art.file)), art.file).toBe(true);
    }
  });

  it("show the face in the cover's window", () => {
    for (const [slug, art] of Object.entries(COVER_ART)) {
      expect(art.focusY, slug).toBeGreaterThanOrEqual(0);
      expect(art.focusY, slug).toBeLessThanOrEqual(100);
    }
  });

  it("are asked of the website in the apps, as every streamed file is", () => {
    for (const art of Object.values(COVER_ART)) {
      expect(coverSrc(art, false)).toBe(art.file);
      expect(coverSrc(art, true)).toBe(art.kind === "streamed" ? streamedUrl(art.file, true) : art.file);
    }
  });

  it("give an anonymous book its own picture, and only a book the room carries", () => {
    const cards = new Map(buildRoom(false).cards.map((c) => [c.key, c]));
    for (const [key, art] of Object.entries(WORK_COVERS)) {
      expect(cards.get(key as never)?.cover?.src, key).toBe(art.file);
    }
  });

  it("are the only pictures on a cover: no unopened icon reaches one", () => {
    const allowed = new Set([...Object.values(COVER_ART), ...Object.values(WORK_COVERS)].map((a) => a.file));
    for (const card of buildRoom(false).cards) {
      if (card.cover) expect(allowed.has(card.cover.src), `${card.key}: ${card.cover.src}`).toBe(true);
    }
  });
});
