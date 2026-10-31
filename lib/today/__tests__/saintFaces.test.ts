import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import rows from "@/data/calendar/profiled-saints.json";
import { COVER_ART } from "@/lib/reading/coverArt";
import type { SaintBrief } from "@/lib/saints/brief";
import { ICON_RIGHTS, MISSING_ATTRIBUTION } from "@/lib/saints/iconRights";
import { SITE_URL } from "@/lib/site";
import { SAINT_WORDS_SLUGS } from "@/lib/today/saintWords";

import { COVER_FACES, ICON_FOCUS, SAINT_FACES, SHAREABLE_ICONS, coverFile, quoteFace, saintPicture } from "../saintFaces";

// The day's saint's face on Today (1.8, the owner's round 12: "St. John
// Chrysostom" himself): his cover portrait where there is one, else the icon
// the app carries, else no picture.

const BRIEFS = rows as SaintBrief[];
const brief = (slug: string) => BRIEFS.find((s) => s.slug === slug)!;

describe("the faces Today knows", () => {
  it("are the streamed cover portraits of the reading room, saint by saint", () => {
    const streamed = Object.fromEntries(
      Object.entries(COVER_ART)
        .filter(([, art]) => art.kind === "streamed")
        .map(([slug, art]) => [slug, art.focusY]),
    );
    expect(
      SAINT_FACES,
      "lib/today/saintFaces.ts is behind lib/reading/coverArt.ts: copy each streamed cover's slug and focusY",
    ).toEqual(streamed);
  });

  it("each live where the covers' registry says, on the website's side of the build", () => {
    for (const slug of Object.keys(SAINT_FACES)) {
      expect(COVER_ART[slug].file, slug).toBe(coverFile(slug));
      expect(fs.existsSync(path.join(process.cwd(), "public", coverFile(slug))), slug).toBe(true);
    }
  });
});

describe("the saint's band picture", () => {
  it("is his cover portrait, with his icon for when it cannot be had", () => {
    expect(saintPicture(brief("john-chrysostom"), false)).toEqual({
      kind: "cover",
      src: "/covers/authors/john-chrysostom.v1.jpg",
      avif: "/covers/authors/john-chrysostom.v1.avif",
      fallback: "/saints/icons/john-chrysostom.jpg",
      focusY: 20,
    });
  });

  it("is asked of the website in the apps, as the reading room's covers are", () => {
    const pic = saintPicture(brief("john-chrysostom"), true);
    expect(pic).toMatchObject({ kind: "cover", src: `${SITE_URL}/covers/authors/john-chrysostom.v1.jpg` });
    // The icon he falls back to is the app's own, there with no signal.
    expect(pic?.kind === "cover" ? pic.fallback : null).toBe("/saints/icons/john-chrysostom.jpg");
  });

  it("is his cover alone when the app carries no icon of him", () => {
    expect(saintPicture(brief("jerome-of-stridon"), false)).toMatchObject({ kind: "cover", fallback: null });
  });

  it("is his icon when he has no cover portrait", () => {
    const icon = BRIEFS.find((s) => s.iconUrl && !(s.slug in SAINT_FACES))!;
    expect(saintPicture(icon, false)).toEqual({ kind: "icon", src: icon.iconUrl, focusY: ICON_FOCUS });
  });

  it("is none for a saint with neither, and for no saint", () => {
    const bare = BRIEFS.find((s) => !s.iconUrl && !(s.slug in SAINT_FACES))!;
    expect(bare).toBeDefined();
    expect(saintPicture(bare, false)).toBeNull();
    expect(saintPicture(null, false)).toBeNull();
  });
});

// His face when his words are shared as a picture (1.8, round 3 r3-11): where
// the face is on each cover and which way he looks, so the Portrait stands
// him on the side he looks from and the Seal is cut round his face.
describe("his face on the picture of his words", () => {
  it("is placed on every cover Today knows, and on no other", () => {
    expect(Object.keys(COVER_FACES).sort()).toEqual(Object.keys(SAINT_FACES).sort());
    for (const [slug, [x, y, looks]] of Object.entries(COVER_FACES)) {
      expect(x, slug).toBeGreaterThan(0);
      expect(x, slug).toBeLessThan(1);
      expect(y, slug).toBeGreaterThan(0);
      expect(y, slug).toBeLessThan(0.6);
      expect(["left", "right", "ahead"], slug).toContain(looks);
    }
    // The sheet's own, kept; St Augustine looks up to the right, to the light.
    expect(COVER_FACES["john-chrysostom"]).toEqual([0.3, 0.25, "left"]);
    expect(COVER_FACES["augustine-of-hippo"][2]).toBe("right");
  });

  it("is his cover, asked of the website in the apps, where it is", () => {
    const chrysostom = brief("john-chrysostom");
    expect(quoteFace(chrysostom, false)).toEqual({ src: "/covers/authors/john-chrysostom.v1.jpg", point: [0.3, 0.25], looks: "left", fallback: null });
    expect(quoteFace(chrysostom, true)?.src).toBe(`${SITE_URL}/covers/authors/john-chrysostom.v1.jpg`);
  });

  it("falls back only to a carried icon whose rights are recorded, never one in the debt", () => {
    for (const file of SHAREABLE_ICONS) {
      expect(ICON_RIGHTS[file], file).toBeDefined();
      expect(MISSING_ATTRIBUTION, file).not.toContain(file);
    }
    // St John Chrysostom's carried icon is still in the debt: with no signal his picture has no face.
    expect(quoteFace(brief("john-chrysostom"), true)?.fallback).toBeNull();
    // St Cyprian has no cover; his icon's rights are recorded, so it is his face.
    expect(quoteFace(brief("cyprian-of-carthage"), true)).toEqual({ src: "/saints/icons/cyprian-of-carthage.jpg", point: [0.49, 0.32], looks: "ahead", fallback: null });
    // A saint with neither a cover nor a recorded icon has none.
    const none = BRIEFS.find((s) => !(s.slug in SAINT_FACES) && !(s.iconUrl && SHAREABLE_ICONS.has(s.iconUrl.replace("/saints/icons/", ""))))!;
    expect(quoteFace(none, false)).toBeNull();
    expect(quoteFace(null, false)).toBeNull();
  });

  it("is known for most of the saints whose words Today shows", () => {
    const faced = SAINT_WORDS_SLUGS.filter((slug) => quoteFace(brief(slug), false));
    expect(faced.length).toBeGreaterThanOrEqual(15);
  });
});
