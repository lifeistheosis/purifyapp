"use client";

import { useCallback } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { clock, Transport } from "@/components/player/Transport";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/cn";
import { useChantAvailability, type Availability } from "@/lib/chants/live";
import { playChant, useChantPlayback } from "@/lib/chants/play";
import type { ChantIndexVariant, ChantLine, ChantTiming } from "@/lib/chants/types";
import { useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { pause, play, seek, skipBy, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

/**
 * Playing one version of a chant from a button (1.7), in one place for the
 * hero, the slim bar and the version rows: whether it may play now (the live
 * list, lib/chants/live.ts), whether it is the one in the player, and one
 * toggle. A version that cannot play says why in words, never with a button
 * that does nothing.
 */
export function useChantPlay({
  slug,
  title,
  variant,
  lines,
  timing,
  coverSrc,
  open = true,
}: {
  slug: string;
  title: string;
  variant: ChantIndexVariant;
  lines?: ChantLine[];
  /** The words' timing in hand: cleared words switched on carry their own (note 78). */
  timing?: ChantTiming;
  coverSrc?: string;
  /** Open Now Playing on its words when it starts. A chant's page, which
   *  sings along itself (1.8), does not. */
  open?: boolean;
}): { availability: Availability; loaded: boolean; playing: boolean; toggle: () => void } {
  const availabilityFor = useChantAvailability();
  const availability = availabilityFor(slug, variant);
  const { loaded, playing } = useChantPlayback(variant);
  const prefs = useWordsPrefs();

  const toggle = useCallback(() => {
    if (playing) return pause();
    if (loaded) return play();
    if (availability !== "playable") return;
    playChant({ slug, title, variant, lines, timing, coverSrc, prefs, open });
  }, [availability, coverSrc, lines, loaded, open, playing, prefs, slug, timing, title, variant]);

  return { availability, loaded, playing, toggle };
}

/** A version that cannot play now, for a reason the reader should hear. */
export function isBlocked(availability: Availability): boolean {
  return availability === "offline" || availability === "unavailable" || availability === "pulled";
}

/**
 * Why a version cannot play, as the key of its words, or null when it can
 * (or is still being checked). No signal is "Plays with a connection"; a
 * signal with no recording to be had is "Not available now".
 */
export function availabilityKey(availability: Availability): "chants.needsConnection" | "chants.unavailable" | null {
  if (availability === "offline") return "chants.needsConnection";
  if (availability === "unavailable" || availability === "pulled") return "chants.unavailable";
  return null;
}

/**
 * The line a version that cannot play shows under its button. With
 * `reserve` its line is held open even while there is nothing to say, so a
 * reason that arrives late (the list of recordings is read over the network)
 * never pushes the page down under the reader's finger (1.7.1).
 */
export function AvailabilityLine({
  availability,
  className,
  reserve = false,
}: {
  availability: Availability;
  className?: string;
  reserve?: boolean;
}) {
  const { t } = useTranslate();
  const key = availabilityKey(availability);
  if (!key && !reserve) return null;
  return (
    <p aria-live="polite" className={cn("min-h-[1lh] font-sans text-caption text-paper/55", className)}>
      {key ? t(key) : null}
    </p>
  );
}

/**
 * The white Play pill (Pause while this version sounds). Disabled, and
 * marked busy, for the moment the live list is being read.
 */
export function PlayPill({
  playing,
  availability,
  onToggle,
  size = "lg",
  className,
}: {
  playing: boolean;
  availability: Availability;
  onToggle: () => void;
  size?: "lg" | "sm";
  className?: string;
}) {
  const { t } = useTranslate();
  const can = playing || availability === "playable";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!can}
      aria-busy={availability === "checking" || undefined}
      className={cn(
        "tap-press inline-flex shrink-0 items-center justify-center gap-2 rounded-pill bg-paper font-sans font-semibold text-night motion-safe:transition-opacity disabled:opacity-40",
        size === "lg" ? "h-12 min-w-[132px] px-6 text-ui" : "hit-44 h-9 px-4 text-detail",
        className,
      )}
    >
      {playing ? <Pause size={size === "lg" ? 18 : 15} /> : <Play size={size === "lg" ? 18 : 15} className="translate-x-[1px]" />}
      {playing ? t("prayers.pause") : t("prayers.play")}
    </button>
  );
}

/**
 * A chant's own player on its page, docked at the foot over the tab bar (1.8,
 * sheet r3-18, the owner's pick of 2026-10-31: "I want the player to be at
 * the bottom, like how A has it"; A's ChantDock): where the recording is and
 * how far it has to go, then back 15, Play and forward 15, the controls Now
 * Playing wears (components/player/Transport.tsx), for the version the page
 * shows. Its place is app/globals.css, .chant-dock: over the tab bar, and
 * over the mini player and Today's readings bar when they show.
 *
 * Every part is drawn at its full size in the first frame (the owner's note
 * 61): before the version plays the line is still and shows its length, the
 * skips are dim, and Play waits dim while the list of recordings is read,
 * then lights where it is. A version that cannot play says why in the
 * line's middle, between the two times, so nothing moves when it does.
 */
export function ChantDock({
  variant,
  play: chant,
  label,
  className,
}: {
  variant: ChantIndexVariant;
  play: ReturnType<typeof useChantPlay>;
  /** What it plays, for assistive technology: the chant's name and the version's. */
  label: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const audio = usePersistentAudio();
  const { loaded } = chant;
  const current = loaded ? audio.currentTime : 0;
  const duration = loaded && audio.duration > 0 ? audio.duration : variant.audio.durationSec;
  // How far it has to go, as Now Playing's line says it.
  const left = `-${clock(Math.max(0, duration - current))}`;
  const why = availabilityKey(chant.availability);
  return (
    <div
      role="region"
      aria-label={label}
      data-chant-control="dock"
      // What stands at the foot of the screen (lib/ui/readingPlace.ts).
      data-screen-edge="bottom"
      className={cn("chant-dock", className)}
    >
      {/* Where it is: the line 17px down, as the sheet draws it, in a box 44px tall for a thumb. */}
      <div className="absolute inset-x-5 -top-[5px]">
        {loaded ? (
          <Slider
            value={current}
            max={duration > 0 ? duration : 0}
            step={5}
            onChange={(at) => seek(at)}
            label={t("player.position")}
            valueText={`${clock(current)} / ${clock(duration)}`}
          />
        ) : (
          // The same line, still: nothing is playing here to move it.
          <div aria-hidden className="relative h-11">
            <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-paper/15" />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-5 top-[25px] flex items-baseline justify-between gap-3 font-sans text-[11.5px] tabular-nums leading-none text-paper/55">
        <span>{clock(current)}</span>
        <span aria-live="polite" className="min-w-0 truncate text-center text-paper/70">
          {why ? t(why) : null}
        </span>
        <span>{left}</span>
      </div>
      <Transport
        playing={chant.playing}
        onToggle={chant.toggle}
        onSkip={skipBy}
        canPlay={loaded || chant.availability === "playable"}
        canSkip={loaded}
        busy={chant.availability === "checking"}
        size={54}
        className="absolute inset-x-0 top-[42px] gap-[30px]"
      />
    </div>
  );
}
