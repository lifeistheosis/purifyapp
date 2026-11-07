"use client";

// Candlelight at Vespers (1.9, s2-02 of docs/1.9-build/ideas.json): the one
// switch, under the palettes in the reader's settings and in Settings. While
// it is on, the app reads in Candlelight from sunset, when the Church's day
// begins, to the morning (lib/reader/vespers.ts; components/theme/
// AppThemeController.tsx applies it). Candlelight is Plus, so the switch is:
// a reader without it meets the upgrade sheet for the palettes.

import { useSyncExternalStore } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { cn } from "@/lib/cn";
import { VESPERS_KEY } from "@/lib/reader/vespers";

/** The event every reader preference sends when it changes; the theme controller listens for it. */
const PREFS_EVENT = "purify:reader-prefs";

function read(): boolean {
  try {
    return window.localStorage.getItem(VESPERS_KEY) === "1";
  } catch {
    return false;
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

/** The switch: whether it is on, turning it, and whether Plus stands in the way. */
export function useVespers(): { on: boolean; set: (on: boolean) => void; locked: boolean } {
  const stored = useSyncExternalStore(subscribe, read, () => false);
  const { allows, locked } = usePlusReadingModes();
  const upgrade = useUpgradeModal();
  const shut = locked && !allows("candlelight");
  const set = (next: boolean) => {
    if (next && shut) {
      upgrade.open("palettes");
      return;
    }
    try {
      if (next) window.localStorage.setItem(VESPERS_KEY, "1");
      else window.localStorage.removeItem(VESPERS_KEY);
    } catch {
      /* storage blocked: the switch cannot hold */
    }
    window.dispatchEvent(new CustomEvent(PREFS_EVENT));
  };
  return { on: stored && !shut, set, locked: shut };
}

/** The switch in the reader's settings, under the palettes: its name, what it does, On or Off. */
export function VespersToggle({ touch }: { touch: boolean }) {
  const { t } = useTranslate();
  const { on, set, locked } = useVespers();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      className={cn(
        "mt-2.5 flex w-full items-center gap-3 rounded-[14px] border px-3.5 text-start font-sans transition-colors",
        touch ? "min-h-14 py-2.5" : "min-h-12 py-2",
        on
          ? "reader-lit border-paper bg-paper text-night"
          : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:border-paper/30 hover:bg-paper/10",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-detail font-semibold leading-tight">{t("bible.vespers.title")}</span>
        <span className={cn("mt-0.5 block text-caption leading-snug", on ? "text-night/70" : "text-paper/55")}>
          {t("bible.vespers.hint")}
        </span>
        {locked ? (
          // As on the palette chips: the brand's name, which never translates.
          <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.6px] text-gold-pale/80">Purify Plus</span>
        ) : null}
      </span>
      <span className="shrink-0 text-detail font-semibold">{on ? t("common.on") : t("common.off")}</span>
    </button>
  );
}
