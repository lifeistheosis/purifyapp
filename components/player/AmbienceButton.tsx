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
 *  - "player": Now Playing's bottom row, where Apple keeps lyrics and AirPlay
 *    (the music plan's item 5). It opens the sheet over the player.
 *  - "bar": the mini player, while a track and a sound play together.
 *
 * A reader without Plus sees the same button with no mark on it: the Plus
 * mark is on the sheet's title and on every sound in it.
 */
export function AmbienceButton({
  variant,
  className,
}: {
  variant: "pill" | "toolbar" | "player" | "bar";
  className?: string;
}) {
  const { t } = useTranslate();
  const { playing } = useAmbience();
  const track = getAmbienceTrack(playing);
  const lit = Boolean(track);
  const label = track ? t("ambience.playingAria", { sound: t(track.labelKey) }) : t("ambience.title");
  const open = () => openAmbience({ overPlayer: variant === "player" });

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
        "tap-press grid shrink-0 place-items-center rounded-full",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
        variant === "player" ? "h-11 w-11" : "h-10 w-10 hit-44",
        lit
          ? "bg-paper text-night"
          : variant === "player"
            ? "text-paper/55 hover:bg-paper/[0.06] hover:text-paper"
            : "text-paper/85 hover:bg-paper/10 hover:text-paper",
        className,
      )}
    >
      <Sound size={variant === "player" ? 22 : 19} />
    </button>
  );
}
