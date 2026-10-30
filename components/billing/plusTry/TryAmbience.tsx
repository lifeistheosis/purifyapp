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

import { PlusLock } from "@/components/billing/PlusMark";
import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbienceIcon } from "@/components/player/AmbienceButton";
import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { useAmbience } from "@/lib/ambience/player";
import { cn } from "@/lib/cn";
import { trySound, useTrySound } from "@/lib/premium/plusTrySound";

import { JohnPage } from "./TryBible";
import { TryStrip, TryTile, TryWindow } from "./TryKit";

export default function TryAmbience({ row }: TryProps) {
  const { t } = useTranslate();
  const ambience = useAmbience();
  const minute = useTrySound();
  const ended = minute.ended;

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
              <p className="mt-2.5 font-sans text-ui leading-[1.45] text-paper/70">{t("plus.ambience.keep")}</p>
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
                ? t(track.where === "web" ? "ambience.needsConnection" : "ambience.failed")
                : null;
          return (
            <TryTile
              key={track.id}
              on={lit || loading}
              disabled={ended}
              // The sound playing, or the one still loading, stops; any other plays.
              onClick={() => trySound(lit || loading ? null : track.id)}
            >
              <span className="flex items-start justify-between gap-1">
                <AmbienceIcon icon={track.icon} size={26} />
                {ended ? <PlusLock size={12} className="mt-0.5 opacity-60" /> : null}
              </span>
              <span className="block">
                <span className="block font-sans text-[12.5px] font-semibold leading-[1.15]">{t(track.labelKey)}</span>
                {state ? (
                  <span className={cn("mt-0.5 block font-sans text-[11px] leading-tight opacity-70", loading && "motion-safe:animate-pulse")}>{state}</span>
                ) : null}
              </span>
            </TryTile>
          );
        })}
      </TryStrip>
    </>
  );
}
