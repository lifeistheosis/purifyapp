"use client";

import { useEffect, useState } from "react";

import { Reference } from "@/components/bible/Reference";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BarSwitch } from "@/components/ui/BarSwitch";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { Timer } from "@/components/ui/icons/Timer";
import { useAmbienceSheet } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";
import { verseOf } from "@/lib/player/captions";
import { useSungLines } from "@/lib/player/clock";
import { closeNowPlaying, setPlayerView, useNowPlayingSheet, type PlayerView } from "@/lib/player/sheet";
import { isChosen, minutesLeft, setSleepTimer, useSleepTimer, type SleepChoice } from "@/lib/player/sleep";
import { seek, setLoopMode, skipBy, toggle, usePersistentAudio, type LoopMode } from "@/lib/prayers/persistentAudioStore";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { AmbienceButton } from "./AmbienceButton";
import { CoverArt } from "./CoverArt";
import { LiveCaptions } from "./LiveCaptions";
import { SaveOffline, SaveOfflineNote } from "./SaveOffline";
import { PositionBar, Transport, optionClass } from "./Transport";

/**
 * Now Playing (1.7): the whole screen for what is playing, opened from the
 * mini player or from a chant. Drawn from the newest Apple Music and Spotify
 * screens the owner asked to take as the reference (2026-10-15,
 * Homebase/boards/purify-master/r17/ref/music/):
 *
 *   - the picture large and everything else black, no colour washed out of
 *     the icon into the page (our icons are gold, and gold is out);
 *   - back 15 and forward 15, a sleep timer, and the Anthem's own repeats;
 *   - one smooth slide up and down, and no blur moving with it (a blurred
 *     layer in motion costs an Android phone its frames).
 *
 * 1.8, the owner's pick of 2026-10-27 (round 8,
 * Homebase/boards/purify-master/variants/08-player): two views, switched,
 * never merged ("Keep the two separate, as in John 1 without the lyrics and
 * John 1 with the lyrics. Don't merge the two and add the photo"):
 *
 *   - Cover (round 8 A): the playing item's picture as the cover, its name and
 *     who it is under it, the download mark at the end of that line;
 *   - Words (round 8 B): the words alone, the verse or line being read lit and
 *     the rest dim, moving as it reads, the picture only small at their head
 *     beside the name and "Verse 4 of 51".
 *
 * The switch sits in the top bar, as the saint web's does, wherever the track
 * has words; the view chosen is kept on the device (lib/player/sheet.ts).
 * Everything under the middle is one block, the same in both views, so no
 * control the player has moves or goes missing when the view is switched:
 * where it is, back 15, Play, forward 15, and the choices under them (round
 * 8 A's "four choices"): Loop, Ambience and the sleep timer.
 *
 * On a computer it is a panel on the right, as Spotify's tablets have it. The
 * cover is an icon of the book's saint for a reading, kept on the website, so
 * with no signal it falls back to the bundled plate (CoverArt). The sleep
 * timer opens as a sheet over the player and is the one timer for everything
 * that plays (lib/player/sleep.ts).
 */
const LOOPS: LoopMode[] = ["off", "inf", 3, 7, 12];
const SLEEPS = [5, 10, 15, 30, 60];

