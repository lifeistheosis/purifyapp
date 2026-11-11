import { isCarried } from "@/lib/media/carried";
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
 * the covers' folder, /covers/saints/, so they need nothing more. History's
 * pictures, one for each event (lib/history/media.ts), are a folder of their
 * own (the seven Ecumenical Councils' AVIFs are carried as well, from 1.9,
 * lib/media/carried.ts), and so is the Bible read aloud, every chapter's recording and its list
 * (lib/readAloud/chapters.ts). From 1.9 the shop's photos stream too, and
 * the Bibles a reader downloads (lib/bible/downloads/), each book a file,
 * and the timings of every other text read aloud, with their list
 * (lib/listen/recordings.ts): a text recorded after an app was built is
 * heard in it all the same.
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
 * takedown list (/audio/chants/live.json, served by app/audio/chants/live.json/route.ts), because a recording that
 * fails to load would leave a dead Play button; a cover that fails to load
 * shows the bundled plate instead (components/player/CoverArt.tsx).
 */
export const STREAMED_ROOTS = ["/audio/chants/", "/covers/", "/history/media/", "/audio/read/", "/shop/media/", "/bibles/", "/audio/listen/"] as const;

/**
 * A file the apps do not carry, asked of the website. A file the apps carry
 * as well (a cover, or a council's AVIF; lib/media/carried.ts, from 1.9) is
 * the bundle's own, not this.
 */
export function isStreamedMedia(path: string): boolean {
  return STREAMED_ROOTS.some((root) => path.startsWith(root)) && !isCarried(path);
}

/**
 * The AVIF beside a cover picture (1.7.2, "ensure all photos are optimized"):
 * every JPEG under /covers/ has one, about 40% lighter (scripts/covers-avif.mjs),
 * which a cover offers first in a <picture> with the JPEG behind it. Given the
 * address a cover would load, the website's or the page's own; null for any
 * other picture, another site's above all.
 */
export function avifFor(src: string | null | undefined): string | null {
  if (!src || !src.endsWith(".jpg")) return null;
  const path = src.startsWith(SITE_URL) ? src.slice(SITE_URL.length) : src;
  if (!path.startsWith("/covers/")) return null;
  return src.replace(/\.jpg$/, ".avif");
}

/** The address to load: the website's in the apps, the page's own on the web. */
export function streamedUrl(path: string, native: boolean = isNativeClient()): string {
  return native && isStreamedMedia(path) ? `${SITE_URL}${path}` : path;
}

/**
 * A whole answer with every streamed address in it made the website's, for a
 * reply whose addresses are scattered through it: the shop's catalog, whose
 * pictures stream since 1.9 (lib/shop/catalogClient.ts). The value as it is
 * on the website; a new copy only where something changed in the apps.
 */
export function streamedDeep<T>(value: T, native: boolean = isNativeClient()): T {
  if (!native) return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return isStreamedMedia(v) ? `${SITE_URL}${v}` : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}
