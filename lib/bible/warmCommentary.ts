// A chapter's commentary, read while the reader is reading.
//
// In the apps the commentary is a file read the first time a verse's
// commentary is opened (lib/bible/chapterData.ts), and from 1.9 a note's
// words are cut out of the library work it quotes, so on the heaviest
// chapters that first tap read about 45 small files where it had read one:
// 1,138 ms on John 1 where it had been 641, six times slowed
// (docs/1.9-build/notes/optimization-fable.md, item 5). The owner asked for
// less lag, not more. So the chapter's commentary is read ahead, once the
// chapter has opened and settled and the phone has nothing else to do, and
// the tap finds it already read: chapterData keeps what it read.
//
// Never on the first paint: it waits SETTLE_MS and then for an idle moment.
// In the apps the files are in the bundle, so nothing goes over the network.
// Anywhere else (a browser, which normally has the commentary in the page and
// never comes here) it stays away when the reader asked to save data or is on
// a mobile connection, as far as the browser can tell.

import { loadChapterCommentary } from "./chapterData";

/** How long a chapter is left alone after it opens. */
export const SETTLE_MS = 1500;
/** The longest the idle wait may run before the read happens anyway. */
export const IDLE_LIMIT_MS = 4000;

type Connection = { saveData?: boolean; type?: string; effectiveType?: string };

/** Whether reading ahead would spend data the reader has not offered. */
export function wouldSpendData(native: boolean, connection: Connection | undefined): boolean {
  if (native) return false; // Read from the bundle, not from the network.
  if (!connection) return false;
  return connection.saveData === true || connection.type === "cellular" || /(^|-)2g$/.test(connection.effectiveType ?? "");
}

/**
 * Read the chapter's commentary ahead, after it has settled. Returns the way
 * to call it off (a reader who turned the page before it began).
 */
export function warmCommentaryWhenIdle(book: string, chapter: number, native: boolean): () => void {
  if (typeof window === "undefined") return () => {};
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (wouldSpendData(native, connection)) return () => {};
  let idle: number | undefined;
  const read = () => void loadChapterCommentary(book, chapter);
  const settle = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(read, { timeout: IDLE_LIMIT_MS });
    else read();
  }, SETTLE_MS);
  return () => {
    window.clearTimeout(settle);
    if (idle !== undefined && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
  };
}
