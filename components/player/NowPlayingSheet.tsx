"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { closeNowPlaying, setCaptionsOn, useNowPlayingSheet } from "@/lib/player/sheet";
import {
  seek,
  setLoopMode,
  setSleep,
  skipBy,
  toggle,
  usePersistentAudio,
  type LoopMode,
} from "@/lib/prayers/persistentAudioStore";
import { LiveCaptions } from "./LiveCaptions";

/**
 * Now Playing (1.7): the whole screen for what is playing, opened from the
 * mini player or from the Anthem's page. Drawn from the newest Apple Music
 * and Spotify screens the owner asked to take as the reference (2026-10-15,
 * Homebase/boards/purify-master/r17/ref/music/) and the mock he was sent the
 * same day (r17/mock/player/):
 *
 *   - the picture large and everything else black, no colour washed out of
 *     the icon into the page (our icons are gold, and gold is out);
 *   - live captions, the words lighting as they are sung (LiveCaptions), the
 *     picture shrinking to the corner while they are on;
 *   - back 15 and forward 15, a sleep timer, and the Anthem's own repeats;
 *   - one smooth slide up and down, and no blur moving with it (a blurred
 *     layer in motion costs an Android phone its frames).
 *
 * On a computer it is a panel on the right, as Spotify's tablets have it.
 */
