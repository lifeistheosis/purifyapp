"use client";

import { useCallback } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { cn } from "@/lib/cn";
import { useChantAvailability, type Availability } from "@/lib/chants/live";
import { playChant, useChantPlayback } from "@/lib/chants/play";
import type { ChantIndexVariant, ChantLine } from "@/lib/chants/types";
import { useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { pause, play } from "@/lib/prayers/persistentAudioStore";

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
  coverSrc,
  open = true,
}: {
  slug: string;
  title: string;
  variant: ChantIndexVariant;
  lines?: ChantLine[];
  coverSrc?: string;
  /** Open Now Playing on the live captions when it starts. */
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
    playChant({ slug, title, variant, lines, coverSrc, prefs, open });
  }, [availability, coverSrc, lines, loaded, open, playing, prefs, slug, title, variant]);

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
