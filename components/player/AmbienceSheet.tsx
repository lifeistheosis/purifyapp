"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { PlusLock, PlusMark } from "@/components/billing/PlusMark";
import { UpgradeModalProvider, useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Slider } from "@/components/ui/Slider";
import { AMBIENCE_TRACKS, type AmbienceTrack } from "@/lib/ambience/ambience";
import { playAmbience, setAmbienceBalance, setAmbienceVolume, useAmbience } from "@/lib/ambience/player";
import { closeAmbience, useAmbienceSheet } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { isChosen, minutesLeft, setSleepTimer, useSleepTimer, type SleepChoice } from "@/lib/player/sleep";
import { getAudioSnapshot, subscribeAudio } from "@/lib/prayers/persistentAudioStore";

import { AmbienceIcon } from "./AmbienceButton";

/** The sleep timer's choices here: the ambience runs for an evening, not a track. */
const SLEEPS = [15, 30, 60];

const LABEL = "font-sans text-caption font-semibold text-paper/55";

/**
 * The ambience sheet (1.7, the owner's note 25 of 2026-10-16 and his "Yeah,
 * these are good"): the sounds as large tiles (tap to play, tap another to
 * switch, tap the one playing to stop), and once one plays, its volume, its
 * balance against the reading voice while one plays, and the sleep timer
 * shared with everything that plays (lib/player/sleep.ts).
 *
 * Opened from the sound button by the chapter pager, Now Playing (over it),
 * the mini player and the reader's settings, and mounted once in the root
 * frame, so it opens over Today too. Ambience is Plus: a reader without it
 * sees every sound, each with the Plus mark's padlock and the mark beside
 * the title, and a tap opens the upgrade sheet named for ambience. That
 * sheet is this one's own: the root frame stands above the providers of the
 * app's screens (AppFrame, Today).
 */
export function AmbienceSheet() {
  return (
    <UpgradeModalProvider>
      <AmbienceSheetHost />
    </UpgradeModalProvider>
  );
}

/**
 * Mounted on every screen, so it asks nothing until it opens: the reader's
 * Plus answer, the sounds and the player are read by what the open sheet
 * draws (the title's mark and the content below), not here.
 */
function AmbienceSheetHost() {
  const { t } = useTranslate();
  const { open, overPlayer } = useAmbienceSheet();

  // A link out of the sheet (the upgrade sheet's plans) leaves it behind.
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    closeAmbience();
  }, [pathname]);

  return (
    <Sheet
      open={open}
      onClose={closeAmbience}
      title={t("ambience.title")}
      desktop
      layer={overPlayer ? "over-player" : undefined}
      titleExtra={<TitleMark />}
      bodyClassName="pt-1"
    >
      <AmbienceSheetContent overPlayer={overPlayer} />
    </Sheet>
  );
}

/** The Plus mark beside the title, for a reader without Plus. */
function TitleMark() {
  return usePlusFeatures() === false ? <PlusMark /> : null;
}

/** Whether the app's player holds a track: re-renders when that changes, not with its clock. */
function useHasTrack(): boolean {
  return useSyncExternalStore(subscribeAudio, () => getAudioSnapshot().src !== null, () => false);
}

