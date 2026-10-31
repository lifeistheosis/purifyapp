import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import rows from "@/data/calendar/profiled-saints.json";
import { COVER_ART } from "@/lib/reading/coverArt";
import type { SaintBrief } from "@/lib/saints/brief";
import { ICON_RIGHTS, MISSING_ATTRIBUTION } from "@/lib/saints/iconRights";
import { SITE_URL } from "@/lib/site";
import { SAINT_WORDS_SLUGS } from "@/lib/today/saintWords";
import { allSayings } from "@/lib/today/saying";

import {
  BAND_PORTRAIT,
  COVER_FACES,
  DESERT_FATHERS,
  ICON_FOCUS,
  SAINT_FACES,
  SAYING_FACES,
  SHAREABLE_ICONS,
  coverFile,
  placePortrait,
  quoteFace,
  saintPicture,
  sayingFace,
  standsOn,
} from "../saintFaces";

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

// The face beside the words on Today's bands (round 3 r3-21, the owner's pick
// A): which side he stands on, and where his portrait stands in the band.
describe("the speaker on a band", () => {
  it("stands on the side he looks from, so he looks into his words", () => {
    expect(standsOn("left")).toBe("right");
    expect(standsOn("right")).toBe("left");
    // One who faces us keeps the end, where the saint's face stood before: the right, or the left in Arabic and Urdu.
    expect(standsOn("ahead")).toBe("right");
    expect(standsOn("ahead", true)).toBe("left");
    // St John Chrysostom looks left, St Antony right, as the sheet drew them.
    expect(standsOn(COVER_FACES["john-chrysostom"][2])).toBe("right");
    expect(standsOn(COVER_FACES["anthony-the-great"][2])).toBe("left");
  });

  it("lands his face where the sheet set it: a third of the way down, 78% across on the right, 20% on the left", () => {
    const band = { width: 358, height: 216 };
    const [cx, cy] = COVER_FACES["john-chrysostom"];
    const p = placePortrait(band, [cx, cy], "right");
    // The sheet's own figures: 1.45 times the band, four wide by five tall.
    expect(p.height).toBeCloseTo(216 * BAND_PORTRAIT.zoom, 6);
    expect(p.width).toBeCloseTo(p.height * 0.8, 6);
    expect(p.left + cx * p.width).toBeCloseTo(0.78 * 358, 6);
    expect(p.top + cy * p.height).toBeCloseTo(0.33 * 216, 6);
    const [ax, ay] = COVER_FACES["anthony-the-great"];
    const q = placePortrait({ width: 358, height: 243 }, [ax, ay], "left");
    expect(q.left + ax * q.width).toBeCloseTo(0.2 * 358, 6);
    expect(q.top + ay * q.height).toBeCloseTo(0.33 * 243, 6);
  });

  it("covers the band from top to foot and reaches its edge on his side, his face never cut, on every cover", () => {
    for (const band of [
      { width: 358, height: 216 },
      { width: 358, height: 300 },
      { width: 358, height: 460 },
      { width: 310, height: 216 },
    ]) {
      for (const [slug, [x, y, looks]] of Object.entries(COVER_FACES)) {
        for (const side of [standsOn(looks), standsOn(looks, true)]) {
          const p = placePortrait(band, [x, y], side);
          const why = `${slug} ${side} ${band.width}x${band.height}`;
          expect(p.top, why).toBeLessThanOrEqual(0);
          expect(p.top + p.height, why).toBeGreaterThanOrEqual(band.height - 1e-9);
          if (side === "right") expect(p.left + p.width, why).toBeGreaterThanOrEqual(band.width - 1e-9);
          else expect(p.left, why).toBeLessThanOrEqual(0);
          // His face well inside the band.
          const fx = p.left + x * p.width;
          const fy = p.top + y * p.height;
          expect(fx, why).toBeGreaterThan(0.1 * band.width);
          expect(fx, why).toBeLessThan(0.9 * band.width);
          expect(fy, why).toBeGreaterThan(0.15 * band.height);
          expect(fy, why).toBeLessThan(0.6 * band.height);
        }
      }
    }
  });

  it("stops growing once it is as wide as the band, so a long saying does not make a giant of him", () => {
    const tall = placePortrait({ width: 358, height: 400 }, [0.5, 0.3], "right");
    expect(tall.width).toBeCloseTo(358, 6);
    expect(tall.height).toBeCloseTo(358 / 0.8, 6);
    // Taller still, it only covers the band.
    expect(placePortrait({ width: 358, height: 520 }, [0.5, 0.3], "right").height).toBe(520);
  });
});

