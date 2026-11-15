// What Listen would read on the page shown (1.9, build 98 note 2, the
// owner's "make the listen system the same as the Bible listening system
// (UI/ux) one so there isn't a floating button"). On a phone and a tablet a
// text read aloud listens from its foot pill, as a chapter of the Bible does
// (components/bible/MobileChapterPill.tsx), and no Listen button stands in
// the page. The page's own Listen (components/reading/ListenHere.tsx) says
// here what it would read, and the pill (components/saints/MobileWorkPill.tsx,
// components/reading/TextPill.tsx) offers it.
//
// Keyed by the text's listen id (lib/listen/texts.ts). A council mounts every
// section and a study every part, only the one being read shown, so a page
// can hold several: the pill takes the one for the part it shows (listenFor).

import { useSyncExternalStore } from "react";

import { parseListenId } from "@/lib/listen/texts";

export type ListenOnPage = { id: string; title: string; by: string; art?: string | null };

let entries: readonly ListenOnPage[] = [];
const listeners = new Set<() => void>();
const NONE: readonly ListenOnPage[] = [];

function changed(): void {
  for (const listener of listeners) listener();
}

/** The page's Listen says what it would read, until it goes. */
export function registerListen(entry: ListenOnPage): () => void {
  entries = [...entries.filter((e) => e.id !== entry.id), entry];
  changed();
  return () => {
    const before = entries.length;
    entries = entries.filter((e) => e !== entry);
    if (entries.length !== before) changed();
  };
}

/** What Listen would read on the page shown, now. */
export function entriesNow(): readonly ListenOnPage[] {
  return entries;
}

/** What Listen would read on the page shown. */
export function useListenOnPage(): readonly ListenOnPage[] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    entriesNow,
    () => NONE,
  );
}

/**
 * The text Listen reads for the part shown: the one whose part is `n` where
 * the page holds several (a council's sections, a study's parts), else the
 * page's one text. None where the page has nothing to read.
 */
export function listenFor(on: readonly ListenOnPage[], n?: number): ListenOnPage | null {
  if (n !== undefined) {
    const here = on.find((e) => {
      const ref = parseListenId(e.id);
      return ref !== null && "n" in ref && ref.n === n;
    });
    if (here) return here;
    if (on.length > 1) return null;
  }
  return on[0] ?? null;
}

/** For tests. */
export function forgetListenOnPage(): void {
  entries = [];
  changed();
}
