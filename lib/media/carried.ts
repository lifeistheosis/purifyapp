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
 * Two more groups join them on his yes of the same day ("The councils' 13
 * portraits carried in the apps (+2.1 MB) and the five Bible covers
 * (+0.9 MB): yes"): every portrait the seven Ecumenical Councils' Fathers'
 * faces ask the website for, so the councils show their faces with no
 * signal, and the five read-aloud covers new in 1.9 (David and Solomon from
 * Lagoudera, Ezra, Obadiah, Zechariah), which the 1.8 website does not have.
 *
 * And the Florilegium's starters (the arbiter's word of 2026-11-11, F4):
 * three of its four starters wear a read-aloud cover (the Prologue St
 * John's, the Beatitudes St Matthew's, Psalm 50 David's) and showed the plain
 * plate with no signal; the fourth, the Magnificat, wears the Theotokos's
 * icon, which the apps carry already. Their three covers are carried as the
 * JPEG alone, as the player draws them (components/player/CoverArt.tsx),
 * +0.51 MB; John's Gospel, Matthew's and the Psalms read aloud show their
 * covers with no signal too.
 *
 * The list is carriedCovers.json, read here and by the native build, which
 * copies each JPEG and the AVIF beside it into the export
 * (scripts/native-build.mjs, carryCovers). The five read-aloud covers are
 * its "jpegOnly": the player draws a read-aloud cover as a plain JPEG
 * (components/player/CoverArt.tsx) and offers no AVIF first, so the apps
 * carry their JPEG alone, 0.52 MB lighter (the arbiter's yes of 2026-11-10:
 * "Five Bible covers JPEG-only: yes"). lib/media/__tests__/carried.test.ts
 * holds the files, the list and the readers together. Server-safe: no module
 * here asks the device, so lib/reading/coverArt.ts and lib/saints/heroes.ts,
 * which decide the address at build time, read it too.
 */
export const CARRIED_COVERS: readonly string[] = [...CARRIED.covers, ...CARRIED.jpegOnly];

/** The carried covers that come as the JPEG alone: the read-aloud covers, which the player draws with no AVIF. */
export const JPEG_ONLY_COVERS: readonly string[] = CARRIED.jpegOnly;

const CARRIED_SET = new Set<string>([...CARRIED.covers.flatMap((jpg) => [jpg, jpg.replace(/\.jpg$/, ".avif")]), ...CARRIED.jpegOnly]);

/** Whether the apps carry this file (a carried JPEG, or the AVIF beside one that offers it). */
export function isCarried(path: string): boolean {
  return CARRIED_SET.has(path);
}