// Who stands beside a saying of the Desert Fathers (r3-21 A): one small map,
// so a picture checked later is one entry.
describe("the Fathers beside their sayings", () => {
  const ANTONY = { src: "/covers/authors/anthony-the-great.v1.jpg", point: [0.48, 0.3], looks: "right", fallback: null };

  it("is St Antony's cover beside each of his sayings, the one Abba Isaac tells among them", () => {
    const his = allSayings().filter((s) => s.speaker === "anthony-the-great");
    expect(his.length).toBe(8);
    for (const s of his) expect(sayingFace(s, false), s.attribution).toEqual(ANTONY);
    expect(his.some((s) => s.attribution.includes("Abba Isaac"))).toBe(true);
    // Asked of the website in the apps, as the reading room's covers are.
    expect(sayingFace(his[0], true)?.src).toBe(`${SITE_URL}/covers/authors/anthony-the-great.v1.jpg`);
  });

  it("is no face at all for a Father without a checked icon: the lit cross for Abba Moses and Abba Isaac, never a stand-in", () => {
    const faceless = allSayings().filter((s) => !s.speaker);
    expect(new Set(faceless.map((s) => s.attribution))).toEqual(new Set(["Abba Moses", "Abba Isaac"]));
    for (const s of faceless) expect(sayingFace(s, false), s.attribution).toBeNull();
    // St Moses the Ethiopian's icon has no rights recorded, and isaac-the-syrian.jpg is another Isaac.
    const named = Object.values(SAYING_FACES).map((f) => ("icon" in f ? f.icon : f.cover));
    expect(named).not.toContain("moses-the-black.jpg");
    expect(named).not.toContain("isaac-the-syrian.jpg");
    expect(SAYING_FACES[DESERT_FATHERS]).toBeUndefined();
  });

  it("names only pictures that are checked: a cover of the reading room, or an icon whose rights are recorded", () => {
    for (const [who, face] of Object.entries(SAYING_FACES)) {
      if ("cover" in face) expect(face.cover in COVER_FACES && face.cover in SAINT_FACES, who).toBe(true);
      else expect(SHAREABLE_ICONS.has(face.icon), who).toBe(true);
    }
  });

  it("takes a Father's icon, or one for all the Fathers, as one entry, and refuses an icon whose rights are not recorded", () => {
    const moses = allSayings().find((s) => s.attribution === "Abba Moses")!;
    const isaac = allSayings().find((s) => s.attribution === "Abba Isaac")!;
    const recorded = "pimen-the-great.jpg";
    expect(SHAREABLE_ICONS.has(recorded)).toBe(true);
    const withMoses = { ...SAYING_FACES, "Abba Moses": { icon: recorded, point: [0.5, 0.3] as const, looks: "ahead" as const } };
    expect(sayingFace(moses, false, withMoses)).toEqual({ src: `/saints/icons/${recorded}`, point: [0.5, 0.3], looks: "ahead", fallback: null });
    expect(sayingFace(isaac, false, withMoses)).toBeNull();
    const forAll = { ...SAYING_FACES, [DESERT_FATHERS]: { icon: recorded, point: [0.5, 0.3] as const, looks: "ahead" as const } };
    expect(sayingFace(isaac, false, forAll)?.src).toBe(`/saints/icons/${recorded}`);
    // St Antony keeps his own.
    expect(sayingFace(allSayings()[0], false, forAll)).toEqual(ANTONY);
    // An icon in the rights debt is no face, whatever an entry says.
    expect(sayingFace(moses, false, { "Abba Moses": { icon: "moses-the-black.jpg", point: [0.5, 0.3], looks: "ahead" } })).toBeNull();
  });
});
