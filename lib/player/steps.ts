import { nextChapter, prevChapter } from "@/lib/bible/books";
import { readingOfSrc } from "@/lib/readAloud/chapters";

/**
 * What the player is playing, and where it can go from there (1.8). The
 * owner's round 8 A drew previous and next either side of the controls,
 * "Read" under them and "•••" in the top bar (Homebase/boards/purify-master/
 * variants/08-player); they were left out of 1.8's first build because
 * nothing stood behind them, and went in with his "add everything we left
 * out" of 2026-10-28. Pure, so lib/player/__tests__/steps.test.ts holds every
 * rule; components/player/PlayerSteps.tsx and NowPlayingSheet.tsx draw them.
 *
 *  - A chapter of the Bible read aloud steps to the chapter before and after
 *    it, only where that chapter has a recording, as a reading that ends
 *    rolls on into the next chapter only where it has one
 *    (components/bible/ReadAloud.tsx). Matthew 1 has nothing before it and
 *    Revelation 22 nothing after, and there is no button where there is
 *    nothing to go to.
 *  - A chant steps to its version before and after, in the chant's own order,
 *    passing over a version that may not play now (lib/chants/live.ts).
 *  - Today's readings, heard one after another, step to the reading before
 *    and after (lib/readings/listen.ts), not out of them into the chapters.
 *  - Read opens the text being played where it has got to: the chapter at
 *    the verse being read, or the chant's page.
 */

/** The Bible read aloud: a chapter. A chant: its slug. */
export type Playing = { kind: "chapter"; book: string; chapter: number } | { kind: "chant"; slug: string } | null;

/**
 * Where a chant's recordings are kept: Purify's bucket since 1.8
 * (audio.purifyapp.net/chants/<slug>/<version>.mp3, lib/chants/media.ts), or
 * the website's /audio/chants/<slug>/<version>.mp3, its own in the apps.
 */
const CHANT_RECORDING = /(?:\/audio\/chants|\/\/audio\.purifyapp\.net\/chants)\/([a-z0-9-]+)\/[^/?#]+\.mp3(?:$|[?#])/;

/** A chant's row as the player needs it: its slug and its versions' recordings, in order. */
export type ChantRowLike<V extends ChantVersionLike = ChantVersionLike> = { slug: string; variants: readonly V[] };
export type ChantVersionLike = { id: string; audio: { src: string } };

/**
 * The chant row and version a recording is, from the chants library's index:
 * the address ends in the version's own (on the website it is that address;
 * in the apps the website's, lib/chants/media.ts). Null when it is no chant's.
 */
export function chantVersionOf<V extends ChantVersionLike, R extends ChantRowLike<V>>(
  src: string | null,
  rows: readonly R[] | null,
): { row: R; variant: V } | null {
  if (!src || !rows) return null;
  for (const row of rows) {
    for (const variant of row.variants) {
      if (src === variant.audio.src || src.endsWith(variant.audio.src)) return { row, variant };
    }
  }
  return null;
}

/**
 * What is playing, from the player's address: a chapter read aloud (the
 * bucket's or a saved copy, lib/readAloud/chapters.ts), or a chant, by the
 * library's index when it is at hand and else by where its recordings are
 * kept. Null for anything else.
 */
export function playingOf(src: string | null, chants: readonly ChantRowLike[] | null = null): Playing {
  if (!src) return null;
  const reading = readingOfSrc(src);
  if (reading) return { kind: "chapter", ...reading };
  const found = chantVersionOf(src, chants);
  if (found) return { kind: "chant", slug: found.row.slug };
  const m = CHANT_RECORDING.exec(src);
  return m ? { kind: "chant", slug: m[1] } : null;
}

export type ChapterRef = { book: string; chapter: number };

/**
 * The chapters either side of one read aloud, each only where it has a
 * recording (`has`, lib/readAloud/chapters.ts hasReadAloud): none before the
 * first chapter of the canon, none after the last, none where the next
 * chapter has not been read yet.
 */
export function chapterSteps(
  book: string,
  chapter: number,
  has: (book: string, chapter: number) => boolean,
): { previous: ChapterRef | null; next: ChapterRef | null } {
  const before = prevChapter(book, chapter);
  const after = nextChapter(book, chapter);
  return {
    previous: before && has(before.slug, before.chapter) ? { book: before.slug, chapter: before.chapter } : null,
    next: after && has(after.slug, after.chapter) ? { book: after.slug, chapter: after.chapter } : null,
  };
}

/**
 * A chant's versions either side of the one playing, in the chant's own
 * order, passing over any that may not play now (`playable`). None at the
 * ends, and none for a version the chant does not list.
 */
export function versionSteps<V extends { id: string }>(
  variants: readonly V[],
  current: string,
  playable: (variant: V) => boolean,
): { previous: V | null; next: V | null } {
  const at = variants.findIndex((v) => v.id === current);
  if (at < 0) return { previous: null, next: null };
  let previous: V | null = null;
  for (let i = at - 1; i >= 0 && !previous; i--) if (playable(variants[i])) previous = variants[i];
  let next: V | null = null;
  for (let i = at + 1; i < variants.length && !next; i++) if (playable(variants[i])) next = variants[i];
  return { previous, next };
}

/**
 * Where Read goes: the chapter, at the verse being read when it is known
 * (the chapter lands on it and lights it, components/bible/VerseFocusFlash),
 * or the chant's page, which shows and lights the version playing
 * (components/chants/ChantPage.tsx). Null for anything else: no Read.
 */
export function readHref(playing: Playing, verse?: number | null): string | null {
  if (!playing) return null;
  if (playing.kind === "chapter") {
    const at = typeof verse === "number" && verse > 0 ? `#v${verse}` : "";
    return `/bible/${playing.book}/${playing.chapter}${at}`;
  }
  return `/chants/${playing.slug}`;
}

/** What Share hands on: the page of what is playing, the chapter or the chant. */
export function shareHref(playing: Playing): string | null {
  if (!playing) return null;
  return playing.kind === "chapter" ? `/bible/${playing.book}/${playing.chapter}` : `/chants/${playing.slug}`;
}
