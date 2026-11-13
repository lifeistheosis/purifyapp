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
import { anchorsOf, rememberAnchors } from "@/lib/listen/speech/pageText";
import { openVoiceSheet } from "@/lib/listen/speech/sheet";
import { speakText, voiceFor } from "@/lib/listen/speech/speak";
import { spokenOf, spokenTextSrc, voiceLang } from "@/lib/listen/speech/spoken";
import { wordStarts } from "@/lib/listen/speech/timeline";
import { useCanSpeak } from "@/lib/listen/speech/voices";
import { hostKeyOf, listenHref, parseListenId, type ListenRef, type ListenTimings } from "@/lib/listen/texts";
import { sentenceSpans } from "@/lib/marks/anchor";
import { lineBoxes, type Box } from "@/lib/marks/dom";
import { captionLines, lineAt } from "@/lib/player/captions";
import { currentTimeNow, getAudioSnapshot, pause, play, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
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
 *
 * From 1.9 (build 95 note 25, his "all recs" of 2026-11-13): where there is
 * no recording, the phone's own voice reads it, free for every reader, in the
 * language the page shows it in, from this part to the end of what the page
 * shows; and where the reader chose a phone's voice, it reads even a text
 * that has its recording. Where the phone has no voice for the language, the
 * Voice sheet says so and where one is added. Never on the prayers: no prayer
 * page draws it.
 */
export function ListenHere({ id, title, by, art, className }: { id: string; title: string; by: string; art?: string | null; className?: string }) {
  const { t } = useTranslate();
  const recorded = useHasListen(id);
  const speaks = useCanSpeak();
  const available = recorded || speaks;
  const audio = usePersistentAudio();
  const said = spokenOf(audio.src);
  const spokenHere = said?.kind === "text" && said.id === id;
  const loaded = listenOfSrc(audio.src)?.id === id || spokenHere;
  const playing = loaded && audio.playing;
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  // The recording ended at its last sentence: on into the next section or
  // part, if it has a recording, as a chapter rolls on into the next
  // (components/bible/ReadAloud.tsx). The page opens that part, so the reader
  // sees what is read.
  const ended = loaded && !spokenHere && !audio.playing && audio.duration > 0 && audio.currentTime >= audio.duration - 0.3;
  useEffect(() => {
    if (!ended) return;
    const { next } = stepsOf(id);
    const ref = next ? parseListenId(next) : null;
    if (!next || !ref) return;
    void startListening(next).then((began) => {
      if (began) router.push(listenHref(ref));
    });
  }, [ended, id, router]);

  if (!available) return null;

  const tap = async () => {
    if (loaded) {
      if (playing) pause();
      else play();
      return;
    }
    setBusy(true);
    const ref = parseListenId(id);
    const page = ref ? textOnPage(ref) : null;
    const lang = page?.lang ?? "en";
    const use = await voiceFor(voiceLang(lang), recorded);
    if (use.kind === "heart") await startListening(id, { title, by, art });
    else if (use.kind === "none") openVoiceSheet({ none: { lang: voiceLang(lang) } });
    else if (page?.pieces.length) {
      const src = spokenTextSrc(id, lang);
      const ok = await speakText({ src, pieces: page.pieces.map((p) => ({ text: p.text })), lang: voiceLang(lang), voice: use.voice, title, artist: by, art: art ?? undefined });
      if (ok) rememberAnchors(src, page.pieces.map((p) => p.anchor));
    }
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
      {playing ? spokenHere ? <SpokenFollow src={audio.src} /> : <ListenFollow id={id} /> : null}
    </>
  );
}

/**
 * The text a page shows from a part on, paragraph by paragraph, for the
 * phone's voice: each paragraph's words and where it stands (its mark,
 * components/reading/MarkHost.tsx), in the page's order, from the part Listen
 * stands over to the end of what the page shows; and the language the page
 * shows it in.
 */
function textOnPage(ref: ListenRef): { pieces: { text: string; anchor: string }[]; lang: string } | null {
  if (typeof document === "undefined") return null;
  const prefix = hostKeyOf(ref, { sectionN: 0, paragraphIdx: 0 }).replace(/\|0\|0$/, "|");
  const from = "n" in ref ? ref.n : 0;
  const pieces: { text: string; anchor: string }[] = [];
  let lang: string | null = null;
  for (const host of document.querySelectorAll<HTMLElement>("[data-mk]")) {
    const key = host.dataset.mk ?? "";
    if (!key.startsWith(prefix)) continue;
    const section = Number(key.slice(prefix.length).split("|")[0]);
    if (!(section >= from)) continue;
    const words = host.querySelector<HTMLElement>("[data-mk-text]");
    const text = (words?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;
    lang ??= words?.closest<HTMLElement>("[lang]")?.getAttribute("lang") ?? null;
    pieces.push({ text, anchor: key });
  }
  if (!pieces.length) return null;
  return { pieces, lang: lang || document.documentElement.lang || "en" };
}

/**
 * Lights the paragraph the phone's voice is reading, washes its sentence, and
 * keeps it at the reading place, as ListenFollow does for a recording: the
 * paragraph by the player's own lines, the sentence by the word the phone
 * reports, else by where the clock stands in the paragraph.
 */
function SpokenFollow({ src }: { src: string | null }) {
  const lastHand = useRef(0);
  const [wash, setWash] = useState<Box[]>([]);

  useEffect(() => {
    const hand = () => {
      lastHand.current = performance.now();
    };
    window.addEventListener("wheel", hand, { passive: true });
    window.addEventListener("touchmove", hand, { passive: true });
    return () => {
      window.removeEventListener("wheel", hand);
      window.removeEventListener("touchmove", hand);
    };
  }, []);

  useEffect(() => {
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
      const s = getAudioSnapshot();
      const lines = s.captions?.length ? captionLines(s.captions, s.duration) : [];
      const now = currentTimeNow();
      const i = lines.length ? lineAt(lines, now) : -1;
      const anchor = i >= 0 ? anchorsOf(src)?.[i] : undefined;
      const host = anchor ? document.querySelector<HTMLElement>(`[data-mk="${CSS.escape(anchor)}"]`) : null;
      const textEl = host?.querySelector<HTMLElement>("[data-mk-text]") ?? null;
      light(host);
      // The sentence: the word being said, where the phone reports words, else the clock's share of the paragraph.
      let span: { s: number; e: number } | null = null;
      if (textEl && i >= 0) {
        const text = textEl.textContent ?? "";
        const line = s.captions![i];
        const times = line.wordTimes;
        let char = 0;
        if (times?.length) {
          let w = 0;
          for (let k = 0; k < times.length; k++) if (times[k][0] <= now) w = k;
          char = wordStarts(line.text)[w] ?? 0;
        } else {
          const share = (now - lines[i].at) / Math.max(0.1, lines[i].end - lines[i].at);
          char = Math.floor(Math.max(0, Math.min(1, share)) * line.text.length);
        }
        const spans = sentenceSpans(text);
        span = spans.find((x) => char >= x.s && char < x.e) ?? null;
      }
      const key = span && i >= 0 ? `${i}:${span.s}:${window.innerWidth}` : "";
      if (key !== at) {
        at = key;
        setWash(span && textEl ? lineBoxes(textEl, span) : []);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      light(null);
    };
  }, [src]);

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
