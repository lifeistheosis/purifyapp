import { streamedUrl } from "@/lib/media/streamed";
import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";

import { CHANT_RECORDINGS, type ChantLine, type ChantTiming } from "./types";

/**
 * Where a chant's recordings, timed words and cover are, and how they are
 * reached (1.7).
 *
 * Chant audio streams and never ships inside the apps: the bundle is at its
 * 85 MB packed ceiling, and the owner's recordings are taken down with one
 * edit to a list on the website (live.json, below), not with a store
 * release.
 *
 * Since 1.8 a recording is kept in Purify's bucket on Cloudflare R2
 * (CHANT_RECORDINGS, audio.purifyapp.net/chants/<slug>/<id>.mp3), as the
 * Bible read aloud is: the owner's word of 2026-10-30, "R2, like the Bible
 * audio", which keeps the recordings out of the public repository the
 * website is built from. Its address is the same on the website and in the
 * apps, the bucket answers the website's and both apps' origins (its CORS
 * policy, Homebase/tools/r2/README.md), and the website lets its pages play
 * from it (lib/security/headers.ts, media-src). The Prayer Rope Anthem's
 * three recordings, from 1.7, stay on the website.
 *
 * Everything else streamed lives under /audio/chants/ on the website: the
 * Anthem's recordings, every recording's timing file and the live list. It
 * is kept out of the apps' export (scripts/native-build.mjs, STASH_PATHS),
 * so in the apps it is asked of SITE_URL, and on the website it is the
 * site's own file. next.config.ts lets the apps' origins read it
 * (Cross-Origin-Resource-Policy and Access-Control-Allow-Origin on
 * /audio/chants), which a curl that answers 200 does not prove: a browser
 * refuses a same-origin file to another origin while the server says 200.
 *
 * Any other path (the Anthem's cover, /audio/art/anthem.jpg) is in the
 * bundle and is used as it is. The way a website file is reached is shared
 * with the read-aloud covers (lib/media/streamed.ts).
 */
export const CHANT_MEDIA_PREFIX = "/audio/chants/";

export { CHANT_RECORDINGS };

/** The list that says which streamed recordings may play. */
export const LIVE_LIST_PATH = `${CHANT_MEDIA_PREFIX}live.json`;

/** A recording kept in Purify's bucket (since 1.8). */
export function inBucket(src: string): boolean {
  return src.startsWith(CHANT_RECORDINGS);
}

/** Streamed: on the website or in the bucket, never in the bundle, and played only while the live list names it. */
export function isStreamed(path: string): boolean {
  return path.startsWith(CHANT_MEDIA_PREFIX) || inBucket(path);
}

/**
 * The address to load: a website file is the website's in the apps and the
 * page's own on the web; a bucket recording, and anything the bundle
 * carries, is used as it is.
 */
export function chantMediaUrl(path: string, native?: boolean): string {
  if (!path.startsWith(CHANT_MEDIA_PREFIX)) return path;
  return streamedUrl(path, native);
}

/** How live.json names a recording: "<slug>/<variant id>". */
export function variantRef(slug: string, variantId: string): string {
  return `${slug}/${variantId}`;
}

/** The conventional paths of a recording on the website and of its timing file. */
export function streamedPaths(slug: string, variantId: string): { audio: string; timing: string } {
  return {
    audio: `${CHANT_MEDIA_PREFIX}${slug}/${variantId}.mp3`,
    timing: `${CHANT_MEDIA_PREFIX}${slug}/${variantId}.json`,
  };
}

/** A recording's address in Purify's bucket: one folder per chant, a file per version. */
export function bucketRecording(slug: string, variantId: string): string {
  return `${CHANT_RECORDINGS}${slug}/${variantId}.mp3`;
}

/** A timing file, checked by hand rather than with the schema, so the client stays small. */
export function readTiming(value: unknown): ChantTiming | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ChantTiming>;
  if (v.v !== 1 || typeof v.durationSec !== "number" || !Array.isArray(v.lines)) return null;
  for (const line of v.lines) {
    if (!line || typeof line.at !== "number" || typeof line.end !== "number" || typeof line.text !== "string") return null;
  }
  return v as ChantTiming;
}

const timings = new Map<string, Promise<ChantTiming | null>>();

/** A recording's timing file, fetched once per session; null when it cannot be read. */
export function loadTiming(path: string): Promise<ChantTiming | null> {
  let p = timings.get(path);
  if (!p) {
    p = fetch(chantMediaUrl(path), { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then(readTiming)
      .catch(() => null);
    // A failure is not kept: a reader who comes back online can try again.
    p.then((t) => {
      if (!t) timings.delete(path);
    });
    timings.set(path, p);
  }
  return p;
}

/** Which lines go with each sung line: its transliteration, its English. */
export type WordsPrefs = { translit: boolean; en: boolean };

/** The lines under the sung words: the transliteration, where the reader keeps it. */
export function subLines(line: ChantLine, prefs: WordsPrefs): string[] {
  return prefs.translit && line.translit ? [line.translit] : [];
}

/**
 * The English to read over a line sung in another language (1.8, Sing along:
 * the owner's pick of 2026-10-27, "the original under each English line"),
 * where the version has it and the reader keeps it. A line that is English
 * already has none.
 */
export function englishOver(line: ChantLine, prefs: WordsPrefs): string | undefined {
  return prefs.en && line.en && line.en !== line.text ? line.en : undefined;
}

/**
 * The live captions for a recording: the Church's words, each line timed by
 * the recording's timing file. The timing file's own text is only a check
 * (the data test holds the two line for line); what is shown is always the
 * data file's words. Without a timing file the captions have no times, and
 * Now Playing simply shows the picture.
 *
 * Each line is drawn as lib/player/captions.ts lineParts says: its English
 * over it where it has one (`en`), the sung words (`text`) under that, and
 * the transliteration (`sub`) under them. A chant's page and Now Playing draw
 * the same captions, so they read the same.
 */
export function captionsFor(lines: ChantLine[], timing: ChantTiming | null, prefs: WordsPrefs): CaptionSource {
  const timed = timing && timing.lines.length === lines.length ? timing.lines : null;
  return lines.map((line, i) => {
    const en = englishOver(line, prefs);
    const sub = subLines(line, prefs);
    return {
      ...(timed ? { time: timed[i].at, end: timed[i].end } : {}),
      text: line.text,
      ...(en ? { en } : {}),
      ...(sub.length ? { sub } : {}),
    };
  });
}

/** m:ss, for a recording's length. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
