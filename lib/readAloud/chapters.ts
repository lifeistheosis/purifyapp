import available from "@/data/readAloud/index.json";

/**
 * Read-aloud (1.7): a chapter read by a voice, verse by verse, each verse's
 * start and end known, so the reader lights the verse being read
 * (components/bible/ReadAloudFollow.tsx). The audio and its timings are made
 * ahead by Homebase/tools/tts-bakeoff/chapter_audio.py and shipped under
 * public/audio/read/<book>/<chapter>.{mp3,json}; data/readAloud/index.json
 * lists the chapters that have one.
 *
 * Free for every reader with one voice; Premium gets every voice (the
 * owner's word of 2026-10-15). Which voice is his pick on the voice page;
 * until then John 1 is read by a demo voice.
 */
export type ReadAloudVerse = { n: number; at: number; end: number; text?: string };
export type ReadAloudManifest = { voice: string; seconds: number; verses: ReadAloudVerse[] };

const CHAPTERS: ReadonlySet<string> = new Set(available as string[]);

export function hasReadAloud(book: string, chapter: number): boolean {
  return CHAPTERS.has(`${book}/${chapter}`);
}

export function readAloudSrc(book: string, chapter: number): string {
  return `/audio/read/${book}/${chapter}.mp3`;
}

const manifests = new Map<string, Promise<ReadAloudManifest | null>>();

export function readAloudManifest(book: string, chapter: number): Promise<ReadAloudManifest | null> {
  const key = `${book}/${chapter}`;
  let p = manifests.get(key);
  if (!p) {
    p = fetch(`/audio/read/${book}/${chapter}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<ReadAloudManifest>) : null))
      .catch(() => null);
    manifests.set(key, p);
  }
  return p;
}

/**
 * The verse being read at a moment: the last whose start has passed. The
 * pause after a verse still belongs to it.
 */
export function verseAt(manifest: ReadAloudManifest, t: number): number | null {
  let found: number | null = null;
  for (const v of manifest.verses) {
    if (v.at <= t + 0.05) found = v.n;
    else break;
  }
  return found;
}
