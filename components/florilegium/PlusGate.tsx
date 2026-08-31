"use client";

import { T } from "@/components/i18n/T";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  useUpgradeModal,
  type UpgradeFeature,
} from "@/components/billing/UpgradeModal";

/**
 * Shown in place of a Plus feature when the signed-in reader is not entitled
 * to the feature layer.
 *
 * It used to link straight to /pricing. It now opens the upgrade modal, which
 * names this feature rather than the whole tier, and leaves the reader where
 * they are. useUpgradeModal falls back to /pricing on its own when no provider
 * is mounted above, so nothing here can strand a reader with a dead button.
 *
 * `feature` and `blurb` used to be hardcoded English props passed by each call
 * site, which meant the one card standing between a reader and a paid feature
 * was in a language they may not read. They are catalog keys now.
 */
export function PlusGate({
  titleKey,
  blurbKey,
  modalFeature = "general",
}: {
  titleKey: string;
  blurbKey: string;
  modalFeature?: UpgradeFeature;
}) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();

  return (
    <div className="mt-10 rounded-lg border border-gold/30 bg-gold/[0.04] p-6 md:p-8">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-3">
        <T k="study.purifyPlus" />
      </p>
      <h2 className="font-sans text-title-sm font-bold text-paper leading-tight">
        {t(titleKey)}
      </h2>
      <p className="mt-3 font-serif text-body text-paper/80 leading-[1.7]">
        {t(blurbKey)}
      </p>
      <p className="mt-5">
        <button
          type="button"
          onClick={() => upgrade.open(modalFeature)}
          className="inline-flex items-center justify-center font-sans text-ui font-semibold rounded-pill px-5 py-3 bg-gold text-night hover:bg-gold-soft transition-colors"
        >
          <T k="study.seePurifyPlus" />
        </button>
      </p>
      <p className="mt-4 font-sans text-caption text-paper/50 leading-[1.55]">
        <T k="study.everythingYouHaveAlreadyGathered" />
      </p>
    </div>
  );
}
