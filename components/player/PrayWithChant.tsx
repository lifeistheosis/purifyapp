"use client";

// Pray with chant (1.7): music under a prayer. The owner, 2026-10-15:
// "allow you to play it while you're praying ... if they're not listening to
// it while they're praying, have a small little pop-up ... would you like to
// listen to this with the chant ... they can choose which chants, and
// there's like previews, right? So you just click each chant and it previews
// like the best, most popular section".
//
// Three parts, all here so a prayer screen mounts one thing:
//   - a note button beside the rule's share and star, always there;
//   - the question, a small card at the foot of the screen, once a day at
//     most and only while nothing plays (lib/player/chantAsk.ts); it follows
//     the finger down to go away;
//   - the picker, a sheet: each chant with a preview of the part it is known
//     by, and "Play while I pray", which plays it on a loop with the mini
//     player above the tabs.

import { useCallback, useEffect, useRef, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { markAsked, setAskBeforePrayers, shouldAsk, useAskBeforePrayers } from "@/lib/player/chantAsk";
import { CHANTS, previewSrc, type Chant } from "@/lib/player/chants";
import { play, setLoopMode, setTrack, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

/** How long the page is read before the question comes, and how long it waits. */
const ASK_AFTER_MS = 1600;
const ASK_FOR_MS = 15000;

function NoteGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  );
}

// ---- the preview: one at a time, its own element, never the player's.
let previewEl: HTMLAudioElement | null = null;
function previewAudio(): HTMLAudioElement {
  if (!previewEl) {
    previewEl = new Audio();
    previewEl.preload = "none";
  }
  return previewEl;
}

function usePreview() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (previewEl) previewEl.pause();
    setPlayingId(null);
    setProgress(0);
  }, []);

  const start = useCallback(
    (chant: Chant) => {
      const a = previewAudio();
      cancelAnimationFrame(raf.current);
      a.pause();
      a.src = previewSrc(chant);
      const { from, to } = chant.preview;
      setPlayingId(chant.id);
      setProgress(0);
      a.play().catch(() => setPlayingId(null));
      const tick = () => {
        const done = (a.currentTime - from) / (to - from);
        setProgress(Math.max(0, Math.min(1, done)));
        // The fragment pauses the element at its end; so does a stop.
        if (a.paused && a.currentTime >= to - 0.25) {
          setPlayingId(null);
          setProgress(0);
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [],
  );

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    previewEl?.pause();
  }, []);

  return { playingId, progress, start, stop };
}

function PreviewRing({ progress }: { progress: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={2.5} />
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth={2.5} strokeDasharray={c} strokeDashoffset={c * (1 - progress)} strokeLinecap="round" />
    </svg>
  );
}

function ChantPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslate();
  const ask = useAskBeforePrayers();
  const audio = usePersistentAudio();
  const [chosen, setChosen] = useState<string>(CHANTS[0]?.id ?? "");
  const { playingId, progress, start, stop } = usePreview();

  const close = () => {
    stop();
    onClose();
  };

  const playChosen = () => {
    const chant = CHANTS.find((c) => c.id === chosen);
    if (!chant) return;
    stop();
    setTrack(chant.src, { title: t(chant.titleKey), artist: "Purify", art: chant.art, captions: chant.captions, rtl: chant.rtl });
    // Under a prayer it goes round until the reader stops it.
    setLoopMode("inf");
    play();
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={t("chant.button")} openFull desktop>
      <p className="font-sans text-detail leading-snug text-paper/65">{t("chant.sheet.body")}</p>

      <div role="radiogroup" aria-label={t("chant.button")} className="mt-4 space-y-2">
        {CHANTS.map((chant) => {
          const selected = chant.id === chosen;
          const previewing = playingId === chant.id;
          const now = Boolean(audio.src && audio.src.endsWith(chant.src) && audio.playing);
          return (
            <div
              key={chant.id}
              className={cn(
                "flex items-center gap-3 rounded-[16px] border p-2.5 transition-colors",
                selected ? "border-paper/30 bg-paper/[0.07]" : "border-paper/10 bg-paper/[0.02]",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChosen(chant.id)}
                className="tap-press flex min-h-11 min-w-0 flex-1 items-center gap-3 text-start"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
                <img src={chant.art} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-ui font-semibold text-paper">{t(chant.titleKey)}</span>
                  <span className="mt-0.5 block font-sans text-caption text-paper/55" dir="auto">
                    {chant.language}
                    {now ? ` · ${t("prayers.nowPlaying")}` : ""}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                    selected ? "border-paper bg-paper" : "border-paper/30",
                  )}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-night" /> : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => (previewing ? stop() : start(chant))}
                aria-label={previewing ? t("chant.stopPreview") : t("chant.preview", { title: t(chant.titleKey) })}
                className="tap-press relative grid h-11 w-11 shrink-0 place-items-center text-paper"
              >
                <span className="relative grid size-10 place-items-center">
                  <PreviewRing progress={previewing ? progress : 0} />
                  {previewing ? (
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]" aria-hidden>
                      <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={playChosen}
        className="tap-press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper font-sans text-ui font-semibold text-night"
      >
        <NoteGlyph size={18} />
        {t("chant.play")}
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={ask}
        onClick={() => setAskBeforePrayers(!ask)}
        className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 text-start"
      >
        <span className="font-sans text-detail text-paper/75">{t("chant.askBefore")}</span>
        <span
          aria-hidden
          className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", ask ? "bg-paper" : "bg-paper/20")}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full transition-transform",
              ask ? "translate-x-[18px] bg-night" : "translate-x-0.5 bg-paper/80",
            )}
          />
        </span>
      </button>
    </Sheet>
  );
}

/** The question at the foot of the screen. It follows the finger down. */
function AskCard({ onChoose, onDismiss }: { onChoose: () => void; onDismiss: () => void }) {
  const { t } = useTranslate();
  const [shown, setShown] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const away = window.setTimeout(onDismiss, ASK_FOR_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(away);
    };
  }, [onDismiss]);

  const move = (dy: number) => {
    if (card.current) card.current.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };

  return (
    <div className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-4">
      <div
        ref={card}
        role="dialog"
        aria-label={t("chant.ask.title")}
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, dy: 0 };
          if (card.current) card.current.style.transition = "none";
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          drag.current.dy = e.clientY - drag.current.y;
          move(drag.current.dy);
        }}
        onPointerUp={() => {
          const dy = drag.current?.dy ?? 0;
          drag.current = null;
          if (card.current) card.current.style.transition = "";
          if (dy > 56) onDismiss();
          else move(0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          if (card.current) card.current.style.transition = "";
          move(0);
        }}
        className={cn(
          "pointer-events-auto mx-auto flex max-w-md touch-none items-center gap-3 rounded-[18px] bg-night-soft p-3 shadow-[0_14px_34px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-paper/10",
          "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [:where([data-motion=reduce])_&]:transition-none",
          shown ? "opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-paper/[0.08] text-paper">
          <NoteGlyph size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-ui font-semibold leading-tight text-paper">{t("chant.ask.title")}</span>
          <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/60">{t("chant.ask.body")}</span>
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="tap-press min-h-11 shrink-0 px-2 font-sans text-caption font-semibold text-paper/60"
        >
          {t("chant.ask.notNow")}
        </button>
        <button
          type="button"
          onClick={onChoose}
          className="tap-press h-11 shrink-0 rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night"
        >
          {t("chant.ask.choose")}
        </button>
      </div>
    </div>
  );
}

/**
 * The note button for a prayer's header, with the question and the picker
 * it opens. Mounted once per prayer screen (PrayerRuleReader).
 */
export function PrayWithChant({ className }: { className?: string }) {
  const { t } = useTranslate();
  const audio = usePersistentAudio();
  const [picker, setPicker] = useState(false);
  const [asking, setAsking] = useState(false);
  const playing = audio.playing;
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // The question, once the prayer has been on the screen a moment.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!shouldAsk(playingRef.current)) return;
      markAsked();
      setAsking(true);
    }, ASK_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = useCallback(() => setAsking(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAsking(false);
          setPicker(true);
        }}
        aria-label={t("chant.button")}
        title={t("chant.button")}
        className={cn(
          "tap-press hit-44 shrink-0 transition-colors",
          playing ? "text-paper" : "text-paper/55 hover:text-paper",
          className,
        )}
      >
        <NoteGlyph />
      </button>
      {asking && !playing ? (
        <AskCard
          onDismiss={dismiss}
          onChoose={() => {
            setAsking(false);
            setPicker(true);
          }}
        />
      ) : null}
      <ChantPicker open={picker} onClose={() => setPicker(false)} />
    </>
  );
}
