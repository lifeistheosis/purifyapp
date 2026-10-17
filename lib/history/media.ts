import { SITE_URL } from "@/lib/site";

import type { HistoryEventMeta } from "./events";

/**
 * An event's picture, and where it is loaded from (1.7).
 *
 * The owner wants photos for History (note 20 of 2026-10-16), one for every
 * event and free for every reader. The apps' bundle is at its 85 MB packed
 * ceiling, so the pictures live on the website alone, under /history/media/,
 * the way the chants and the read-aloud covers do (lib/media/streamed.ts lists
 * every such folder): the native build sets the folder aside
 * (scripts/native-build.mjs), the website lets the apps' origins read it
 * (next.config.ts), and the apps ask SITE_URL for it. With no signal the
 * picture is simply absent and the account stands alone
 * (components/history/EventPlate.tsx).
 *
 * The folder is public/history/media/. A replaced picture gets a new name
 * (nicaea.v2.jpg): the website lets the apps keep a picture for a day.
 */
export const HISTORY_MEDIA_ROOT = "/history/media/";

/** What a plate draws: the picture's address, its shape and pixels, and its credit. */
export type EventPicture = {
  src: string;
  shape: "wide" | "whole";
  width: number;
  height: number;
  focus?: string;
  alt: string;
  /** "work · artist · licence", printed inside the plate's foot. */
  credit: string;
};

/**
 * The address to load, decided by the build on the server: the website's own
 * file on the website, the website's address in the apps (`native` is
 * IS_STATIC_EXPORT, which only a server file can read). Deciding it at build
 * time writes the same address into the page and its payload, so nothing
 * changes between the first paint and hydration. On the client, where the
 * device is known, lib/media/streamed.ts's streamedUrl gives the same answer;
 * lib/history/__tests__/media.test.ts holds the two together.
 */
export function historyMediaSrc(path: string, native: boolean): string {
  return native && path.startsWith(HISTORY_MEDIA_ROOT) ? `${SITE_URL}${path}` : path;
}

/** The credit line every picture carries, in the form the plates print. */
export function creditLine(m: { work: string; artist: string; license: string }): string {
  return `${m.work} · ${m.artist} · ${m.license}`;
}

/** The event's one picture as a plate draws it, or null when it has none. */
export function eventPicture(meta: HistoryEventMeta, native: boolean): EventPicture | null {
  const m = meta.media;
  if (!m) return null;
  return {
    src: historyMediaSrc(m.hero, native),
    shape: m.shape,
    width: m.width,
    height: m.height,
    ...(m.focus ? { focus: m.focus } : {}),
    alt: m.alt,
    credit: creditLine(m),
  };
}

/** The event's further pictures (Immersive History, Plus), each shown whole. */
export function eventGallery(meta: HistoryEventMeta, native: boolean): EventPicture[] {
  return (meta.media?.gallery ?? []).map((g) => ({
    src: historyMediaSrc(g.src, native),
    shape: "whole",
    width: g.width,
    height: g.height,
    alt: g.alt,
    credit: creditLine(g),
  }));
}
