"use client";

// How far a reader is towards a palette earned by reading, shown as what it
// is (build 95 note 27, the owner's "make the read to unlock themes cooler"):
// the councils as nineteen marks that fill, the three Cappadocian Fathers as
// three faces that light as a work of each is read. Until then it was a bare
// count, "0 of 19". The count is still what a screen reader hears.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useEarnedSoFar } from "@/components/reader/useEarnedPalettes";
import { CAPPADOCIANS, CAPPADOCIAN_FACES, COUNCIL_PAGES, type EarnedPalettes } from "@/lib/reader/earned";

export function EarnMarks({ goal, progress }: { goal: keyof EarnedPalettes; progress: { read: number; of: number } }) {
  const { t } = useTranslate();
  const sofar = useEarnedSoFar();
  const label = t("settings.paletteProgress", { count: progress.read, total: progress.of });
  if (goal === "councils") {
    return (
      <span role="img" aria-label={label} className="earn-marks">
        {COUNCIL_PAGES.map((slug) => (
          <i key={slug} data-on={sofar.councils.includes(slug) ? "" : undefined} />
        ))}
      </span>
    );
  }
  return (
    <span role="img" aria-label={label} className="earn-faces">
      {CAPPADOCIANS.map((saint) => (
        // eslint-disable-next-line @next/next/no-img-element -- a 24px face the apps carry; nothing to size or fetch late
        <img key={saint} src={CAPPADOCIAN_FACES[saint]} alt="" decoding="async" data-on={sofar.fathers.includes(saint) ? "" : undefined} />
      ))}
    </span>
  );
}
