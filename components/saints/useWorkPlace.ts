"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { arrivalPlace, clearPosition, loadPosition, placeOfHash, savePosition, type WorkPlace } from "@/lib/reader/position";
import { recordProgress } from "@/lib/reading/progress";
import type { SectionHead } from "@/lib/saints/parts";
import { elementOfPlace, paragraphAtReadingPlace } from "@/lib/saints/paragraphInView";
import { inputSince, watchInput } from "@/lib/ui/lastInput";
import { untilSettled } from "@/lib/ui/routeMotion";
import { watchOwnScroll } from "@/lib/ui/ownScroll";
import { goToReadingPlace } from "@/lib/ui/readingPlace";

/**
 * Which chapter of a long text is on the page, where a return lands, and the
 * place kept as the reader reads (1.8, round 6, the owner's pick A of r3-29
 * and his note 79). Shared by a Father's work (components/saints/
 * WritingReader.tsx) and a council's document (components/councils/
 * CouncilReader.tsx), which read one chapter at a time as the Bible does.
 *
 * Which chapter: the address's (#sN, #p-N-I, #at-1.1.1), else the kept place
 * (lib/reader/position.ts), else the first. It is an external store, so the
 * server's answer (the first chapter) and the device's need no effect
 * between them. An address naming a place wins and is remembered, so an
 * address that names something else (#source) leaves the chapter where it
 * is; with none, the chapter the text opened on, read once as it opens.
 */

/** An address that names a place in a text: a chapter, a paragraph, a place by the edition's numbers. */
export const PLACE_HASH = /^#(?:s\d+|p-\d+-\d+|at-\d+(?:\.\d+)*)$/;

const lastAddress = new Map<string, string>();
const opening = new Map<string, string>();

