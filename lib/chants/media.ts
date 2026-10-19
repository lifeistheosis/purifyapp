import { streamedUrl } from "@/lib/media/streamed";
import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";

import type { ChantLine, ChantTiming } from "./types";

/**
 * Where a chant's recordings, timed words and cover are, and how they are
 * reached (1.7).
 *
 * Chant audio streams from the website and never ships inside the apps: the
 * bundle is at its 85 MB packed ceiling, and the owner's recordings are
 * taken down with one edit to a list on the website (live.json, below), not
 * with a store release. Everything under /audio/chants/ is kept out of the
 * apps' export (scripts/native-build.mjs, STASH_PATHS), so in the apps it is
 * asked of SITE_URL, and on the website it is the site's own file.
 * next.config.ts lets the apps' origins read it (Cross-Origin-Resource-
 * Policy and Access-Control-Allow-Origin on /audio/chants), which a curl
 * that answers 200 does not prove: a browser refuses a same-origin file to
 * another origin while the server says 200.
 *
 * Any other path (the Anthem's cover, /audio/art/anthem.jpg) is in the
 * bundle and is used as it is. The way a streamed file is reached is shared
 * with the read-aloud covers (lib/media/streamed.ts), so moving streamed
 * media to another host later is one change there.
 */
export const CHANT_MEDIA_PREFIX = "/audio/chants/";

/** The list that says which streamed recordings may play. */
export const LIVE_LIST_PATH = `${CHANT_MEDIA_PREFIX}live.json`;

export function isStreamed(path: string): boolean {
  return path.startsWith(CHANT_MEDIA_PREFIX);
}

/** The address to load: the website's in the apps, the page's own on the web. */
export function chantMediaUrl(path: string, native?: boolean): string {
  if (!isStreamed(path)) return path;
  return streamedUrl(path, native);
}

/** How live.json names a recording: "<slug>/<variant id>". */
export function variantRef(slug: string, variantId: string): string {
  return `${slug}/${variantId}`;
}

/** The conventional paths of a streamed recording and its timing file. */
export function streamedPaths(slug: string, variantId: string): { audio: string; timing: string } {
  return {
    audio: `${CHANT_MEDIA_PREFIX}${slug}/${variantId}.mp3`,
    timing: `${CHANT_MEDIA_PREFIX}${slug}/${variantId}.json`,
  };
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

/** Which lines go under each sung line. */
export type WordsPrefs = { translit: boolean; en: boolean };

/** The lines under a sung line, in order: transliteration, then English. */
export function subLines(line: ChantLine, prefs: WordsPrefs): string[] {
  const out: string[] = [];
  if (prefs.translit && line.translit) out.push(line.translit);
  if (prefs.en && line.en) out.push(line.en);
  return out;
}

/**
 * The live captions for a recording: the Church's words, each line timed by
 * the recording's timing file. The timing file's own text is only a check
 * (the data test holds the two line for line); what is shown is always the
 * data file's words. Without a timing file the captions have no times, and
 * Now Playing simply shows the picture.
 */
export function captionsFor(lines: ChantLine[], timing: ChantTiming | null, prefs: WordsPrefs): CaptionSource {
  const timed = timing && timing.lines.length === lines.length ? timing.lines : null;
  return lines.map((line, i) => {
    const sub = subLines(line, prefs);
    return {
      ...(timed ? { time: timed[i].at, end: timed[i].end } : {}),
      text: line.text,
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
