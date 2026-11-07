"use client";

// Night reading in one tap (1.9, s2-05 of docs/1.9-build/ideas.json): the
// first row of the reader's settings. One tap: Candlelight, Focus, the text a
// size larger, and a sound under the words (the reader's last, or rain). The
// same row, tapped again, gives back what was there before. The rules are
// lib/reader/night.ts.
//
// Candlelight and the sounds are Plus, so night reading is: shown to every
// reader, with the Plus mark for a reader without it, whose tap opens the
// upgrade sheet named for the palettes, as a Candlelight chip does.

import { useMemo, useSyncExternalStore } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { restoreReaderSize, storedReaderSize, useReaderPrefs, type ReaderSize } from "@/components/reader/ReaderPrefs";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { Lampada } from "@/components/ui/icons/Lampada";
import { getAmbienceTrack } from "@/lib/ambience/ambience";
import { getAmbiencePlaying, playAmbience, stopAmbience, useAmbience } from "@/lib/ambience/player";
import { cn } from "@/lib/cn";
import { NIGHT_KEY, NIGHT_THEME, isNight, largerSize, nightSound, readBeforeNight, stopsSound, type BeforeNight } from "@/lib/reader/night";

/** The event every reader preference sends when it changes (components/reader/ReaderPrefs.tsx). */
const PREFS_EVENT = "purify:reader-prefs";

function readKept(): string | null {
  try {
    return window.localStorage.getItem(NIGHT_KEY);
  } catch {
    return null;
  }
}

function subscribe(changed: () => void): () => void {
  window.addEventListener(PREFS_EVENT, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(PREFS_EVENT, changed);
    window.removeEventListener("storage", changed);
  };
}

function keep(before: BeforeNight | null): void {
  try {
    if (before) window.localStorage.setItem(NIGHT_KEY, JSON.stringify(before));
    else window.localStorage.removeItem(NIGHT_KEY);
  } catch {
    /* storage blocked: night reading is on, and turning it off gives back nothing */
  }
  window.dispatchEvent(new CustomEvent(PREFS_EVENT));
}

export function NightReadingRow({
  touch,
  startSize,
  onFocused,
}: {
  /** Phone sheet sizing. */
  touch: boolean;
  /** The opening reader's size for a reader who has never chosen one. */
  startSize?: ReaderSize;
  /** Focus hides the reader's chrome, so whatever holds this row closes when it turns on. */
  onFocused?: () => void;
}) {
  const { t } = useTranslate();
  const prefs = useReaderPrefs(startSize);
  const { allows, locked } = usePlusReadingModes();
  const upgrade = useUpgradeModal();
  const { last } = useAmbience();
  const raw = useSyncExternalStore(subscribe, readKept, () => null);
  const before = useMemo(() => readBeforeNight(raw), [raw]);

  const on = isNight(before, prefs.theme);
  const allowed = allows(NIGHT_THEME);
  const sound = getAmbienceTrack(nightSound(last));
  const hint = t("bible.night.hint", { sound: sound ? t(sound.labelKey) : "" });

  const turnOn = () => {
    // What it puts down, kept first, so the same row can give it back.
    const playing = getAmbiencePlaying();
    keep({ theme: prefs.theme, focus: prefs.focus, size: storedReaderSize(), sound: playing });
    prefs.setTheme(NIGHT_THEME);
    prefs.setSize(largerSize(prefs.size));
    // A sound already playing plays on; otherwise theirs, started by this tap.
    if (!playing) void playAmbience(nightSound(last), { remember: true });
    prefs.setFocus(true);
    onFocused?.();
  };

  const turnOff = () => {
    if (!before) return;
    prefs.setTheme(before.theme);
    restoreReaderSize(before.size);
    prefs.setFocus(before.focus);
    if (stopsSound(before, getAmbiencePlaying())) stopAmbience();
    keep(null);
  };

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        if (on) turnOff();
        else if (allowed) turnOn();
        else if (locked) upgrade.open("palettes");
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-[14px] border px-3.5 text-start font-sans transition-colors",
        touch ? "min-h-14 py-2.5" : "min-h-12 py-2",
        on
          ? "reader-lit border-paper bg-paper text-night"
          : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:border-paper/30 hover:bg-paper/10",
      )}
    >
      <Lampada size={20} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-detail font-semibold leading-tight">{t("bible.night.title")}</span>
        <span className={cn("mt-0.5 block text-caption leading-snug", on ? "text-night/70" : "text-paper/55")}>{hint}</span>
        {locked && !allowed ? (
          // As on the palette chips: the brand's name, which never translates.
          <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.6px] text-gold-pale/80">Purify Plus</span>
        ) : null}
      </span>
      <span className="shrink-0 text-detail font-semibold">{on ? t("common.on") : t("common.off")}</span>
    </button>
  );
}
