import { streamedUrl } from "@/lib/media/streamed";
import { wordsOf } from "@/lib/player/captions";
import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";

import { CHANT_RECORDINGS, CHANT_TIMING, type ChantLine, type ChantTiming, type ChantTimingLine, type ChantWordTime } from "./types";

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
 * Anthem's recordings and the live list. It is kept out of the apps' export
 * (scripts/native-build.mjs, STASH_PATHS), so in the apps it is asked of
 * SITE_URL, and on the website it is the site's own file. next.config.ts
 * lets the apps' origins read it (Cross-Origin-Resource-Policy and
 * Access-Control-Allow-Origin on /audio/chants), which a curl that answers
 * 200 does not prove: a browser refuses a same-origin file to another origin
 * while the server says 200.
 *
 * The timing files are not streamed (1.8, build 86 note 78): each rides in
 * the app beside the words it times (CHANT_TIMING, app/chant-timing), so a
 * build never shows words its timing cannot reach. The copies still under
 * /audio/chants/<slug>/<id>.json on the website are kept, frozen, for the
 * builds that asked the website for them (build 86 and before); nothing in
 * this build reads them.
 *
 * Any other path (the Anthem's cover, /audio/art/anthem.jpg) is in the
 * bundle and is used as it is. The way a website file is reached is shared
 * with the read-aloud covers (lib/media/streamed.ts).
 */
export const CHANT_MEDIA_PREFIX = "/audio/chants/";

export { CHANT_RECORDINGS, CHANT_TIMING };

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

const TAIL = /\/chants\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.mp3$/;

/**
 * The part of a recording's address that names it wherever it is kept:
 * "/chants/<slug>/<id>.mp3". The bucket's address ends so, the website's
 * (/audio/chants/...) does, and so does a copy saved on the phone
 * (lib/chants/offline.ts keeps it at audio/chants/<slug>/<id>.mp3). Null
 * for anything that is not a chant's recording.
 */
export function recordingTail(src: string | null | undefined): string | null {
  if (!src) return null;
  const m = TAIL.exec(src.split(/[?#]/, 1)[0]);
  return m ? m[0] : null;
}

/**
 * Whether the player's address is this recording (1.9): the address itself,
 * the website's in the apps, or the copy saved on the phone, which plays
 * from the app's own files under another address.
 */
export function sameRecording(playing: string | null | undefined, variantSrc: string): boolean {
  if (!playing) return false;
  if (playing === variantSrc || playing.endsWith(variantSrc)) return true;
  const tail = recordingTail(variantSrc);
  return tail !== null && recordingTail(playing) === tail;
}

/**
 * The conventional paths of a version: its recording on the website (the
 * Anthem's, from 1.7), and its timing file, in the bundle.
 */
export function chantPaths(slug: string, variantId: string): { audio: string; timing: string } {
  return {
    audio: `${CHANT_MEDIA_PREFIX}${slug}/${variantId}.mp3`,
    timing: `${CHANT_TIMING}${slug}/${variantId}.json`,
  };
}

/** Where the builds through 86 ask the website for a timing file: kept there, frozen, for them alone. */
export function legacyTimingPath(slug: string, variantId: string): string {
  return `${CHANT_MEDIA_PREFIX}${slug}/${variantId}.json`;
}

/** A recording's address in Purify's bucket: one folder per chant, a file per version. */
export function bucketRecording(slug: string, variantId: string): string {
  return `${CHANT_RECORDINGS}${slug}/${variantId}.mp3`;
}

/**
 * A timing file, checked by hand rather than with the schema, so the client
 * stays small: version 1 (each line's start and end) or version 2 (each
 * word's too, note 78). A line's word times are checked where they are used
 * (lineWordTimes), so a line whose words do not match falls back to its
 * line's time alone, and the file still times every line.
 */
export function readTiming(value: unknown): ChantTiming | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ChantTiming>;
  if ((v.v !== 1 && v.v !== 2) || typeof v.durationSec !== "number" || !Array.isArray(v.lines)) return null;
  for (const line of v.lines) {
    if (!line || typeof line.at !== "number" || typeof line.end !== "number" || typeof line.text !== "string") return null;
  }
  return v as ChantTiming;
}

/**
 * A line's word times, where its timing file gives one for each of the words
 * shown (`text`, split as the app splits it), each a start and an end that
 * move forward; otherwise undefined, and the words are lit at the pace of the
 * line (lib/player/captions.ts).
 */
export function lineWordTimes(line: ChantTimingLine | undefined, text: string): ChantWordTime[] | undefined {
  const times = line?.words;
  if (!Array.isArray(times) || times.length !== wordsOf(text).length) return undefined;
  let last = -Infinity;
  for (const t of times) {
    if (!Array.isArray(t) || typeof t[0] !== "number" || typeof t[1] !== "number" || t[0] < last || t[1] < t[0]) return undefined;
    last = t[0];
  }
  return times;
}

const timings = new Map<string, Promise<ChantTiming | null>>();
/** The timing files that have arrived, to hand over at once. */
const arrived = new Map<string, ChantTiming>();

/**
 * A recording's timing file, read once per session; null when it cannot be
 * read. It is in the bundle (CHANT_TIMING), so in the apps it comes from the
 * app itself, with no signal and whatever the website runs.
 */
export function loadTiming(path: string): Promise<ChantTiming | null> {
  let p = timings.get(path);
  if (!p) {
    p = fetch(chantMediaUrl(path), { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then(readTiming)
      .catch(() => null);
    // A failure is not kept: a reader who comes back online can try again.
    p.then((t) => {
      if (t) arrived.set(path, t);
      else timings.delete(path);
    });
    timings.set(path, p);
  }
  return p;
}

/**
 * A timing file already here, or null: so a chant's page opened while its
 * version plays (Now Playing's Read, a page come back to) lights the line
 * being sung in its first frame, not a frame after (sheet r3-18, note 61).
 */
export function timingInHand(path: string | undefined): ChantTiming | null {
  return path ? (arrived.get(path) ?? null) : null;
}

/**
 * How the words of a version sung in a script other than Latin are shown, the
 * reader's choice (1.8, notes 56 and 59; the owner: "there should be Arabic,
 * right? But you should also have the option to switch it to English
 * transliteration", and "an option to show both at the same time"): the
 * words as they are sung, their sound in Latin letters, or each word over its
 * sound. The original first, as he put it.
 */
export const WORDS_VIEWS = ["original", "translit", "both"] as const;
export type WordsView = (typeof WORDS_VIEWS)[number];

export function isWordsView(value: unknown): value is WordsView {
  return typeof value === "string" && (WORDS_VIEWS as readonly string[]).includes(value);
}

/** What goes with the sung words: how they are shown, and the English over them. */
export type WordsPrefs = { view: WordsView; en: boolean };

/**
 * The sound of each sung word, word for word: the transliteration split as
 * the line is, where it has a word for every word sung (the data test holds
 * every Arabic and Greek line to this), else null.
 */
export function wordSounds(line: ChantLine): string[] | null {
  if (!line.translit) return null;
  const sounds = wordsOf(line.translit);
  return sounds.length === wordsOf(line.text).length ? sounds : null;
}

/**
 * The sung words as the reader chose to see them, where the line has a
 * transliteration: its sound in their place (`latin`), or each word over its
 * sound (`pairs`), or, where the two do not go word for word, the sound under
 * the whole line (`sub`). A line with none is always its own words.
 */
export function sungAs(
  line: ChantLine,
  view: WordsView,
): { text: string; latin?: true; pairs?: string[]; sub?: string[] } {
  if (!line.translit || view === "original") return { text: line.text };
  if (view === "translit") return { text: line.translit, latin: true };
  const pairs = wordSounds(line);
  return pairs ? { text: line.text, pairs } : { text: line.text, sub: [line.translit] };
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
 * over it where it has one (`en`), and the sung words (`text`) under that,
 * shown as the reader chose (sungAs): as sung, as their sound, or each word
 * over its sound. A chant's page and Now Playing draw the same captions, so
 * they read the same.
 *
 * Where the timing file times each word (build 86 note 78, version 2), the
 * line carries those times (`wordTimes`), word for word the words as sung.
 * Their sound has a word for each word sung (the data test holds it), so the
 * same times light the same words in all three views: the n-th word sung,
 * its n-th sound, or the n-th word over its sound.
 */
export function captionsFor(lines: ChantLine[], timing: ChantTiming | null, prefs: WordsPrefs): CaptionSource {
  const timed = timing && timing.lines.length === lines.length ? timing.lines : null;
  return lines.map((line, i) => {
    const en = englishOver(line, prefs);
    const sung = sungAs(line, prefs.view);
    const times = timed ? lineWordTimes(timed[i], line.text) : undefined;
    return {
      ...(timed ? { time: timed[i].at, end: timed[i].end } : {}),
      ...sung,
      ...(en ? { en } : {}),
      ...(times && times.length === wordsOf(sung.text).length ? { wordTimes: times } : {}),
    };
  });
}

/** m:ss, for a recording's length. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
