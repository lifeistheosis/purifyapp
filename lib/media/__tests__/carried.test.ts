// The covers the apps carry as well as the website (1.9, build 90 note 5, his
// "All recommendations. Start." of 2026-11-10). Build 90 talked to the live
// 1.8 website, which has none of build 89 note 3's fifteen pictures, so it
// drew a plate for every one of them, and St John Cassian's two books with
// them. What this holds:
//
//  - Every carried picture is a file of the website's /covers/, with the
//    AVIF a cover offers first beside it (a carried JPEG without its AVIF
//    would leave the app's <picture> with a broken first choice), except
//    the five read-aloud covers, which the player draws as a plain JPEG and
//    which are carried as the JPEG alone (the arbiter's yes of 2026-11-10).
//  - Note 3's pictures are all carried: the councils' icons, the How you
//    feel doors' and the three new portraits.
//  - Every portrait a council's Fathers' faces ask the website for is
//    carried too, so the councils show their faces with no signal, and the
//    five read-aloud covers new in 1.9 that the 1.8 website does not have
//    (his yes of 2026-11-10: "The councils' 13 portraits carried in the apps
//    (+2.1 MB) and the five Bible covers (+0.9 MB): yes").
//  - Nothing else is carried: the list is those groups and no more.
//  - In the apps a carried picture's address is the bundle's own, in every
//    place that decides an address (streamedUrl, coverSrc, heroSrc); every
//    other cover's is still the website's.
//  - The native build copies the same list, JPEG and AVIF (the read-aloud
//    covers' JPEG alone), into the export after the folders set aside come
//    back and before the size is weighed.
//  - St John Cassian's two books wear icons the app carries, verified.
//
// What it does not hold: that the export has them. The export walk does
// (scripts/export-walk.mjs, section 41, which serves nothing from outside
// the bundle).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { CARRIED_COVERS, JPEG_ONLY_COVERS, isCarried } from "@/lib/media/carried";
import { isStreamedMedia, streamedUrl } from "@/lib/media/streamed";
import { AUTHOR_COVERS, COUNCIL_COVERS, FEELING_COVERS, WORK_COVERS } from "@/lib/reading/authorCovers";
import { WORK_ART, coverArtFor, coverSrc } from "@/lib/reading/coverArt";
import { FIGURES, type FigureId } from "@/lib/readAloud/covers";
import { ICON_RIGHTS } from "@/lib/saints/iconRights";
import { SITE_URL } from "@/lib/site";

const ROOT = path.resolve(__dirname, "..", "..", "..");

/**
 * The three new pictures of people note 3 added, which the 1.8 website does
 * not have: St Arsenius's and St Tarasius's portraits, and St Anianus's book's
 * own picture (the scene it tells, not his face).
 */
const NEW_PORTRAITS = [AUTHOR_COVERS["arsenius-the-great"], AUTHOR_COVERS["tarasius-of-constantinople"], WORK_COVERS["anianus-of-alexandria/the-second-bishop"]];

/** The read-aloud covers note 3 added for 1.9 (David and Solomon from Lagoudera, Ezra with the archangel Uriel, Obadiah, Zechariah). */
const NEW_READ_COVERS: FigureId[] = ["davidLagoudera", "ezraUriel", "obadiah", "solomonLagoudera", "zechariah"];

/**
 * Every portrait on the website that the seven Ecumenical Councils' Fathers'
 * faces draw (lib/councils/fathers.ts: a Father's cover art, when it is a
 * streamed portrait). His yes was for these. A local council's faces are not
 * carried: the Council of Carthage of 419 draws St Augustine's portrait
 * (0.13 MB with its AVIF), which still needs the website.
 */
function councilPortraits(): string[] {
  const files = new Set<string>();
  for (const council of COUNCILS.filter((c) => c.ordinal)) {
    for (const father of council.principalFathers ?? []) {
      const art = father.slug ? coverArtFor(father.slug) : null;
      if (art?.kind === "streamed") files.add(art.file);
    }
  }
  return [...files].sort();
}