function AmbienceSheetContent({ overPlayer }: { overPlayer: boolean }) {
  const { t, locale } = useTranslate();
  const ambience = useAmbience();
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const hasTrack = useHasTrack();

  const locked = plus === false;
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const choose = (track: AmbienceTrack) => {
    if (locked) {
      upgrade.open("ambience", { overPlayer });
      return;
    }
    // The sound playing, or the one still loading, stops; any other plays.
    const on = ambience.playing === track.id || ambience.loading === track.id;
    void playAmbience(on ? null : track.id);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        {AMBIENCE_TRACKS.map((track) => {
          const lit = ambience.playing === track.id;
          const loading = ambience.loading === track.id;
          const failed = ambience.failed === track.id;
          const state = lit
            ? t("ambience.playing")
            : loading
              ? t("ambience.loading")
              : failed
                ? t(track.where === "web" ? "ambience.needsConnection" : "ambience.failed")
                : null;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => choose(track)}
              aria-pressed={lit || loading}
              className={cn(
                "tap-press relative flex min-h-[104px] flex-col justify-between rounded-[12px] p-3 text-start",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                "motion-safe:transition-colors motion-safe:duration-200",
                lit || loading
                  ? "bg-paper text-night"
                  : "bg-paper/[0.04] text-paper ring-1 ring-inset ring-paper/10 hover:bg-paper/[0.08]",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <AmbienceIcon icon={track.icon} size={28} />
                {locked ? <PlusLock size={13} className="mt-0.5 opacity-60" /> : null}
              </span>
              <span className="mt-3 block">
                <span className="block font-sans text-detail font-semibold leading-tight">{t(track.labelKey)}</span>
                {state ? (
                  <span className={cn("mt-1 block font-sans text-caption leading-tight opacity-70", loading && "motion-safe:animate-pulse")}>
                    {state}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {ambience.playing ? (
        <div className="mt-5 space-y-4 border-t border-paper/10 pt-4">
          <div>
            <p className={LABEL}>{t("ambience.volume")}</p>
            <Slider
              value={ambience.volume}
              max={1}
              step={0.05}
              onChange={setAmbienceVolume}
              label={t("ambience.volume")}
              valueText={pct.format(ambience.volume)}
            />
          </div>

          {/* The balance, while the app's player holds a reading or a chant:
              how far the sound steps back while the voice speaks. */}
          {hasTrack ? (
            <div>
              <p className={LABEL}>{t("ambience.balance")}</p>
              <div className="flex items-center gap-3">
                <span className="shrink-0 font-sans text-caption text-paper/70">{t("ambience.balanceVoice")}</span>
                <Slider
                  value={ambience.balance}
                  max={1}
                  step={0.05}
                  onChange={setAmbienceBalance}
                  label={t("ambience.balance")}
                  valueText={`${t("ambience.balanceSound")} ${pct.format(ambience.balance)}`}
                  className="min-w-0 flex-1"
                />
                <span className="shrink-0 font-sans text-caption text-paper/70">{t("ambience.balanceSound")}</span>
              </div>
            </div>
          ) : null}

          <SleepChoices />
        </div>
      ) : null}
    </>
  );
}

/** Off, 15, 30 or 60 minutes: the one sleep timer, and how long it has left. */
function SleepChoices() {
  const { t } = useTranslate();
  const sleep = useSleepTimer();
  const [now, setNow] = useState(() => Date.now());

  // The minutes left, kept current while the sheet is open.
  useEffect(() => {
    if (sleep.kind !== "minutes") return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [sleep.kind]);

  const choices: { key: string; label: string; choice: SleepChoice }[] = [
    { key: "off", label: t("common.off"), choice: { kind: "off" } },
    ...SLEEPS.map((m) => ({ key: String(m), label: t("today.minRead", { count: m }), choice: { kind: "minutes", minutes: m } as SleepChoice })),
  ];

  return (
    <div>
      <p className={LABEL}>{t("player.sleep")}</p>
      <div role="group" aria-label={t("player.sleep")} className="mt-2 grid grid-cols-4 gap-2">
        {choices.map((c) => {
          const on = isChosen(sleep, c.choice);
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setSleepTimer(c.choice);
                setNow(Date.now());
              }}
              className={cn(
                "tap-press inline-flex min-h-11 items-center justify-center rounded-pill px-2 font-sans text-detail font-semibold tabular-nums",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                on ? "bg-paper text-night" : "text-paper/75 ring-1 ring-inset ring-paper/15 hover:bg-paper/[0.06] hover:text-paper",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {sleep.kind === "minutes" ? (
        <p role="status" className="mt-2 font-sans text-caption text-paper/60">
          {t("player.sleepIn", { count: minutesLeft(sleep, now) })}
        </p>
      ) : sleep.kind === "end" ? (
        <p role="status" className="mt-2 font-sans text-caption text-paper/60">
          {t("player.sleepEnd")}
        </p>
      ) : null}
    </div>
  );
}
