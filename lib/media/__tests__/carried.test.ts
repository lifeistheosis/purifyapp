// The covers the apps carry as well as the website (1.9, build 90 note 5, his
// "All recommendations. Start." of 2026-11-10). Build 90 talked to the live
// 1.8 website, which has none of build 89 note 3's fifteen pictures, so it
// drew a plate for every one of them, and St John Cassian's two books with
// them. What this holds:
//
//  - Every carried picture is a file of the website's /covers/, with the
//    AVIF a cover offers first beside it (a carried JPEG without its AVIF
//    would leave the app's <picture> with a broken first choice).
//  - Note 3's pictures are all carried: the councils' icons, the How you
//    feel doors' and the three new portraits.
//  - In the apps a carried picture's address is the bundle's own, in every
//    place that decides an address (streamedUrl, coverSrc, heroSrc); every
//    other cover's is still the website's.
//  - The native build copies the same list, JPEG and AVIF, into the export
//    after the folders set aside come back and before the size is weighed.
//  - St John Cassian's two books wear icons the app carries, verified.
//
// What it does not hold: that the export has them. The export walk does
// (scripts/export-walk.mjs, section 41, which serves nothing from outside
// the bundle).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CARRIED_COVERS, isCarried } from "@/lib/media/carried";
import { isStreamedMedia, streamedUrl } from "@/lib/media/streamed";
import { AUTHOR_COVERS, COUNCIL_COVERS, FEELING_COVERS, WORK_COVERS } from "@/lib/reading/authorCovers";
import { WORK_ART, coverSrc } from "@/lib/reading/coverArt";
import { ICON_RIGHTS } from "@/lib/saints/iconRights";
import { SITE_URL } from "@/lib/site";

const ROOT = path.resolve(__dirname, "..", "..", "..");

/**
 * The three new pictures of people note 3 added, which the 1.8 website does
 * not have: St Arsenius's and St Tarasius's portraits, and St Anianus's book's
 * own picture (the scene it tells, not his face).
 */
const NEW_PORTRAITS = [AUTHOR_COVERS["arsenius-the-great"], AUTHOR_COVERS["tarasius-of-constantinople"], WORK_COVERS["anianus-of-alexandria/the-second-bishop"]];

describe("the covers the apps carry", () => {
  it("are files of the website's /covers/, each with its AVIF", () => {
    expect(CARRIED_COVERS.length).toBeGreaterThan(0);
    expect(new Set(CARRIED_COVERS).size).toBe(CARRIED_COVERS.length);
    for (const jpg of CARRIED_COVERS) {
      expect(jpg, jpg).toMatch(/^\/covers\/[a-z]+\/[a-z0-9-]+\.v\d+\.jpg$/);
      expect(fs.existsSync(path.join(ROOT, "public", jpg)), jpg).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "public", jpg.replace(/\.jpg$/, ".avif"))), `${jpg}: its AVIF`).toBe(true);
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
    expect([...new Set(note3)].sort()).toEqual([...CARRIED_COVERS].sort());
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

  it("are copied into the export by the native build, JPEG and AVIF, before the size is weighed", () => {
    const build = fs.readFileSync(path.join(ROOT, "scripts/native-build.mjs"), "utf8");
    expect(build).toContain('path.join(ROOT, "lib", "media", "carriedCovers.json")');
    expect(build).toMatch(/\[jpg, jpg\.replace\(\/\\\.jpg\$\/, "\.avif"\)\]/);
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
