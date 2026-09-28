"use client";

import { T } from "@/components/i18n/T";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  useUpgradeModal,
  type UpgradeFeature,
} from "@/components/billing/UpgradeModal";
import { CARD, CARD_BG, ICON_TILE } from "@/components/ui/Graphite";
import { Flower } from "@/components/ui/icons/Flower";
import { cn } from "@/lib/cn";

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
 *
 * Drawn as a graphite card since 2026-09-28, with the Florilegium redesign.
 * The Plus mark uses the premium tokens, the same as the nav's Premium
 * button: the `gold` tokens it had render grey on this palette.
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
    <div className={cn(CARD, "mt-12 hover:translate-y-0 md:p-10")} style={CARD_BG}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span aria-hidden className={ICON_TILE}>
          <Flower size={24} />
        </span>
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-pill border border-premium/55 bg-premium/[0.12] px-3 py-1 font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-premium-ink">
            <T k="study.purifyPlus" />
          </span>
          <h2 className="mt-3 text-title-sm font-bold leading-tight text-paper md:text-title">
            {t(titleKey)}
          </h2>
          <p className="mt-3 max-w-[60ch] font-sans text-ui leading-[1.6] text-paper/70">
            {t(blurbKey)}
          </p>
          <button
            type="button"
            onClick={() => upgrade.open(modalFeature)}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
          >
            <T k="study.seePurifyPlus" />
          </button>
          <p className="mt-4 font-sans text-caption leading-[1.55] text-paper/50">
            <T k="study.everythingYouHaveAlreadyGathered" />
          </p>
        </div>
      </div>
    </div>
  );
}
