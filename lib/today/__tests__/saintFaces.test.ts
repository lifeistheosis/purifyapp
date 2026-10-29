import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import rows from "@/data/calendar/profiled-saints.json";
import { COVER_ART } from "@/lib/reading/coverArt";
import type { SaintBrief } from "@/lib/saints/brief";
import { SITE_URL } from "@/lib/site";

import { ICON_FOCUS, SAINT_FACES, coverFile, saintPicture } from "../saintFaces";

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
