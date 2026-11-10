import CARRIED from "./carriedCovers.json";

/**
 * The cover pictures the apps carry as well as the website (1.9, build 90
 * note 5, his "All recommendations. Start." of 2026-11-10).
 *
 * Every picture under /covers/ lives on the website and the apps ask for it
 * (lib/media/streamed.ts). A picture new since the website's last deploy is
 * one the live site cannot serve yet: build 90 talked to the live 1.8 site
 * and drew a plate for all fifteen of build 89 note 3's pictures (the four
 * councils' icons, the eight How you feel doors, three new portraits), and so
 * would any test build until the 1.9 website is deployed. These are in the
 * apps' own files as well, and a cover draws the app's own copy first: in
 * the apps their address is the bundle's, not the website's. The website
 * keeps serving them at the same address, and a picture changed after a
 * store build comes as a new versioned file, through the covers pack, from
 * the website.
 *
 * The list is carriedCovers.json, read here and by the native build, which
 * copies each JPEG and the AVIF beside it into the export
 * (scripts/native-build.mjs, carryCovers). lib/media/__tests__/carried.test.ts
 * holds the files, the list and the readers together. Server-safe: no module
 * here asks the device, so lib/reading/coverArt.ts and lib/saints/heroes.ts,
 * which decide the address at build time, read it too.
 */
export const CARRIED_COVERS: readonly string[] = CARRIED.covers;

const CARRIED_SET = new Set<string>(CARRIED_COVERS.flatMap((jpg) => [jpg, jpg.replace(/\.jpg$/, ".avif")]));

/** Whether the apps carry this file (a carried JPEG or the AVIF beside it). */
export function isCarried(path: string): boolean {
  return CARRIED_SET.has(path);
}
