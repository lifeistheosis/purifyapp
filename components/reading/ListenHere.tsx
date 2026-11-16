"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ReaderPill } from "@/components/bible/ReaderPill";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Headphones } from "@/components/ui/icons/Headphones";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { sentenceOnPage, startListening } from "@/lib/listen/play";
import { listenOfSrc, listenTimings, readingAt, stepsOf, useHasListen } from "@/lib/listen/recordings";
import { listenHref, parseListenId, type ListenTimings } from "@/lib/listen/texts";
import { lineBoxes, type Box } from "@/lib/marks/dom";
import { fromStart, readsRtl } from "@/lib/marks/startEdge";
import { currentTimeNow, pause, play, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { goToReadingPlace, inReadingZone, visibleBand } from "@/lib/ui/readingPlace";
import { cn } from "@/lib/cn";
import { registerListen, type ListenOnPage } from "@/lib/listen/onPage";

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
 *
 * Heart's recording is the only voice (his word of 2026-11-16, about 22:35
 * UTC: "remove locally LLM voices ... only leave one the standard prerecorded
 * voices"): the phone's own voices, which read a text with no recording from
 * build 95 note 25, are gone, so a text Heart has not recorded has no Listen
 * until its recording lands. Never on the prayers: no prayer page draws it.
 */
export function ListenHere({ id, title, by, art, className }: { id: string; title: string; by: string; art?: string | null; className?: string }) {
  const { t } = useTranslate();
  const listen = useListenText({ id, title, by, art });
  const { loaded, playing, busy, tap } = listen;
  const router = useRouter();

  // What Listen reads here, for the foot pill on a phone and a tablet
  // (lib/listen/onPage.ts, build 98 note 2): there Listen stands in the pill,
  // beside the sound, as a chapter's does, and not in the page.
  useEffect(() => registerListen({ id, title, by, art }), [id, title, by, art]);

  // A recording read to its end goes on into the next part, as a chapter's
  // reading does: the next part's recording starts, then its page opens.
  const ended = loaded && !playing && listen.duration > 0 && listen.currentTime >= listen.duration - 0.3;
  useEffect(() => {
    if (!ended) return;
    const { next } = stepsOf(id);
    const ref = next ? parseListenId(next) : null;
    if (!next || !ref) return;
    void startListening(next).then((began) => {
      if (began) router.push(listenHref(ref));
    });
  }, [ended, id, router]);

  if (!listen.available) return null;

  let mark = <Headphones size={16} className="shrink-0" />;
  if (playing) mark = <Pause size={15} className="shrink-0" />;
  else if (loaded) mark = <Play size={15} className="shrink-0" />;

  return (
    <>
      {/* The word on it says what a tap does, so it carries no pressed state.
          On a computer only: a phone and a tablet listen from the foot pill
          (MobileWorkPill, TextPill), where the pill stands (md:hidden
          native-md-flex), so no Listen button stands in the page there. */}
      <ReaderPill onClick={tap} className={cn("hidden md:inline-flex native-md-hidden", className)} data-listen-here={id}>
        {mark}
        <span className={busy ? "motion-safe:animate-pulse" : undefined}>{playing ? t("readAloud.pause") : t("readAloud.listen")}</span>
      </ReaderPill>
      {playing ? <ListenFollow id={id} /> : null}
    </>
  );
}

/**
 * Listen on a text, for the page's button on a computer and the foot pill's
 * on a phone and a tablet (MobileWorkPill, TextPill, ReaderDock): whether it
 * may read (only where Heart's recording of it is, lib/listen/recordings.ts),
 * whether it is the one loaded and playing, and the tap, which plays and
 * pauses what is loaded or starts its recording.
 */
export function useListenText(text: ListenOnPage | null) {
  const id = text?.id ?? "";
  const recorded = useHasListen(text?.id ?? null);
  const available = Boolean(text) && recorded;
  const audio = usePersistentAudio();
  const loaded = Boolean(text) && listenOfSrc(audio.src)?.id === id;
  const playing = loaded && audio.playing;
  const [busy, setBusy] = useState(false);

  const tap = async () => {
    if (!text) return;
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    if (!recorded) return;
    setBusy(true);
    await startListening(id, { title: text.title, by: text.by, art: text.art });
    setBusy(false);
  };

  return { available, loaded, playing, busy, tap, duration: audio.duration, currentTime: audio.currentTime };
}

/**
 * Listen in a text's foot pill, beside the sound (MobileWorkPill, TextPill):
 * the Bible's own pill button (components/bible/ReadAloud.tsx,
 * ReadAloudPillButton), white and softly lit, Pause while it plays.
 */
export function ListenPillButton({ text }: { text: ListenOnPage | null }) {
  const { t } = useTranslate();
  const { available, playing, busy, tap } = useListenText(text);
  if (!available) return null;
  const word = playing ? t("readAloud.pause") : t("readAloud.listen");
  return (
    <button
      type="button"
      data-listen-pill={text?.id}
      onClick={tap}
      aria-label={word}
      className="reader-lit tap-press hit-44 ms-1 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-paper px-3 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper min-[390px]:px-4"
    >
      {playing ? <Pause size={14} className="shrink-0" /> : <Play size={14} className={cn("shrink-0", busy && "motion-safe:animate-pulse")} />}
      <span aria-hidden className="max-[390px]:hidden">
        {word}
      </span>
    </button>
  );
}

/** A line of the sentence being read, with how far it stands from the page's start edge. */
type Washed = Box & { start: number };

/**
 * The sentence's lines, each placed from the page's start edge (inset-inline-start), so the wash
 * turns round with the page in Arabic as the words do (lib/marks/startEdge.ts).
 */
function washOf(lines: Box[]): Washed[] {
  if (!lines.length) return [];
  const width = document.documentElement.clientWidth;
  const rtl = readsRtl(document.body);
  return lines.map((b) => ({ ...b, start: fromStart(b, width, rtl) }));
}

/** Lights the paragraph being read, washes its sentence, and keeps it at the reading place. */
function ListenFollow({ id }: { id: string }) {
  const timings = useRef<ListenTimings | null>(null);
  const lastHand = useRef(0);
  const [wash, setWash] = useState<Washed[]>([]);

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
        setWash(here?.span ? washOf(lineBoxes(here.textEl, here.span)) : []);
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
    <div aria-hidden className="pointer-events-none absolute start-0 top-0 z-[5] h-0 w-0">
      {wash.map((b, i) => (
        <div key={i} className="verse-ghost absolute rounded-[5px]" style={{ insetInlineStart: b.start - 3, top: b.top, width: b.right - b.left + 6, height: b.bottom - b.top }} />
      ))}
    </div>,
    document.body,
  );
}
