"use client";

// The moment a palette is earned by reading (build 95 note 27, the owner's
// "make the read to unlock themes cooler"): at the foot of the last page
// read, the new look is shown in the house's own reveal (the gift's: a soft
// pool of light it rises into, a few embers, the mandorla it rests in; never
// rays, a sparkle or confetti), the phone gives its one soft tick, and one
// tap wears it. Until then nothing marked the moment at all: the card in
// Settings simply stopped being dim.
//
// It stands in the page, under its last words, and not over it: the reader
// has just finished reading and nothing takes the page from them. It is
// shown once for each palette on a device (KEY), and only on the page whose
// end earned it. Under reduced motion it is still and whole at once.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { useEarnedPalettes } from "@/components/reader/useEarnedPalettes";
import { usePalettePick } from "@/components/reader/usePalettePick";
import { ModePage } from "@/components/settings/ReadingModePages";
import { Check } from "@/components/ui/icons/Check";
import type { EarnedPalettes } from "@/lib/reader/earned";
import { PREVIEW_CHAPTER } from "@/lib/settings/preview";
import { softTick } from "@/lib/ui/softTick";

const KEY = "purify.earned.shown";
/** When the page has settled in its light: the phone's tick lands with it. */
const LANDS_MS = 700;
const EMBERS = [-64, -38, -14, 12, 34, 58] as const;

function shown(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function EarnedMoment({ palette }: { palette: keyof EarnedPalettes }) {
  const { t } = useTranslate();
  const { font } = useReaderPrefs();
  const earned = useEarnedPalettes()[palette].earned;
  const { pick, worn, locked } = usePalettePick();
  const [open, setOpen] = useState(false);

  // Earned while this page is open, and not shown before: this is the page
  // that earned it. Decided as the page is drawn (nothing is earned in the
  // first draw, so the export and the device agree), and kept once it shows.
  if (earned && !open && !shown().includes(palette)) setOpen(true);
  useEffect(() => {
    if (!open) return;
    try {
      const seen = shown();
      if (!seen.includes(palette)) localStorage.setItem(KEY, JSON.stringify([...seen, palette]));
    } catch {
      // A device that keeps nothing shows it again next time: better twice than never.
    }
    const tick = window.setTimeout(softTick, LANDS_MS);
    return () => window.clearTimeout(tick);
  }, [open, palette]);

  if (!open) return null;
  const name = t(palette === "councils" ? "settings.paletteCouncils" : "settings.paletteCappadocian");
  const wearing = worn === palette;
  return (
    <section className="earned-moment" data-earned={palette} aria-live="polite">
      <div className="earned-stage" aria-hidden>
        <span className="earned-pool" />
        <span className="earned-mandorla" />
        {EMBERS.map((x, i) => (
          <span key={x} className="earned-ember" style={{ ["--ember-x" as string]: `${x}px`, animationDelay: `${420 + i * 90}ms` }} />
        ))}
        <span className="earned-page">
          <ModePage palette={palette} font={font} book={t("bible.books.john")} chapter={t("bible.chapterN", { n: PREVIEW_CHAPTER })} />
        </span>
      </div>
      <p className="earned-eyebrow">{t("settings.paletteEarnedRow")}</p>
      <h2 className="earned-title">{t("earn.yours", { name })}</h2>
      <p className="earned-line">{t(palette === "councils" ? "earn.councilsDone" : "earn.cappadocianDone")}</p>
      {wearing ? (
        <p className="earned-wearing">
          <Check size={16} strokeWidth={2.4} />
          {t("earn.wearing")}
        </p>
      ) : (
        <button type="button" onClick={() => pick(palette)} className="earned-wear tap-press">
          {t("earn.wear")}
        </button>
      )}
      {/* Plus is never promised to every reader. */}
      {locked && !wearing ? <p className="earned-plus">{t("settings.palettePlusNote")}</p> : null}
    </section>
  );
}