describe("the covers the apps carry", () => {
  it("are files of the website's /covers/, each with its AVIF where it offers one", () => {
    expect(CARRIED_COVERS.length).toBeGreaterThan(0);
    expect(new Set(CARRIED_COVERS).size).toBe(CARRIED_COVERS.length);
    for (const jpg of CARRIED_COVERS) {
      // A reading room picture lives in a folder of its kind; a read-aloud cover at the root, by its figure's id.
      expect(jpg, jpg).toMatch(/^\/covers\/(?:[a-z]+\/[a-z0-9-]+|[a-zA-Z0-9]+)\.v\d+\.jpg$/);
      expect(fs.existsSync(path.join(ROOT, "public", jpg)), jpg).toBe(true);
      const avif = jpg.replace(/\.jpg$/, ".avif");
      if (JPEG_ONLY_COVERS.includes(jpg)) expect(isCarried(avif), `${jpg}: no AVIF carried`).toBe(false);
      else expect(fs.existsSync(path.join(ROOT, "public", avif)), `${jpg}: its AVIF`).toBe(true);
    }
  });

  it("hold every picture note 3 added: the councils', the doors' and the three new portraits", () => {
    const note3 = [
      ...Object.values(COUNCIL_COVERS).map((art) => art.file),
      ...Object.values(FEELING_COVERS).map((art) => art.file),
      ...NEW_PORTRAITS.map((art) => {
        expect(art?.kind).toBe("streamed");
        return art.file;
      }),
    ];
    for (const file of note3) expect(isCarried(file), file).toBe(true);
  });

  it("hold every portrait a council's Fathers' faces ask the website for", () => {
    const portraits = councilPortraits();
    // Thirteen with his yes, and St Tarasius's, which note 3 carried already.
    expect(portraits.length).toBe(14);
    for (const file of portraits) expect(isCarried(file), file).toBe(true);
  });

  it("hold the five read-aloud covers new in 1.9, which the 1.8 website does not have", () => {
    for (const id of NEW_READ_COVERS) {
      const file = FIGURES[id]?.file;
      expect(file, id).toBeDefined();
      expect(isCarried(file!), id).toBe(true);
    }
  });

  it("carry the read-aloud covers as the JPEG alone, which is all the player draws", () => {
    // The arbiter's yes of 2026-11-10 ("Five Bible covers JPEG-only: yes"): 0.52 MB lighter.
    expect([...JPEG_ONLY_COVERS].sort()).toEqual(NEW_READ_COVERS.map((id) => FIGURES[id]!.file).sort());
    // The player's cover is a plain <img> of the JPEG, and no picture that offers an AVIF first reads these covers.
    expect(fs.readFileSync(path.join(ROOT, "components/player/CoverArt.tsx"), "utf8")).not.toMatch(/avif/i);
    for (const file of ["components/you/KeptShelf.tsx", "components/you/PickUpCard.tsx", "lib/you/covers.ts"]) {
      expect(fs.readFileSync(path.join(ROOT, file), "utf8"), file).not.toMatch(/avif/i);
    }
    for (const file of ["components/councils/CouncilFathers.tsx", "components/covers/WorkCover.tsx", "components/reading/FeaturedWork.tsx", "components/reading/FeelingsRow.tsx", "components/reading/ReadingRoom.tsx", "components/saints/SaintHeroPicture.tsx", "components/today/SpeakerBand.tsx", "lib/today/saintFaces.ts"]) {
      expect(fs.readFileSync(path.join(ROOT, file), "utf8"), file).not.toContain("readAloud/covers");
    }
  });

  it("are those groups and no more", () => {
    const note3 = [
      ...Object.values(COUNCIL_COVERS).map((art) => art.file),
      ...Object.values(FEELING_COVERS).map((art) => art.file),
      ...NEW_PORTRAITS.map((art) => art.file),
    ];
    const meant = new Set([...note3, ...councilPortraits(), ...NEW_READ_COVERS.map((id) => FIGURES[id]!.file)]);
    expect([...meant].sort()).toEqual([...CARRIED_COVERS].sort());
  });

  it("are the bundle's own in the apps, and every other cover is still the website's", () => {
    const carried = CARRIED_COVERS[0];
    expect(isCarried(carried)).toBe(true);
    expect(isCarried(carried.replace(/\.jpg$/, ".avif"))).toBe(true);
    expect(isStreamedMedia(carried)).toBe(false);
    expect(streamedUrl(carried, true)).toBe(carried);
    expect(coverSrc(FEELING_COVERS.anger, true)).toBe(FEELING_COVERS.anger.file);

    const streamed = "/covers/authors/anthony-the-great.v1.jpg";
    expect(isCarried(streamed)).toBe(false);
    expect(isStreamedMedia(streamed)).toBe(true);
    expect(streamedUrl(streamed, true)).toBe(`${SITE_URL}${streamed}`);
    // On the website every picture is its own file.
    expect(streamedUrl(carried, false)).toBe(carried);
    expect(streamedUrl(streamed, false)).toBe(streamed);

    // The saints' page pictures decide their address at build time the same way.
    const heroes = fs.readFileSync(path.join(ROOT, "lib/saints/heroes.ts"), "utf8");
    expect(heroes).toMatch(/native && !isCarried\(hero\.file\)/);
  });

  it("are copied into the export by the native build, JPEG and AVIF (the read-aloud covers' JPEG alone), before the size is weighed", () => {
    const build = fs.readFileSync(path.join(ROOT, "scripts/native-build.mjs"), "utf8");
    expect(build).toContain('path.join(ROOT, "lib", "media", "carriedCovers.json")');
    expect(build).toMatch(/\[jpg, jpg\.replace\(\/\\\.jpg\$\/, "\.avif"\)\]\), \.\.\.jpegOnly\]/);
    const carry = build.indexOf("carryCovers(path.join(ROOT, \"out\"))");
    expect(carry).toBeGreaterThan(build.indexOf("restoreAll();\n}"));
    expect(carry).toBeLessThan(build.indexOf('run("node --experimental-strip-types scripts/export-size.mjs'));
  });

  it("include St John Cassian's two books' icons, which the app carries and whose rights are verified", () => {
    for (const [key, file] of [
      ["john-cassian/conferences", "/saints/icons/moses-the-black.v2.jpg"],
      ["john-cassian/institutes", "/saints/icons/pachomius-the-great.jpg"],
    ] as const) {
      const art = WORK_ART[key];
      expect(art?.kind, key).toBe("bundled");
      expect(art?.file, key).toBe(file);
      expect(fs.existsSync(path.join(ROOT, "public", file)), file).toBe(true);
      expect(ICON_RIGHTS[path.basename(file)]?.status, file).toBe("verified");
    }
  });
});
