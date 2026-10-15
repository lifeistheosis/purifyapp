"use client";

// Read-aloud with follow-along (1.7, the owner's "Do all of these" of
// 2026-10-15). On a chapter that has a reading, a Listen button under its
// title plays it through the app's one player (the mini player and Now
// Playing show it, the verses as live captions), and while it plays the
// verse being read is lit in the chapter and kept in view, unless the reader
// has just scrolled away to look at something else. lib/readAloud/chapters.ts
// says which chapters have a reading.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { nextChapter } from "@/lib/bible/books";
import { hasReadAloud, readAloudManifest, readAloudSrc, verseAt, type ReadAloudManifest } from "@/lib/readAloud/chapters";
import { currentTimeNow, pause, play, setLoopMode, setTrack, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

/** After the reader scrolls, the reading lets them look for this long. */
const HANDS_OFF_MS = 4000;
/** The chapter a reading that just ended rolls on into. */
const NEXT_KEY = "purify:readAloud.next";

/** Load a chapter's reading into the player and play it. */
async function startReading(book: string, chapter: number, title: string, artist: string): Promise<void> {
  const manifest = await readAloudManifest(book, chapter);
  setTrack(readAloudSrc(book, chapter), {
    title,
    artist,
    art: "/sections/bible.jpg",
    captions: manifest?.verses.map((v) => ({ time: v.at, text: v.text ?? "" })),
  });
  setLoopMode("off");
  play();
}

function useThisChapter(book: string, chapter: number) {
  const audio = usePersistentAudio();
  const src = readAloudSrc(book, chapter);
  const loaded = Boolean(audio.src && audio.src.endsWith(src));
  return { audio, src, loaded, playing: loaded && audio.playing };
}

export function ListenButton({ book, chapter, bookName }: { book: string; chapter: number; bookName: string }) {
  const { t } = useTranslate();
  const { loaded, playing } = useThisChapter(book, chapter);
  const [busy, setBusy] = useState(false);
  if (!hasReadAloud(book, chapter)) return null;

  const start = async () => {
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    setBusy(true);
    await startReading(book, chapter, `${t(`bible.books.${book}`) || bookName} ${chapter}`, t("readAloud.by"));
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={start}
      aria-pressed={playing}
      className="tap-press mt-4 inline-flex h-11 items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.04] pl-3 pr-4 font-sans text-caption font-semibold text-paper/90"
    >
      {playing ? (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <rect x="3" y="14" width="5" height="7" rx="2" />
          <rect x="16" y="14" width="5" height="7" rx="2" />
        </svg>
      )}
      <span className={busy ? "animate-pulse" : undefined}>{playing ? t("readAloud.pause") : t("readAloud.listen")}</span>
    </button>
  );
}

/** Lights the verse being read and keeps it in view. Draws nothing itself. */
export function ReadAloudFollow({ book, chapter }: { book: string; chapter: number }) {
  const { t } = useTranslate();
  const router = useRouter();
  const { audio, loaded, playing } = useThisChapter(book, chapter);
  const manifest = useRef<ReadAloudManifest | null>(null);
  const lastHand = useRef(0);

  // Arriving from a reading that ended: this chapter's reading goes on.
  useEffect(() => {
    let waiting: string | null = null;
    try {
      waiting = window.sessionStorage.getItem(NEXT_KEY);
      if (waiting === `${book}/${chapter}`) window.sessionStorage.removeItem(NEXT_KEY);
    } catch {
      return;
    }
    if (waiting === `${book}/${chapter}` && hasReadAloud(book, chapter)) {
      void startReading(book, chapter, `${t(`bible.books.${book}`)} ${chapter}`, t("readAloud.by"));
    }
  }, [book, chapter, t]);

  // The reading ended at its last verse: on into the next chapter, if it has one.
  const ended = loaded && !audio.playing && audio.duration > 0 && audio.currentTime >= audio.duration - 0.3;
  useEffect(() => {
    if (!ended) return;
    const next = nextChapter(book, chapter);
    if (!next || !hasReadAloud(next.slug, next.chapter)) return;
    try {
      window.sessionStorage.setItem(NEXT_KEY, `${next.slug}/${next.chapter}`);
    } catch {
      return;
    }
    router.push(`/bible/${next.slug}/${next.chapter}`);
  }, [ended, book, chapter, router]);

  useEffect(() => {
    if (!hasReadAloud(book, chapter)) return;
    let alive = true;
    void readAloudManifest(book, chapter).then((m) => {
      if (alive) manifest.current = m;
    });
    const hand = () => {
      lastHand.current = performance.now();
    };
    window.addEventListener("wheel", hand, { passive: true });
    window.addEventListener("touchmove", hand, { passive: true });
    return () => {
      alive = false;
      window.removeEventListener("wheel", hand);
      window.removeEventListener("touchmove", hand);
    };
  }, [book, chapter]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let lit: HTMLElement | null = null;
    const light = (el: HTMLElement | null) => {
      if (lit === el) return;
      if (lit) {
        lit.style.backgroundColor = "";
        lit.style.boxShadow = "";
      }
      lit = el;
      if (!el) return;
      el.style.backgroundColor = "color-mix(in srgb, var(--color-paper) 7%, transparent)";
      el.style.boxShadow = "inset 3px 0 0 color-mix(in srgb, var(--color-paper) 55%, transparent)";
      if (performance.now() - lastHand.current > HANDS_OFF_MS) {
        const r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight * 0.72) {
          el.scrollIntoView({ block: "center", behavior: document.documentElement.dataset.motion === "reduce" ? "auto" : "smooth" });
        }
      }
    };
    const loop = () => {
      const m = manifest.current;
      if (m) {
        const n = verseAt(m, currentTimeNow());
        light(n ? document.getElementById(`v${n}`) : null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      light(null);
    };
  }, [playing]);

  return null;
}