function subscribeHash(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function targetNow(owner: string, slug: string): string {
  const key = `${owner}/${slug}`;
  const hash = window.location.hash;
  if (PLACE_HASH.test(hash)) {
    lastAddress.set(key, hash);
    return hash;
  }
  const last = lastAddress.get(key);
  if (hash && last) return last;
  if (!opening.has(key)) {
    const pos = loadPosition(owner, slug);
    opening.set(key, pos ? `kept:${pos.sectionN}:${pos.paragraph}` : "first");
  }
  return opening.get(key)!;
}

/** The place the page is asked for: an address ("#s12"), the kept place ("kept:12:3"), or "first". */
export function useChapterTarget(owner: string, slug: string): string {
  const target = useSyncExternalStore(subscribeHash, () => targetNow(owner, slug), () => "first");
  const key = `${owner}/${slug}`;
  // The text opened on, read afresh the next time it opens.
  useEffect(
    () => () => {
      lastAddress.delete(key);
      opening.delete(key);
    },
    [key],
  );
  return target;
}

/**
 * The chapter a target names, as far as it can be said before the text is
 * read: its number; the book's first for a book opened at its beginning; and
 * for a place by the edition's numbers (#at-1.1.1), which only the text can
 * turn into a chapter, the address itself.
 */
export function chapterNamed(target: string, first: number): string {
  if (target === "first") return String(first);
  const kept = /^kept:(\d+):\d+$/.exec(target);
  if (kept) return kept[1];
  const place = placeOfHash(target);
  return place ? String(place.sectionN) : target;
}

const openedOn = new Map<string, string>();

function onOpeningNow(owner: string, slug: string, first: number): boolean {
  const key = `${owner}/${slug}`;
  const chapter = chapterNamed(targetNow(owner, slug), first);
  if (!openedOn.has(key)) openedOn.set(key, chapter);
  return openedOn.get(key) === chapter;
}

/**
 * Whether the page stands on the chapter the book was opened on (1.9): where
 * the book's cover stands, at the head of the page a reader opens
 * (components/reading/OpeningCover.tsx). True as the page opens, whatever it
 * opens on, so the cover is on the page for a tile's picture to travel into;
 * false once the reader turns to another chapter, which opens as a chapter
 * does; true again whenever that first chapter is the one on the page, by
 * the way back or by the pill, so a step back finds the page as it was left.
 *
 * It reads the address and the kept place, never the text: in the apps the
 * text arrives after the page (components/saints/LazyWritingReader.tsx), and
 * the cover has to be there before it. `first` is the number of the book's
 * first chapter, which the page knows.
 */
export function useOnOpening(owner: string, slug: string, first: number): boolean {
  const here = useSyncExternalStore(
    subscribeHash,
    () => onOpeningNow(owner, slug, first),
    () => true,
  );
  const key = `${owner}/${slug}`;
  // Read afresh the next time the book opens. The place it opened on goes
  // too: this is on the page before the text, and a reader who leaves before
  // the text has come would otherwise leave it behind for the next visit.
  useEffect(
    () => () => {
      openedOn.delete(key);
      lastAddress.delete(key);
      opening.delete(key);
    },
    [key],
  );
  return here;
}

/**
 * The chapter a target opens, and the paragraph it lands on (null: the
 * chapter's top). `findAt` answers a place by the edition's numbers.
 */
export function chapterOf(
  target: string,
  sections: readonly { n: number }[],
  findAt?: (at: string) => { n: number; i: number } | null,
): { n: number; paragraph: number | null } {
  const has = (n: number) => sections.some((s) => s.n === n);
  const first = sections[0]?.n ?? 1;
  const kept = /^kept:(\d+):(\d+)$/.exec(target);
  if (kept) return has(Number(kept[1])) ? { n: Number(kept[1]), paragraph: Number(kept[2]) } : { n: first, paragraph: null };
  const at = /^#at-(\d+(?:\.\d+)*)$/.exec(target);
  if (at) {
    const found = findAt?.(at[1]) ?? null;
    return found ? { n: found.n, paragraph: found.i } : { n: first, paragraph: null };
  }
  const place = placeOfHash(target);
  if (place && has(place.sectionN)) return { n: place.sectionN, paragraph: place.paragraph };
  return { n: first, paragraph: null };
}

/** Another chapter, by its address: the page turns, and the way back returns. */
export function useGoToChapter(): (n: number) => void {
  return useCallback((n: number) => {
    window.location.hash = `#s${n}`;
  }, []);
}

/**
 * As a chapter opens, the place is kept as the Bible keeps its verse (note
 * 68; arrivalPlace): the paragraph an address lands on, or the reader's own
 * paragraph when the address names the chapter they are in, or the
 * chapter's top. A paragraph past the first is stood at the reading place
 * and the rest of the chapter steps back for two seconds (globals.css,
 * data-place-focus), smooth on the motion switch; a chapter's top is the top
 * of the page. A reader who has already started on their own is left where
 * they are (lib/ui/lastInput.ts): in the apps the text lands a moment after
 * the page opens. A landing that moves the page waits until the page has
 * arrived (1.9): the book opens on its cover, and then goes to the place.
 */
export function useLanding(
  owner: string,
  slug: string,
  target: string,
  at: { n: number; paragraph: number | null },
  openedAt?: number,
): void {
  useEffect(() => {
    const opened = openedAt ?? performance.now();
    watchInput();
    const saved = loadPosition(owner, slug);
    const savedPlace: WorkPlace | null = saved ? { sectionN: saved.sectionN, paragraph: saved.paragraph } : null;
    const byAddress = PLACE_HASH.test(target);
    const place: WorkPlace = target.startsWith("#s")
      ? arrivalPlace(savedPlace, { sectionN: at.n, paragraph: null })!
      : { sectionN: at.n, paragraph: at.paragraph ?? 0 };
    // An address is kept at once: the glide to it is not the reader's scroll.
    if (byAddress) savePosition(owner, slug, place.sectionN, place.paragraph);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let wait: ReturnType<typeof setTimeout> | null = null;
    let frame = 0;
    const land = () => {
      wait = null;
      frame = requestAnimationFrame(() => {
        if (!byAddress && inputSince(opened)) return;
        const el = place.paragraph > 0 ? elementOfPlace(place) : null;
        if (!el || el.id === `s${place.sectionN}`) {
          window.scrollTo({ top: 0, behavior: "instant" });
          return;
        }
        goToReadingPlace(el);
        const root = document.documentElement;
        el.setAttribute("data-focus", "true");
        root.setAttribute("data-place-focus", "");
        timer = setTimeout(() => {
          el.removeAttribute("data-focus");
          root.removeAttribute("data-place-focus");
        }, 2000);
      });
    };
    // A landing that moves the page waits for the page to have arrived (1.9,
    // lib/ui/routeMotion.ts, untilSettled): the book opens on its cover, which
    // a tile's picture is still travelling to, and then goes down to the
    // reader's paragraph. A chapter's top moves nothing and does not wait; nor
    // does a page that was not pictured arriving (motion off, a chapter
    // turned inside the book).
    const settle = place.paragraph > 0 ? untilSettled() : 0;
    if (settle > 0) wait = setTimeout(land, settle);
    else land();
    return () => {
      if (wait) clearTimeout(wait);
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      document.documentElement.removeAttribute("data-place-focus");
    };
    // Only a new address or a new chapter lands; the reader's own reading never does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, owner, slug]);
}

/**
 * Keep the place as the reader reads: the paragraph over the reading line,
 * written only for the reader's own scroll (a finger and its fling, a wheel,
 * a key, the scroll bar), at most once each 750ms, and the last one never
 * lost (it lands on a timer, as the page is hidden, or as the text goes).
 * Read past the end of the text's last paragraph and the place is let go, so
 * the next visit starts at the beginning. A Father's work writes the reading
 * room's progress with it (lib/reading/progress.ts), under `progressKey`.
 */
export function useKeepPlace(
  owner: string,
  slug: string,
  sections: readonly { n: number }[],
  progressKey: string | null,
  /** The chapter's name, for the Continue rows (lib/saints/parts.ts). */
  pillOf?: (n: number) => SectionHead["pill"] | undefined,
): void {
  useEffect(() => {
    const of = sections.length;
    let lastWrite = 0;
    let pending: WorkPlace | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let frame = 0;
    let own = false;
    let written = "";

    function write(p: WorkPlace) {
      lastWrite = Date.now();
      pending = null;
      written = `${p.sectionN}:${p.paragraph}`;
      savePosition(owner, slug, p.sectionN, p.paragraph);
      const i = sections.findIndex((x) => x.n === p.sectionN);
      if (progressKey && i >= 0) recordProgress(progressKey, { n: p.sectionN, i, of, pill: pillOf?.(p.sectionN) });
    }
    function persist(p: WorkPlace) {
      if (`${p.sectionN}:${p.paragraph}` === written && pending === null) return;
      pending = p;
      if (Date.now() - lastWrite >= 750) write(p);
      else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          if (pending) write(pending);
        }, 750);
      }
    }
    function flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (pending) write(pending);
    }
    function onFrame() {
      frame = 0;
      if (!own) return;
      own = false;
      const place = paragraphAtReadingPlace();
      if (!place) return;
      if (place.past) {
        // Finished: the next visit starts at the beginning, and the book is read.
        if (timer) clearTimeout(timer);
        timer = null;
        pending = null;
        written = "past";
        clearPosition(owner, slug);
        const last = sections[of - 1];
        if (progressKey && last) recordProgress(progressKey, { n: last.n, i: of - 1, of, pill: pillOf?.(last.n) });
        return;
      }
      persist({ sectionN: place.sectionN, paragraph: place.paragraph });
    }
    function onScroll(isOwn: boolean) {
      if (isOwn) own = true;
      if (!frame) frame = requestAnimationFrame(onFrame);
    }
    function onHide() {
      if (document.visibilityState === "hidden") flush();
    }
    const stop = watchOwnScroll(onScroll);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      stop();
      cancelAnimationFrame(frame);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      // The reader's last place, if its write was still waiting.
      flush();
    };
  }, [owner, slug, sections, progressKey, pillOf]);
}
