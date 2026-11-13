"use client";

import { shareOut, type ShareOutResult } from "@/lib/share/shareOut";
import { shareLink } from "@/lib/site";

/**
 * A work handed on (1.9, build 95 note 15). His word, 2026-11-13 about 07:50
 * UTC, with two screenshots of The Paschal Homily's sheets: "allow every
 * single work to be sharable by adding a share button here and here". Every
 * work of the Fathers and every council's document has the row in both of
 * its sheets (components/reading/ShareWorkRow.tsx): the contents, which
 * shares the work, and •••, which shares the part being read.
 *
 * What leaves the device is the work's title and its page on purifyapp.net,
 * built by the link the rest of the app shares with (lib/site.ts, shareLink):
 * never the app's own https://localhost, and nothing of the reader's, not
 * the address bar's query and not the paragraph they stopped at. The part
 * being read is the website's own address for it, #sN, which the readers
 * open as any quotation's link does (components/saints/useWorkPlace.ts).
 */
export type WorkShare = {
  /** The work's title: the share sheet's title. */
  title: string;
  /** What the message says beside the link: the title, and the part being read where there is more than one. */
  text: string;
  /** The work's page, and the part: "/saints/john-cassian/conferences#s12". */
  path: string;
};

/** The work's page, at the part being read when it has more than one part (`n`); its page alone otherwise. */
export function workPlacePath(page: string, n: number | null): string {
  return n === null ? page : `${page}#s${n}`;
}

/**
 * What the ••• sheet shares: the part being read, named as the sheet names it
 * ("Conference 10 · 10"); a work of one part is shared as itself.
 */
export function partShare(work: { title: string; page: string }, part: { n: number; label: string } | null): WorkShare {
  if (!part) return { title: work.title, text: work.title, path: work.page };
  return { title: work.title, text: part.label && part.label !== work.title ? `${work.title}, ${part.label}` : work.title, path: workPlacePath(work.page, part.n) };
}

/**
 * To the phone's own share sheet, by the app's one way to share (build 95
 * note 24, lib/share/shareOut.ts): in the apps the Share plugin, in a browser
 * that can share the Web Share sheet. Where there is neither, the link is
 * copied, and the row says so. A sheet closed without choosing is not a
 * failure, and nothing is copied then.
 */
export async function shareWork(share: WorkShare): Promise<ShareOutResult> {
  return shareOut({ title: share.title, text: share.text, url: shareLink(share.path) });
}
