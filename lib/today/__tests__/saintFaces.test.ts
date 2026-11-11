import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import rows from "@/data/calendar/profiled-saints.json";
import { COVER_ART } from "@/lib/reading/coverArt";
import type { SaintBrief } from "@/lib/saints/brief";
import { ICON_RIGHTS, MISSING_ATTRIBUTION, UNVERIFIED_ICONS } from "@/lib/saints/iconRights";
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
  faceShift,
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
      fallback: "/saints/icons/john-chrysostom.v2.jpg",
      focusY: 20,
    });
  });

  it("is asked of the website in the apps, as the reading room's covers are", () => {
    const pic = saintPicture(brief("john-chrysostom"), true);
    expect(pic).toMatchObject({ kind: "cover", src: `${SITE_URL}/covers/authors/john-chrysostom.v1.jpg` });
    // The icon he falls back to is the app's own, there with no signal.
    expect(pic?.kind === "cover" ? pic.fallback : null).toBe("/saints/icons/john-chrysostom.v2.jpg");
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
  // The picture the app carries for St John, for when his cover cannot be had (sheet r3-23, card 1).
  const CHRYSOSTOM_MOSAIC = { src: "/saints/icons/john-chrysostom.v2.jpg", point: [0.53, 0.39], looks: "ahead" };

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
    expect(quoteFace(chrysostom, false)).toEqual({ src: "/covers/authors/john-chrysostom.v1.jpg", point: [0.3, 0.25], looks: "left", fallback: CHRYSOSTOM_MOSAIC });
    expect(quoteFace(chrysostom, true)?.src).toBe(`${SITE_URL}/covers/authors/john-chrysostom.v1.jpg`);
  });

  it("falls back only to a carried icon whose rights are recorded, never one in the debt", () => {
    for (const file of SHAREABLE_ICONS) {
      expect(ICON_RIGHTS[file], file).toBeDefined();
      expect(MISSING_ATTRIBUTION, file).not.toContain(file);
    }
    // St John Chrysostom's carried icon is the Hosios Loukas mosaic since sheet r3-23, its rights
    // recorded: with no signal it is his face, never the cross.
    expect(quoteFace(brief("john-chrysostom"), true)?.fallback).toEqual(CHRYSOSTOM_MOSAIC);
    // St Cyprian has no cover; his icon's rights are recorded, so it is his face.
    expect(quoteFace(brief("cyprian-of-carthage"), true)).toEqual({ src: "/saints/icons/cyprian-of-carthage.jpg", point: [0.49, 0.32], looks: "ahead", fallback: null });
    // A saint with neither a cover nor a recorded icon has none.
    const none = BRIEFS.find((s) => !(s.slug in SAINT_FACES) && !(s.iconUrl && SHAREABLE_ICONS.has(s.iconUrl.replace("/saints/icons/", ""))))!;
    expect(quoteFace(none, false)).toBeNull();
    expect(quoteFace(null, false)).toBeNull();
  });

  it("is known for every saint whose words Today shows but St Alexander of Alexandria, whose words keep the lit cross", () => {
    const faceless = SAINT_WORDS_SLUGS.filter((slug) => !quoteFace(brief(slug), false));
    expect(faceless).toEqual(["alexander-of-alexandria"]);
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
// so a picture checked later is one entry. The owner's picks of sheet r3-22:
// card 2 for Abba Moses, card 6 for Abba Isaac and any Father with no picture
// of his own.
describe("the Fathers beside their sayings", () => {
  const ANTONY = { src: "/covers/authors/anthony-the-great.v1.jpg", point: [0.48, 0.3], looks: "right", fallback: null };
  const MOSES = { src: "/saints/icons/moses-the-black.v2.jpg", point: [0.49, 0.27], looks: "ahead", seal: [0.49, 0.27, 0.41], fallback: null };
  const SINAI = { src: "/saints/icons/fathers-of-sinai.jpg", point: [0.46, 0.29], looks: "ahead", seal: [0.46, 0.29, 0.29], fallback: null };

  it("is St Antony's cover beside each of his sayings, the one Abba Isaac tells among them", () => {
    const his = allSayings().filter((s) => s.speaker === "anthony-the-great");
    expect(his.length).toBe(8);
    for (const s of his) expect(sayingFace(s, false), s.attribution).toEqual(ANTONY);
    expect(his.some((s) => s.attribution.includes("Abba Isaac"))).toBe(true);
    // Asked of the website in the apps, as the reading room's covers are.
    expect(sayingFace(his[0], true)?.src).toBe(`${SITE_URL}/covers/authors/anthony-the-great.v1.jpg`);
  });

  it("is the fresco of St Moses the Ethiopian beside Abba Moses, cut round his face as the sheet cut it", () => {
    const his = allSayings().filter((s) => s.attribution === "Abba Moses");
    expect(his.length).toBe(3);
    for (const s of his) expect(sayingFace(s, false), s.text).toEqual(MOSES);
    // The app carries it, so it is the same with no signal.
    expect(sayingFace(his[0], true)).toEqual(MOSES);
  });

  it("is the Fathers of Sinai beside Abba Isaac, of whom no icon exists, and beside any Father with no picture of his own", () => {
    const isaac = allSayings().find((s) => s.attribution === "Abba Isaac")!;
    expect(sayingFace(isaac, false)).toEqual(SINAI);
    expect(sayingFace({ attribution: "An elder of Scetis" }, false)).toEqual(SINAI);
    expect(SAYING_FACES[DESERT_FATHERS]).toEqual({ icon: "fathers-of-sinai.jpg" });
    // Never St Isaac the Syrian, another man three centuries later.
    const named = Object.values(SAYING_FACES).map((f) => ("icon" in f ? f.icon : f.cover));
    expect(named.filter((n) => n.startsWith("isaac-the-syrian")), "St Isaac the Syrian's icon, by any of its names").toEqual([]);
  });

  it("names only pictures that are checked: a cover of the reading room, or an icon opened, public domain and recorded", () => {
    for (const [who, face] of Object.entries(SAYING_FACES)) {
      if ("cover" in face) {
        expect(face.cover in COVER_FACES && face.cover in SAINT_FACES, who).toBe(true);
        continue;
      }
      expect(SHAREABLE_ICONS.has(face.icon), who).toBe(true);
      const row = ICON_RIGHTS[face.icon];
      expect(row?.status, who).toBe("verified");
      expect(row?.license, who).toBe("Public domain");
      expect(row && "evidenceUrl" in row ? row.evidenceUrl : "", who).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(fs.existsSync(path.join(process.cwd(), "public/saints/icons", face.icon)), who).toBe(true);
    }
  });

  it("gives St Moses's own page the checked fresco in place of the modern icon with no rights", () => {
    const moses = brief("moses-the-ethiopian");
    expect(moses.iconUrl).toBe("/saints/icons/moses-the-black.v2.jpg");
    expect(quoteFace(moses, false)).toEqual(MOSES);
    expect(fs.existsSync(path.join(process.cwd(), "public/saints/icons/moses-the-black.jpg"))).toBe(false);
  });

  it("takes a Father's picture as one entry, has the lit cross where none stands, and refuses an icon whose rights are not recorded", () => {
    const moses = allSayings().find((s) => s.attribution === "Abba Moses")!;
    const isaac = allSayings().find((s) => s.attribution === "Abba Isaac")!;
    const recorded = "pimen-the-great.jpg";
    expect(SHAREABLE_ICONS.has(recorded)).toBe(true);
    // One entry: a recorded icon with no face placed by eye stands by the head of a standing figure.
    const withIsaac = { ...SAYING_FACES, "Abba Isaac": { icon: recorded } };
    expect(sayingFace(isaac, false, withIsaac)).toEqual({ src: `/saints/icons/${recorded}`, point: [0.5, ICON_FOCUS / 100 + 0.04], looks: "ahead", fallback: null });
    // With no entry and no picture for all the Fathers, the lit cross.
    const { [DESERT_FATHERS]: _all, ...own } = SAYING_FACES;
    void _all;
    expect(sayingFace(isaac, false, own)).toBeNull();
    // St Antony keeps his own whatever stands for the rest.
    expect(sayingFace(allSayings()[0], false, own)).toEqual(ANTONY);
    // An icon in the rights debt is no face, whatever an entry says: never a stand-in.
    const unsettled = Object.keys(UNVERIFIED_ICONS)[0];
    if (unsettled) expect(sayingFace(moses, false, { "Abba Moses": { icon: unsettled } })).toBeNull();
  });
});

// The faces for the saints' words (round 3 sheet r3-23, the owner's picks):
// each the picture his own page shows too, cut and placed as the sheet cut it.
describe("the faces for the saints' words", () => {
  const PICKS = {
    "john-chrysostom": "john-chrysostom.v2.jpg",
    "cyril-of-jerusalem": "cyril-of-jerusalem.v2.jpg",
    "photius-the-great": "photius-the-great.v2.jpg",
    "justinian-the-great": "justinian-the-great.v2.jpg",
  } as const;

  it("is each saint's own picture on his page, opened, public domain and recorded, in place of the file with no source", () => {
    for (const [slug, file] of Object.entries(PICKS)) {
      expect(brief(slug).iconUrl, slug).toBe(`/saints/icons/${file}`);
      const row = ICON_RIGHTS[file];
      expect(row?.status, slug).toBe("verified");
      expect(row?.license, slug).toBe("Public domain");
      expect(row && "evidenceUrl" in row ? (row.evidenceUrl ?? "").startsWith("https://commons.wikimedia.org/wiki/File:") : false, slug).toBe(true);
      expect(SHAREABLE_ICONS.has(file), slug).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), "public/saints/icons", file.replace(".v2.jpg", ".jpg"))), `${slug}: the old file is gone`).toBe(false);
    }
  });

  it("stands beside the words of St Cyril, St Photius and St Justinian, the face and its circle as the sheet cut them", () => {
    expect(quoteFace(brief("cyril-of-jerusalem"), false)).toEqual({ src: "/saints/icons/cyril-of-jerusalem.v2.jpg", point: [0.42, 0.32], looks: "ahead", seal: [0.42, 0.32, 0.49], fallback: null });
    expect(quoteFace(brief("photius-the-great"), false)).toEqual({ src: "/saints/icons/photius-the-great.v2.jpg", point: [0.52, 0.3], looks: "ahead", seal: [0.52, 0.3, 0.32], fallback: null });
    expect(quoteFace(brief("justinian-the-great"), false)).toEqual({ src: "/saints/icons/justinian-the-great.v2.jpg", point: [0.5, 0.27], looks: "ahead", seal: [0.5, 0.27, 0.51], fallback: null });
    // Carried, so the same with no signal.
    expect(quoteFace(brief("photius-the-great"), true)?.src).toBe("/saints/icons/photius-the-great.v2.jpg");
  });

  it("keeps St John Chrysostom's streamed cover online, and the mosaic for when it cannot be had", () => {
    const face = quoteFace(brief("john-chrysostom"), true);
    expect(face?.src).toBe(`${SITE_URL}/covers/authors/john-chrysostom.v1.jpg`);
    expect(face?.fallback).toEqual({ src: "/saints/icons/john-chrysostom.v2.jpg", point: [0.53, 0.39], looks: "ahead" });
  });

  it("keeps the lit cross for St Alexander of Alexandria, who has no cleared picture (build 93 note 1)", () => {
    expect(quoteFace(brief("alexander-of-alexandria"), false)).toBeNull();
  });
});

