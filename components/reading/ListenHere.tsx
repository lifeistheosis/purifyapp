"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ReaderPill } from "@/components/bible/ReaderPill";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { sentenceOnPage, startListening } from "@/lib/listen/play";
import { listenOfSrc, listenTimings, readingAt, useHasListen } from "@/lib/listen/recordings";
import { parseListenId, type ListenTimings } from "@/lib/listen/texts";
import { lineBoxes, type Box } from "@/lib/marks/dom";
import { currentTimeNow, pause, play, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { goToReadingPlace, inReadingZone, visibleBand } from "@/lib/ui/readingPlace";

/** After the reader scrolls, the reading lets them look for this long (the Bible's own, components/bible/ReadAloud.tsx). */
const HANDS_OFF_MS = 4000;

/**
 * Listen, on a text beside the Bible (1.9, the owner's word of 2026-11-10:
 * "make sure the Bible section, the saints' lives ... the ecumenical
 * councils, the theology section ... Even the history section, allow that to
 * be read out"): a saint's life, a section of a council's document, a part of
 * a study, an event's account.
 *
 * The Bible's Listen, through the same player: the reader's pill with
 * headphones and Listen, Pause while it plays, a play mark once paused. Drawn
 * only where the text has a recording (lib/listen/recordings.ts): on any
 * other text there is no button that does nothing.
 *
 * While it plays, the paragraph being read keeps its strength and the rest
 * step back, as a chapter's verses do, and the sentence being read is washed
 * the way a held verse is, line by line. The page's own words are used: the
 * recording's timings carry none.
 */
export function ListenHere({ id, title, by, art, className }: { id: string; title: string; by: string; art?: string | null; className?: string }) {
  const { t } = useTranslate();
  const available = useHasListen(id);
  const audio = usePersistentAudio();
  const loaded = listenOfSrc(audio.src)?.id === id;
  const playing = loaded && audio.playing;
  const [busy, setBusy] = useState(false);

  if (!available) return null;

  const tap = async () => {
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    setBusy(true);
    await startListening(id, { title, by, art });
    setBusy(false);
  };

  // Headphones before it has begun, the pause bars while it plays, a play mark once paused.
  let mark = <Headphones size={16} className="shrink-0" />;
  if (playing) mark = <Pause size={15} className="shrink-0" />;
  else if (loaded) mark = <Play size={15} className="shrink-0" />;

  return (
    <>
      {/* The word on it says what a tap does, so it carries no pressed state. */}
      <ReaderPill onClick={tap} className={className} data-listen-here={id}>
        {mark}
        <span className={busy ? "motion-safe:animate-pulse" : undefined}>{playing ? t("readAloud.pause") : t("readAloud.listen")}</span>
      </ReaderPill>
      {playing ? <ListenFollow id={id} /> : null}
    </>
  );
}

/** Lights the paragraph being read, washes its sentence, and keeps it at the reading place. */
function ListenFollow({ id }: { id: string }) {
  const timings = useRef<ListenTimings | null>(null);
  const lastHand = useRef(0);
  const [wash, setWash] = useState<Box[]>([]);

  useEffect(() => {
    let alive = true;
    void listenTimings(id).then((m) => {
      if (alive) timings.current = m;
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
  }, [id]);

  useEffect(() => {
    const ref = parseListenId(id);
    if (!ref) return;
    let raf = 0;
    let lit: HTMLElement | null = null;
    let at = "";
    const root = document.documentElement;
    const light = (el: HTMLElement | null) => {
      if (lit === el) return;
      if (lit) delete lit.dataset.readNow;
      lit = el;
      if (!el) {
        delete root.dataset.readAloud;
        return;
      }
      el.dataset.readNow = "";
      root.dataset.readAloud = "";
      if (performance.now() - lastHand.current > HANDS_OFF_MS) {
        const band = visibleBand();
        if (!inReadingZone(band, el.getBoundingClientRect())) goToReadingPlace(el, { band });
      }
    };
    const loop = () => {
      const m = timings.current;
      const now = m ? readingAt(m, currentTimeNow()) : null;
      const block = now && m ? m.blocks[now.block] : null;
      // Words read between two paragraphs (a heading, a quoted passage) light nothing; the last paragraph steps back with the rest.
      const here = block?.at && now ? sentenceOnPage(ref, block.at, now.sentence, block.s.length) : null;
      const key = here && now ? `${now.block}:${now.sentence}:${window.innerWidth}` : "";
      light(here?.host ?? null);
      if (key !== at) {
        at = key;
        setWash(here?.span ? lineBoxes(here.textEl, here.span) : []);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      light(null);
    };
  }, [id]);

  if (typeof document === "undefined" || !wash.length) return null;
  return createPortal(
    <div aria-hidden className="pointer-events-none absolute left-0 top-0 z-[5] h-0 w-0">
      {wash.map((b, i) => (
        <div key={i} className="verse-ghost absolute rounded-[5px]" style={{ left: b.left - 3, top: b.top, width: b.right - b.left + 6, height: b.bottom - b.top }} />
      ))}
    </div>,
    document.body,
  );
}
