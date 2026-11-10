"use client";

// Candlelight keeps the season (1.9, lib/reader/candleSeason.ts): the one
// switch, under Candlelight at Vespers in the reader's settings and in
// Settings. While it is on, Candlelight's soft light takes the colour of the
// Church's long fasts; off, it is always the candle's own white. It is on
// until a reader turns it off. Candlelight is Plus, so the switch is: a
// reader without it sees it off, and a tap opens the sheet for the palettes,
// as the Vespers switch does.

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useCandleSeasonOn } from "@/components/reader/CandleVeil";
import { usePlusReadingModes } from "@/components/reader/usePlusReadingModes";
import { cn } from "@/lib/cn";
import { CANDLE_SEASON_KEY } from "@/lib/reader/candleSeason";

/** The event every reader preference sends when it changes; the veil listens for it. */
const PREFS_EVENT = "purify:reader-prefs";

/** The switch: whether it is on, turning it, and whether Plus stands in the way. */
export function useCandleSeason(): { on: boolean; set: (on: boolean) => void; locked: boolean } {
  const stored = useCandleSeasonOn();
  const { allows, locked } = usePlusReadingModes();
  const upgrade = useUpgradeModal();
  const shut = locked && !allows("candlelight");
  const set = (next: boolean) => {
    if (shut) {
      upgrade.open("palettes");
      return;
    }
    try {
      // On is the absence of a choice: only "off" is kept.
      if (next) window.localStorage.removeItem(CANDLE_SEASON_KEY);
      else window.localStorage.setItem(CANDLE_SEASON_KEY, "0");
    } catch {
      /* storage blocked: the switch cannot hold */
    }
    window.dispatchEvent(new CustomEvent(PREFS_EVENT));
  };
  return { on: stored && !shut, set, locked: shut };
}

/** The switch in the reader's settings, under Candlelight at Vespers: its name, what it does, On or Off. */
export function CandleSeasonToggle({ touch }: { touch: boolean }) {
  const { t } = useTranslate();
  const { on, set, locked } = useCandleSeason();
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
        <span className="block text-detail font-semibold leading-tight">{t("bible.season.title")}</span>
        <span className={cn("mt-0.5 block text-caption leading-snug", on ? "text-night/70" : "text-paper/55")}>
          {t("bible.season.hint")}
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
