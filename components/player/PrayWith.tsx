"use client";

import { useId, useState } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Note } from "@/components/ui/icons/Note";
import { Sound } from "@/components/ui/icons/Sound";
import { useAmbience } from "@/lib/ambience/player";
import { openAmbience } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

import { AskCard, ChantPicker, useChantAsk } from "./PrayWithChant";

/**
 * Pray with (1.7): what may sound under a prayer, in one control on every
 * prayer page. The owner, 2026-10-16: "two options in one clean control".
 *
 *  - Chant, free for everyone: the Chants library's picker, each chant with
 *    a preview and "Play while I pray" (./PrayWithChant.tsx), and its
 *    once-a-day question at the foot of the screen.
 *  - Ambience, Plus: the reader's ambience sheet (./AmbienceSheet.tsx). A
 *    reader without Plus sees it with the Plus mark's padlock, never hidden,
 *    and a tap opens the upgrade sheet named for ambience.
 *
 * Whichever plays shows in the mini player, as it already does, and its half
 * of the control is lit while it plays.
 */
export function PrayWith({ className }: { className?: string }) {
  const { t } = useTranslate();
  const label = useId();
  const audio = usePersistentAudio();
  const ambience = useAmbience();
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const [picker, setPicker] = useState(false);
  const { asking, dismiss } = useChantAsk(audio.playing);

  // Unknown is allowed (lib/entitlements/usePlusFeatures.ts): the sheet
  // carries its own lock, so a subscriber never meets one while it loads.
  const locked = plus === false;
  const chantOn = audio.playing;
  const soundOn = Boolean(ambience.playing);

  const openPicker = () => {
    dismiss();
    setPicker(true);
  };
  const openSound = () => {
    if (locked) upgrade.open("ambience");
    else openAmbience();
  };

  const half = (on: boolean) =>
    cn(
      "tap-press inline-flex min-h-11 items-center gap-1.5 rounded-pill px-4 font-sans text-detail font-semibold",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper motion-safe:transition-colors",
      on ? "bg-paper text-night" : "text-paper/80 hover:text-paper",
    );

  return (
    <div role="group" aria-labelledby={label} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <span id={label} className="shrink-0 font-sans text-caption text-paper/55">
        {t("prayers.prayWith.label")}
      </span>
      <span className="inline-flex min-w-0 items-center rounded-pill ring-1 ring-inset ring-paper/15">
        <button type="button" aria-haspopup="dialog" aria-pressed={chantOn} onClick={openPicker} className={half(chantOn)}>
          <Note size={16} className="shrink-0" />
          {t("prayers.prayWith.chant")}
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-pressed={soundOn}
          aria-label={locked ? t("prayers.prayWith.ambienceLocked") : undefined}
          onClick={openSound}
          className={half(soundOn)}
        >
          <Sound size={16} className="shrink-0" />
          {t("ambience.title")}
          {locked ? <PlusLock size={12} className="opacity-70" /> : null}
        </button>
      </span>
      {asking ? <AskCard onDismiss={dismiss} onChoose={openPicker} /> : null}
      <ChantPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}