// A face in a small round frame (1.9, build 89 note 2). Beside the studies
// that quote him, St Basil's face stood half out of its frame: the frame was
// cut about the portrait's middle, and his portrait has him at its right.
// What a reader would notice if this broke: a Father's vestment in the frame
// and his face cut by its edge, or the frame showing past the picture's side.
describe("a face in a small round frame", () => {
  /** The frame brings a portrait this close in Theology's rows and on its shelf of faces. */
  const ZOOM = 1.4;

  it("leaves a portrait that has him in its middle where it was", () => {
    expect(faceShift(0.5, ZOOM)).toBe(0);
    expect(faceShift(0.5, 1)).toBe(0);
  });

  it("has no room to move a portrait it does not bring closer", () => {
    for (const across of [0.2, 0.74, 0.9]) expect(faceShift(across, 1)).toBeCloseTo(0, 10);
  });

  it("brings every cover's face nearer the middle, and never shows past the picture's side", () => {
    const faces = Object.entries(COVER_FACES);
    expect(faces.length).toBeGreaterThan(40);
    for (const [slug, [across]] of faces) {
      const shift = faceShift(across, ZOOM);
      // Where his face stands across the frame: it was (across - 0.5) * zoom from the middle.
      const now = across + shift;
      const before = 0.5 + (across - 0.5) * ZOOM;
      expect(Math.abs(now - 0.5), slug).toBeLessThanOrEqual(Math.abs(before - 0.5) + 1e-9);
      // Inside the frame's circle with room about it: its middle three fifths.
      expect(now, slug).toBeGreaterThanOrEqual(0.3);
      expect(now, slug).toBeLessThanOrEqual(0.7);
      // The picture's two sides are still at or past the frame's.
      expect(across - ZOOM * across + shift, slug).toBeLessThanOrEqual(1e-9);
      expect(across + ZOOM * (1 - across) + shift, slug).toBeGreaterThanOrEqual(1 - 1e-9);
    }
    // St Basil, who stands at his portrait's right: from 0.84 of the way across to 0.64.
    expect(COVER_FACES["basil-the-great"][0] + faceShift(COVER_FACES["basil-the-great"][0], ZOOM)).toBeCloseTo(0.636, 3);
  });

  it("is what Theology's faces are cut by, and only where a face's place is known", () => {
    const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
    const face = read("components/today/SaintFace.tsx");
    expect(face).toContain("const fx = cover && across !== undefined ? across : null;");
    expect(face).toContain("transform: `translateX(${+(faceShift(fx, zoom) * 100).toFixed(2)}%) scale(${zoom})`,");
    // Left out, the frame is cut about the middle, as it always was.
    expect(face).toContain("? { transform: `scale(${zoom})`, transformOrigin: `50% ${focusY}%` }");
    expect(read("components/theology/FatherFace.tsx")).toContain("across={father?.slug ? COVER_FACES[father.slug]?.[0] : undefined}");
    expect(read("components/theology/FathersShelf.tsx")).toContain("across={COVER_FACES[f.slug]?.[0]}");
    // Today's saint in his window's round frame too (1.9, Theology's T5: it
    // was cut about the portrait's middle, so St Basil stood at its edge).
    expect(read("components/today/SaintWindow.tsx")).toContain("zoom={1.4} across={COVER_FACES[saint.slug]?.[0]}");
    // A picture is not mirrored: its frame keeps its direction in Arabic.
    expect(read("components/theology/FatherFace.tsx")).toMatch(/aria-hidden\s+dir="ltr"/);
  });
});