const LOOPS: LoopMode[] = ["off", "inf", 3, 7, 12];
const SLEEPS = [5, 10, 15, 30, 60];

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function NowPlayingSheet() {
  const { t } = useTranslate();
  const audio = usePersistentAudio();
  const { open, captions } = useNowPlayingSheet();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [sleepMenu, setSleepMenu] = useState(false);

  // Slide in after mounting, slide out before unmounting.
  /* eslint-disable react-hooks/set-state-in-effect -- the sheet's own
     enter and leave, driven by the store's open flag. */
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    setSleepMenu(false);
    const id = setTimeout(() => setMounted(false), 380);
    return () => clearTimeout(id);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Esc closes, and the page under it does not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNowPlaying();
    };
    window.addEventListener("keydown", onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, [open]);

  // Nothing loaded any more: nothing to show.
  useEffect(() => {
    if (open && !audio.src) closeNowPlaying();
  }, [open, audio.src]);

  if (!mounted || !audio.src) return null;

  const hasCaptions = Boolean(audio.captions && audio.captions.length > 0);
  const withCaptions = captions && hasCaptions;
  const loopIndex = LOOPS.indexOf(audio.loopMode);
  const loopLabel =
    audio.loopMode === "off" ? t("common.off") : audio.loopMode === "inf" ? t("prayers.audio.loop") : `${audio.loopMode}×`;
  const sleeping = audio.sleep.kind !== "off";

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t("prayers.nowPlaying")}>
      {/* On a computer the page stays in view, dimmed, beside the panel. */}
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={closeNowPlaying}
        className={cn(
          "absolute inset-0 hidden bg-black/55 transition-opacity duration-300 md:block",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          // Dark on every palette, as a player is (dark-island puts the
          // dark palette's tokens back inside it on Light).
          "dark-island absolute inset-0 flex flex-col overflow-hidden bg-night md:left-auto md:w-[440px] md:border-l md:border-paper/10",
          "transition-transform duration-[380ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] [:where([data-motion=reduce])_&]:transition-none",
          shown ? "translate-y-0" : "translate-y-full md:translate-y-0 md:translate-x-full",
        )}
      >
        {/* The picture again, grey and soft, behind it all: still, once the
            sheet is up, so the blur is drawn once and not on every frame. */}
        {audio.art ? (
          // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
          <img
            src={audio.art}
            alt=""
            aria-hidden
            className={cn(
              "pointer-events-none absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] object-cover transition-opacity duration-700",
              shown ? "opacity-30" : "opacity-0",
            )}
            style={{ filter: "grayscale(1) blur(42px) brightness(0.5)" }}
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 520px at 20% -8%, rgba(255,255,255,0.06), transparent 68%), linear-gradient(180deg, rgba(11,11,14,0) 0%, rgba(11,11,14,0.55) 45%, var(--color-night, #0b0b0e) 82%)",
          }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col px-8 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          {/* Top: put it away, and say what this is. */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={closeNowPlaying}
              aria-label={t("common.close")}
              className="tap-press -ml-2 grid h-11 w-11 place-items-center rounded-full text-paper hover:bg-paper/[0.06]"
            >
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <p className="font-sans text-detail font-semibold text-paper/60">{t("prayers.nowPlaying")}</p>
            <span className="h-11 w-11" aria-hidden />
          </div>

          {/* The middle: the picture and its name, or the captions with the
              picture small at their head. Both are drawn and the one not in
              use fades away, so the change is one smooth move. */}
          <div className="relative mt-4 min-h-0 flex-1">
            <div
              className={cn(
                "absolute inset-0 flex flex-col justify-center transition-[opacity,transform] duration-[380ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                withCaptions ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100",
              )}
              aria-hidden={withCaptions}
            >
              {audio.art ? (
                // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
                <img
                  src={audio.art}
                  alt=""
                  className="mx-auto aspect-square w-full max-w-[340px] rounded-[14px] object-cover object-[50%_18%] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                />
              ) : null}
              <div className="mx-auto mt-7 w-full max-w-[340px]">
                <h2 className="font-serif text-[24px] font-bold leading-tight text-paper">{audio.title}</h2>
                {audio.artist ? <p className="mt-1 font-sans text-ui text-paper/55">{audio.artist}</p> : null}
              </div>
            </div>

            {hasCaptions ? (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col transition-[opacity,transform] duration-[380ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                  withCaptions ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
                )}
                aria-hidden={!withCaptions}
              >
                <div className="flex items-center gap-3.5">
                  {audio.art ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
                    <img src={audio.art} alt="" className="h-[54px] w-[54px] shrink-0 rounded-[9px] object-cover object-[50%_18%]" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-serif text-[17px] font-bold leading-tight text-paper">{audio.title}</p>
                    {audio.artist ? <p className="truncate font-sans text-caption text-paper/55">{audio.artist}</p> : null}
                  </div>
                </div>
                <LiveCaptions
                  source={audio.captions!}
                  duration={audio.duration}
                  playing={audio.playing && withCaptions}
                  position={audio.currentTime}
                  rtl={audio.rtl}
                  onSeek={(at) => seek(at)}
                  className="mt-4 min-h-0 flex-1"
                />
              </div>
            ) : null}
          </div>

          {/* Where it is, and how far it has to go. */}
          <Scrubber position={audio.currentTime} duration={audio.duration} label={t("player.position")} />
          <div className="mt-2 flex justify-between font-sans text-caption tabular-nums text-paper/55">
            <span>{fmt(audio.currentTime)}</span>
            <span>-{fmt(Math.max(0, audio.duration - audio.currentTime))}</span>
          </div>

          {/* The controls. */}
          <div className="relative mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLoopMode(LOOPS[(loopIndex + 1) % LOOPS.length])}
              aria-label={`${t("prayers.audio.loop")}: ${loopLabel}`}
              className={cn(
                "tap-press min-w-[52px] rounded-pill px-2 py-1.5 font-sans text-detail font-semibold",
                audio.loopMode === "off" ? "text-paper/55" : "bg-paper/10 text-paper",
              )}
            >
              <span className="inline-flex items-center gap-1">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 2l3 3-3 3" />
                  <path d="M4 11V9a4 4 0 0 1 4-4h12" />
                  <path d="M7 22l-3-3 3-3" />
                  <path d="M20 13v2a4 4 0 0 1-4 4H4" />
                </svg>
                {audio.loopMode === "off" ? null : <span>{loopLabel}</span>}
              </span>
            </button>
            <button
              type="button"
              onClick={() => skipBy(-15)}
              aria-label={t("player.back15")}
              className="tap-press grid h-12 w-12 place-items-center rounded-full text-paper hover:bg-paper/[0.06]"
            >
              <SkipGlyph back />
            </button>
            <button
              type="button"
              onClick={() => toggle()}
              aria-label={audio.playing ? t("prayers.pause") : t("prayers.play")}
              className="tap-press grid h-[68px] w-[68px] place-items-center rounded-full bg-paper text-night shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]"
            >
              {audio.playing ? (
                <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="5.5" y="4" width="4.6" height="16" rx="1.3" />
                  <rect x="13.9" y="4" width="4.6" height="16" rx="1.3" />
                </svg>
              ) : (
                <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor" className="translate-x-[2px]" aria-hidden>
                  <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => skipBy(15)}
              aria-label={t("player.forward15")}
              className="tap-press grid h-12 w-12 place-items-center rounded-full text-paper hover:bg-paper/[0.06]"
            >
              <SkipGlyph />
            </button>
            <button
              type="button"
              onClick={() => setSleepMenu((v) => !v)}
              aria-label={t("player.sleep")}
              aria-expanded={sleepMenu}
              className={cn(
                "tap-press relative grid h-12 w-[52px] place-items-center rounded-full hover:bg-paper/[0.06]",
                sleeping ? "text-paper" : "text-paper/55",
              )}
            >
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="13.5" r="7.5" />
                <path d="M12 9.5v4l2.5 2" />
                <path d="M9.5 2.5h5" />
              </svg>
              {sleeping ? <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-paper" /> : null}
            </button>

            {sleepMenu ? (
              <div className="absolute bottom-[calc(100%+10px)] right-0 z-10 w-48 overflow-hidden rounded-2xl border border-paper/12 bg-night-soft shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
                <p className="px-4 pb-1.5 pt-3 font-sans text-caption text-paper/50">{t("player.sleep")}</p>
                {[
                  { key: "off", label: t("common.off"), on: () => setSleep({ kind: "off" }), active: audio.sleep.kind === "off" },
                  ...SLEEPS.map((m) => ({
                    key: String(m),
                    label: t("today.minRead", { count: m }),
                    on: () => setSleep({ kind: "minutes", minutes: m }),
                    active: audio.sleep.kind === "minutes" && audio.sleep.minutes === m,
                  })),
                  { key: "end", label: t("player.sleepEnd"), on: () => setSleep({ kind: "end" }), active: audio.sleep.kind === "end" },
                ].map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      o.on();
                      setSleepMenu(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-left font-sans text-ui transition-colors hover:bg-paper/[0.06]",
                      o.active ? "text-paper" : "text-paper/70",
                    )}
                  >
                    {o.label}
                    {o.active ? (
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12.5l4.4 4.4L19 7.2" />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* The bottom row: the captions, where the track has them. */}
          <div className="mt-6 flex h-9 items-center">
            {hasCaptions ? (
              <button
                type="button"
                onClick={() => setCaptionsOn(!captions)}
                aria-pressed={withCaptions}
                aria-label={t("player.captions")}
                className={cn(
                  "tap-press hit-44 relative grid h-9 w-11 place-items-center rounded-full transition-colors",
                  withCaptions ? "text-paper" : "text-paper/50",
                )}
              >
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 5.5h16v10H9l-5 4z" />
                  <path d="M8 9.5h8M8 12.5h5" />
                </svg>
                {withCaptions ? <span aria-hidden className="absolute -bottom-1 h-1 w-1 rounded-full bg-paper" /> : null}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A slim scrubber: tap or drag to go there, the arrow keys move by five. */
function Scrubber({ position, duration, label }: { position: number; duration: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;
  const at = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || duration <= 0) return;
    seek(Math.max(0, Math.min(1, (clientX - box.left) / box.width)) * duration);
  };
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${fmt(position)} / ${fmt(duration)}`}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        at(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons) at(e.clientX);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") skipBy(5);
        if (e.key === "ArrowLeft") skipBy(-5);
      }}
      className="relative mt-5 h-6 cursor-pointer touch-none"
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-paper/15">
        <div className="absolute inset-y-0 left-0 rounded-full bg-paper" style={{ width: `${pct}%` }} />
      </div>
      <div
        aria-hidden
        className="absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

function SkipGlyph({ back = false }: { back?: boolean }) {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {back ? (
        <>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
          <path d="M4.5 3.5v4h4" />
        </>
      ) : (
        <>
          <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
          <path d="M19.5 3.5v4h-4" />
        </>
      )}
      <text x="12" y="15.4" fill="currentColor" stroke="none" fontSize="7.2" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans), sans-serif">
        15
      </text>
    </svg>
  );
}
