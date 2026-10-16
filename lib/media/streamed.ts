import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

/**
 * Media the apps read from the website instead of carrying (1.7).
 *
 * The apps' bundle is at its 85 MB packed ceiling (lib/build/exportSize.ts),
 * so what is large and can wait for a connection lives on the website alone.
 * Chants made the way (lib/chants/media.ts) and the read-aloud covers
 * (lib/readAloud/covers.ts) take the same way, so there is one and not two.
 * The pictures at the top of a saint's page (lib/saints/heroes.ts) are in
 * the covers' folder, /covers/saints/, so they need nothing more.
 * It has three parts, and each is useless without the other two:
 *
 *  1. The native build sets the folder aside (scripts/native-build.mjs,
 *     STASH_PATHS), so the export never carries it.
 *  2. The website lets the apps' origins read it (next.config.ts,
 *     streamedMediaHeaders). An app is another origin (https://localhost on
 *     Android, capacitor://localhost on iPhone), and a browser refuses a
 *     same-origin file to another origin while the server answers 200.
 *  3. In the apps the address is asked of SITE_URL (streamedUrl, below); on
 *     the website it is the site's own file.
 *
 * A folder joins by being listed here, in STASH_PATHS and in next.config.ts.
 * lib/media/__tests__/streamed.test.ts holds the three lists together.
 *
 * A file in one of these folders is taken down by taking it off the website:
 * the apps ask for it each time they show it. Chant recordings also have a
 * takedown list (public/audio/chants/live.json), because a recording that
 * fails to load would leave a dead Play button; a cover that fails to load
 * shows the bundled plate instead (components/player/CoverArt.tsx).
 */
export const STREAMED_ROOTS = ["/audio/chants/", "/covers/"] as const;

/** A file the apps do not carry, asked of the website. */
export function isStreamedMedia(path: string): boolean {
  return STREAMED_ROOTS.some((root) => path.startsWith(root));
}

/** The address to load: the website's in the apps, the page's own on the web. */
export function streamedUrl(path: string, native: boolean = isNativeClient()): string {
  return native && isStreamedMedia(path) ? `${SITE_URL}${path}` : path;
}
