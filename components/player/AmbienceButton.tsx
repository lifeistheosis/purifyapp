"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ReaderPill } from "@/components/bible/ReaderPill";
import { Bell } from "@/components/ui/icons/Bell";
import { Bird } from "@/components/ui/icons/Bird";
import { Rain } from "@/components/ui/icons/Rain";
import { Sound } from "@/components/ui/icons/Sound";
import { Waves } from "@/components/ui/icons/Waves";
import { Wind } from "@/components/ui/icons/Wind";
import { getAmbienceTrack, type AmbienceTrack } from "@/lib/ambience/ambience";
import { useAmbience } from "@/lib/ambience/player";
import { openAmbience } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";

import { optionClass } from "./Transport";

/** A sound's drawing: the sheet's tiles and the mini player. */
export function AmbienceIcon({ icon, size }: { icon: AmbienceTrack["icon"]; size: number }) {
  if (icon === "rain") return <Rain size={size} className="shrink-0" />;
  if (icon === "bird") return <Bird size={size} className="shrink-0" />;
  if (icon === "sea") return <Waves size={size} className="shrink-0" />;
  if (icon === "wind") return <Wind size={size} className="shrink-0" />;
  return <Bell size={size} className="shrink-0" />;
}

/**
 * The sound button (1.7, the owner's note 25 of 2026-10-16: ambience "feels
 * hidden as buttons in the reader's settings"; keep it in the reader, with a
 * control you notice). It opens the ambience sheet
 * (components/player/AmbienceSheet.tsx) and is lit while a sound plays.
 *
 *  - "pill": inside the reader's chapter pill and a work's section pill, at
 *    the end, by the pager's arrows. 40px like them, with a 44px touch box.
 *  - "toolbar": the computer's reader toolbar, a reader pill with its name.
 *  - "option" (1.8): one of the choices under Now Playing's controls (the
 *    owner's pick of 2026-10-27, round 8 A), the playing sound's mark over
 *    the word Ambience, lit white while a sound plays. It opens the sheet
 *    over the player. It took the place of 1.7's "player" button, alone at
 *    the right of Now Playing's bottom row.
 *  - "bar": the mini player, while a track and a sound play together.
 *
 * A reader without Plus sees the same button with no mark on it: the Plus
 * mark is on the sheet's title and on every sound in it.
 */
export function AmbienceButton({
  variant,
  className,
}: {
  variant: "pill" | "toolbar" | "option" | "bar";
  className?: string;
}) {
  const { t } = useTranslate();
  const { playing } = useAmbience();
  const track = getAmbienceTrack(playing);
  const lit = Boolean(track);
  const label = track ? t("ambience.playingAria", { sound: t(track.labelKey) }) : t("ambience.title");
  const open = () => openAmbience({ overPlayer: variant === "option" });

  if (variant === "option") {
    return (
      <button type="button" onClick={open} aria-haspopup="dialog" aria-label={label} className={cn(optionClass(lit), className)}>
        {track ? <AmbienceIcon icon={track.icon} size={21} /> : <Sound size={21} />}
        <span>{t("ambience.title")}</span>
      </button>
    );
  }

  if (variant === "toolbar") {
    return (
      <ReaderPill
        onClick={open}
        aria-haspopup="dialog"
        aria-label={label}
        className={cn(lit && "border-paper bg-paper text-night hover:border-paper hover:bg-paper", className)}
      >
        <Sound size={16} className="shrink-0" />
        <span>{t("ambience.title")}</span>
      </ReaderPill>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-label={label}
      className={cn(
        "tap-press grid h-10 w-10 shrink-0 place-items-center rounded-full hit-44",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
        lit ? "bg-paper text-night" : "text-paper/85 hover:bg-paper/10 hover:text-paper",
        className,
      )}
    >
      <Sound size={19} />
    </button>
  );
}
