"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Note } from "@/components/ui/icons/Note";
import { Sound } from "@/components/ui/icons/Sound";
import { useAmbience } from "@/lib/ambience/player";
import { openAmbience } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";
import { useExpectedPlusFeatures, usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { offerChantAtHand } from "@/lib/player/chantAtHand";
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
 *
 * The chant at hand (1.8, the owner's pick B, Immersive, for while you pray):
 * once this control has scrolled up off the screen and nothing sounds, its
 * chant is one tap away from the line being prayed. It is the same picker,
 * and it is not offered while the question's card is up.
 *
 * It waited at the foot of the screen until build 93, as a pill, and a fresh
 * pair of eyes met it lying across a line of the Trisagion (docs/1.9-build/
 * notes/fresh-eyes.md, L1): a floating pill over the prayer's own words,
 * which his rule of 2026-11-10 keeps out ("Floating pills only where they
 * belong", CLAUDE.md). So it comes at the same moment as a button in the
 * page's bar, beside search (./ChantInBar.tsx, through lib/player/
 * chantAtHand.ts), and nothing is drawn over the prayer here.
 */
export function PrayWith({ className }: { className?: string }) {
  const { t } = useTranslate();
  const label = useId();
  const audio = usePersistentAudio();
  const ambience = useAmbience();
  const plus = usePlusFeatures();
  const expectedPlus = useExpectedPlusFeatures();
  const upgrade = useUpgradeModal();
  const [picker, setPicker] = useState(false);
  const { asking, dismiss } = useChantAsk(audio.playing);
  const group = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  // Gone up off the top as the prayer is read, not merely not reached yet.
  useEffect(() => {
    const el = group.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0));
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const silent = !audio.src && !ambience.playing && !ambience.loading;
  const atHand = scrolledPast && silent && !asking && !picker;

  // Unknown is allowed (lib/entitlements/usePlusFeatures.ts): the sheet
  // carries its own lock, so a subscriber never meets one while it loads.
  const locked = plus === false;
  // The lock's place, from the first frame (the owner's note 6 of build 80).
  // The answer comes after the first frame, and the lock coming with it
  // widened the Ambience half and moved the centred row, both halves and the
  // lock, under the reader's eye. So until the answer is known its place is
  // kept, empty, unless the answer is expected to be Plus (this build cannot
  // sell it, or this device's last answer was Plus), and the lock fades into
  // it when the answer says so. A page loaded afresh is drawn before it can
  // read the device, so there the place is kept for everyone.
  const lockPlace = locked || (plus === null && expectedPlus !== true);
  const chantOn = audio.playing;
  const soundOn = Boolean(ambience.playing);

  const openPicker = useCallback(() => {
    dismiss();
    setPicker(true);
  }, [dismiss]);
  // Offered in the page's bar for as long as it is at hand, and taken back
  // when it is not, or when the page leaves.
  useEffect(() => {
    if (!atHand) return;
    return offerChantAtHand({ open: openPicker });
  }, [atHand, openPicker]);
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
    <div ref={group} role="group" aria-labelledby={label} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
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
          {lockPlace ? (
            <PlusLock
              size={12}
              className={cn(
                "motion-safe:transition-opacity motion-safe:duration-[var(--duration-fast)] motion-safe:ease-[var(--ease-house)]",
                locked ? "opacity-70" : "opacity-0",
              )}
            />
          ) : null}
        </button>
      </span>
      {asking ? <AskCard onDismiss={dismiss} onChoose={openPicker} /> : null}
      <ChantPicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}
