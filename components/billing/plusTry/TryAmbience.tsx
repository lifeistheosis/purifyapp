"use client";

// Try Ambience (r3-07 A, as the sheet draws it): the first verses of John 1
// in a window that scrolls, and the six sounds under it as the ambience sheet
// draws them (components/player/AmbienceSheet.tsx). Rain begins with the tap
// on Try it, any other sound is one tap away, and after a minute it stops
// (lib/premium/plusTrySound.ts). Then the sound has gone, the lock's own
// words stand in the window, and the sounds wear their padlocks again.
//
// The sounds are the real ones, played by the app's one ambience player; the
// minute is all a preview gives. The ambience sheet itself keeps its lock.
//
// From build 95 (note 22, his word of 2026-11-13 about 14:29 UTC, "the Plus
// preview's strip takes the photographs too"), each tile wears its sound's
// photograph as the sheet's tiles do (components/player/AmbiencePhoto.tsx),
// upright as theirs are, its name and state on the tile's own ground below,
// the state's line always kept so the name never moves when a state comes.

import { PlusLock } from "@/components/billing/PlusMark";
import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbienceIcon } from "@/components/player/AmbienceButton";
import { AmbiencePhoto } from "@/components/player/AmbiencePhoto";
import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { playAmbience, useAmbience } from "@/lib/ambience/player";
import { cn } from "@/lib/cn";
import { trySound, useTrySound } from "@/lib/premium/plusTrySound";

import { JohnPage } from "./TryBible";
import { TryStrip, TryTile, TryWindow } from "./TryKit";

export default function TryAmbience({ row, owned = false }: TryProps) {
  const { t } = useTranslate();
  const ambience = useAmbience();
  const minute = useTrySound();
  // A reader who has ambience (Your plan) plays the sounds as they are: no
  // minute, and no padlocks after it.
  const ended = !owned && minute.ended;

  return (
    <>
      <TryWindow
        label={t(row.name)}
        overlay={
          ended ? (
            <div>
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-paper/[0.07] text-paper ring-1 ring-inset ring-paper/15">
                <AmbienceIcon icon="rain" size={22} />
              </span>
              <p className="mt-3.5 font-heading text-[22px] font-semibold leading-[1.25] text-paper">{t("plus.ambience.title")}</p>
              {/* 80, not 70: over the veiled page a verse's letters show through under this line, and on the
                  light looks it read 4.41 to 4.45:1 at its least in Arabic at 390 (Updates 34, the export's walk). */}
              <p className="mt-2.5 font-sans text-ui leading-[1.45] text-paper/80">{t("plus.ambience.keep")}</p>
            </div>
          ) : null
        }
      >
        <JohnPage />
      </TryWindow>

      <TryStrip label={t("ambience.title")}>
        {AMBIENCE_TRACKS.map((track) => {
          const lit = !ended && ambience.playing === track.id;
          const loading = !ended && ambience.loading === track.id;
          const failed = !ended && ambience.failed === track.id;
          const state = lit
            ? t("ambience.playing")
            : loading
              ? t("ambience.loading")
              : failed
                ? t(ambience.failedFor === "connection" ? "ambience.needsConnection" : "ambience.failed")
                : null;
          return (
            <TryTile
              key={track.id}
              on={lit || loading}
              disabled={ended}
              // Upright, as the sheet's tiles are: the picture over the name.
              className="h-[108px] justify-end overflow-hidden"
              // The sound playing, or the one still loading, stops; any other plays.
              onClick={() => {
                const next = lit || loading ? null : track.id;
                if (owned) void playAmbience(next);
                else trySound(next);
              }}
            >
              <AmbiencePhoto track={track} className="-mx-2.5 -mt-2.5 mb-1.5" />
              <span className="relative flex items-start justify-between gap-1">
                <span data-try-ambience-name="" className="block font-sans text-[12.5px] font-semibold leading-[1.15]">{t(track.labelKey)}</span>
                {ended ? <PlusLock size={12} className="mt-0.5 shrink-0 opacity-60" /> : null}
              </span>
              {/* The state's line is always there, so the name never moves when a state comes or goes. */}
              <span className={cn("relative mt-0.5 block font-sans text-[11px] leading-tight opacity-70", loading && "motion-safe:animate-pulse")}>{state ?? "\u00a0"}</span>
            </TryTile>
          );
        })}
      </TryStrip>
    </>
  );
}