export function NowPlayingSheet() {
  const { t } = useTranslate();
  const audio = usePersistentAudio();
  const { open, view } = useNowPlayingSheet();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [sleepMenu, setSleepMenu] = useState(false);
  const sleep = useSleepTimer();
  const ambienceSheet = useAmbienceSheet();
  // A sheet stands over the player: Escape is that sheet's.
  const covered = sleepMenu || (ambienceSheet.open && ambienceSheet.overPlayer);
  const hasWords = Boolean(audio.captions && audio.captions.length > 0);
  // The one clock that lights the words and counts the verses
  // (lib/player/clock.ts), running while the player is open.
  const sung = useSungLines(audio.captions, audio.duration, open && hasWords);

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

  // Esc closes, unless a sheet stands over the player, and the page under it
  // does not scroll while it is open. The lock is the counted one every sheet
  // takes (lib/ui/overlay.ts), so a sheet over the player closing after it,
  // or before it, leaves the page as it found it.
  useEffect(() => {
    if (!open || covered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNowPlaying();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, covered]);
  // The phone's back closes the player first, as it closes every sheet: the
  // player is no route of its own, so with nothing listening the back went to
  // the page under it, which changed while the player stayed (the owner,
  // 2026-10-19). A sheet over the player takes the back for itself.
  useAndroidBack(open && !covered, closeNowPlaying);
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  // Nothing loaded any more: nothing to show.
  useEffect(() => {
    if (open && !audio.src) closeNowPlaying();
  }, [open, audio.src]);

  if (!mounted || !audio.src) return null;

  const words = hasWords && view === "words";
  const loopIndex = LOOPS.indexOf(audio.loopMode);
  const loopLabel =
    audio.loopMode === "off" ? t("common.off") : audio.loopMode === "inf" ? t("prayers.audio.loop") : `${audio.loopMode}×`;
  const sleeping = sleep.kind !== "off";
  const sleepChoices: { key: string; label: string; choice: SleepChoice }[] = [
    { key: "off", label: t("common.off"), choice: { kind: "off" } },
    ...SLEEPS.map((m) => ({ key: String(m), label: t("today.minRead", { count: m }), choice: { kind: "minutes", minutes: m } as SleepChoice })),
    { key: "end", label: t("player.sleepEnd"), choice: { kind: "end" } },
  ];
  // "Verse 4 of 51" over a reading's words; who sings it over a chant's.
  const verse = words ? verseOf(sung.lines, sung.current) : null;
  const views: { id: PlayerView; label: string; icon: React.ReactNode }[] = [
    { id: "cover", label: t("player.viewCover"), icon: <CoverGlyph /> },
    { id: "words", label: t("player.viewWords"), icon: <WordsGlyph /> },
  ];
  const panel = "absolute inset-0 flex flex-col transition-[opacity,transform] duration-[380ms] ease-[var(--ease-house)] motion-reduce:transition-none";

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
          <CoverArt
            src={audio.art}
            fallback={audio.artFallback}
            size={440}
            className={cn(
              "pointer-events-none absolute -inset-16 h-[calc(100%+8rem)] w-[calc(100%+8rem)] max-w-none transition-opacity duration-700",
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

        <div className="relative flex min-h-0 flex-1 flex-col px-7 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          {/* Top: put it away, and the switch between the two views (the
              saint web's switch, round 1), or what this is when the track
              has no words to show. */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={closeNowPlaying}
              aria-label={t("common.close")}
              className="tap-press -ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper hover:bg-paper/[0.06]"
            >
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {hasWords ? (
              <BarSwitch
                label={t("prayers.nowPlaying")}
                idBase="player-view"
                items={views}
                selected={words ? "words" : "cover"}
                onSelect={setPlayerView}
                className="min-w-0"
              />
            ) : (
              <p className="font-sans text-detail font-semibold text-paper/60">{t("prayers.nowPlaying")}</p>
            )}
            <span className="h-11 w-11 shrink-0" aria-hidden />
          </div>

          {/* The middle: the cover, or the words. Both are drawn and the one
              not chosen fades away, so the switch is one smooth move; the
              one faded away cannot be reached, by a finger or a key. */}
          <div className="relative mt-4 min-h-0 flex-1">
            <div
              id="player-view-panel-cover"
              role={hasWords ? "tabpanel" : undefined}
              aria-labelledby={hasWords ? "player-view-tab-cover" : undefined}
              aria-hidden={words}
              inert={words}
              className={cn(panel, words ? "pointer-events-none -translate-y-3 opacity-0" : "opacity-100")}
            >
              {/* As large as the screen leaves it, to 340px, and square. */}
              <div className="relative flex min-h-0 flex-1 items-center justify-center [container-type:size]">
                {audio.art ? (
                  <CoverArt
                    src={audio.art}
                    fallback={audio.artFallback}
                    size={340}
                    className="aspect-square h-auto max-h-full w-[min(100cqw,100cqh,340px)] max-w-full rounded-[18px] object-[50%_18%] shadow-[0_24px_50px_rgba(0,0,0,0.55)]"
                  />
                ) : null}
              </div>
              <div className="mx-auto mt-6 flex w-full max-w-[340px] items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-[26px] font-bold leading-tight text-paper">{audio.title ? <Reference>{audio.title}</Reference> : null}</h2>
                  {audio.artist ? <p className="mt-1 truncate font-sans text-ui text-paper/55">{audio.artist}</p> : null}
                </div>
                <SaveOffline src={audio.src} className="-mr-2.5" />
              </div>
            </div>

            {hasWords ? (
              <div
                id="player-view-panel-words"
                role="tabpanel"
                aria-labelledby="player-view-tab-words"
                aria-hidden={!words}
                inert={!words}
                className={cn(panel, words ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0")}
              >
                <div className="flex items-center gap-3">
                  {audio.art ? (
                    <CoverArt
                      src={audio.art}
                      fallback={audio.artFallback}
                      size={48}
                      className="h-12 w-12 shrink-0 rounded-[10px] object-[50%_18%]"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[15.5px] font-semibold leading-tight text-paper">{audio.title}</p>
                    {verse ? (
                      <p className="mt-0.5 truncate font-sans text-detail text-paper/55">
                        {t("player.verseOf", { verse: verse.verse, total: verse.total })}
                      </p>
                    ) : audio.artist ? (
                      <p className="mt-0.5 truncate font-sans text-detail text-paper/55">{audio.artist}</p>
                    ) : null}
                  </div>
                  <SaveOffline src={audio.src} className="-mr-2.5" />
                </div>
                <LiveCaptions
                  source={audio.captions!}
                  lines={sung.lines}
                  timed={sung.timed}
                  current={sung.current}
                  live
                  active={words}
                  look="player"
                  rtl={audio.rtl}
                  onSeek={seek}
                  className="-mx-1 mt-2 min-h-0 flex-1 px-1"
                />
              </div>
            ) : null}
          </div>

          {/* One block for both views: nothing here moves when they switch. */}
          <SaveOfflineNote src={audio.src} className="mt-2" />
          <PositionBar current={audio.currentTime} duration={audio.duration} onSeek={(at) => seek(at)} className="mt-2" />
          <Transport playing={audio.playing} onToggle={() => toggle()} onSkip={skipBy} size={68} className="mt-3" />

          {/* The choices under the controls (round 8 A), each its mark over a
              word, lit white while it is on. */}
          <div className="mt-5 flex items-start justify-around">
            <button
              type="button"
              onClick={() => setLoopMode(LOOPS[(loopIndex + 1) % LOOPS.length])}
              aria-label={`${t("prayers.audio.loop")}: ${loopLabel}`}
              className={optionClass(audio.loopMode !== "off")}
            >
              {typeof audio.loopMode === "number" ? (
                <span aria-hidden className="grid h-[21px] place-items-center text-[15px] font-bold leading-none">
                  {audio.loopMode}×
                </span>
              ) : (
                <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 2l3 3-3 3" />
                  <path d="M4 11V9a4 4 0 0 1 4-4h12" />
                  <path d="M7 22l-3-3 3-3" />
                  <path d="M20 13v2a4 4 0 0 1-4 4H4" />
                </svg>
              )}
              <span>{t("prayers.audio.loop")}</span>
            </button>
            <AmbienceButton variant="option" />
            <button
              type="button"
              onClick={() => setSleepMenu(true)}
              aria-label={t("player.sleep")}
              aria-haspopup="dialog"
              className={optionClass(sleeping)}
            >
              <Timer size={21} />
              <span>{t("player.sleep")}</span>
            </button>
          </div>

          {/* The sleep timer, as a sheet over the player: the one timer for
              the voice, a chant and the ambience (lib/player/sleep.ts). */}
          <Sheet open={sleepMenu} onClose={() => setSleepMenu(false)} title={t("player.sleep")} desktop layer="over-player">
            <div role="group" aria-label={t("player.sleep")} className="divide-y divide-paper/10">
              {sleepChoices.map((o) => {
                const on = isChosen(sleep, o.choice);
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSleepTimer(o.choice);
                      setSleepMenu(false);
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-3 text-start font-sans text-ui hover:text-paper",
                      on ? "font-semibold text-paper" : "text-paper/75",
                    )}
                  >
                    {o.label}
                    {on ? <Check size={18} className="shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
            {sleep.kind === "minutes" ? (
              <p role="status" className="mt-3 font-sans text-caption text-paper/60">
                {t("player.sleepIn", { count: minutesLeft(sleep) })}
              </p>
            ) : null}
          </Sheet>
        </div>
      </div>
    </div>
  );
}

/** The cover view's mark: a picture in its frame. */
function CoverGlyph() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M3.5 16.5l5-5 4 4 3-3 5 5" />
    </svg>
  );
}

/** The words view's mark: lines of words, the first the longest. */
function WordsGlyph() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" aria-hidden>
      <path d="M4 6.5h16M4 12h12M4 17.5h9" />
    </svg>
  );
}
