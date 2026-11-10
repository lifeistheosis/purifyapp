"use client";

import { T } from "@/components/i18n/T";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  useUpgradeModal,
  type UpgradeFeature,
} from "@/components/billing/UpgradeModal";
import { Flower } from "@/components/ui/icons/Flower";
import { cn } from "@/lib/cn";

import { FLOR_BUTTON, FLOR_PLATE, FLOR_TRAY } from "./florStyle";

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
 * Drawn on the house's raised tray from 1.9 (build 89 note 12, with the
 * Florilegium's redesign), where it was a graphite card: the flower on its
 * plate, what Plus adds here in Lora, the one white button, and under it the
 * line that says what a reader already gathered stays theirs, free. The Plus
 * mark keeps the premium tokens, the same as the nav's Premium button: the
 * `gold` tokens it once had render grey on this palette.
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
    <div className={cn(FLOR_TRAY, "mt-7 px-4 pb-4 pt-5")} data-plus-gate="">
      <div className="flex items-start gap-3.5">
        <span aria-hidden className={cn(FLOR_PLATE, "size-11 rounded-[13px]")}>
          <Flower size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-pill border border-premium/55 bg-premium/[0.12] px-3 py-1 font-sans text-caption font-semibold text-premium-ink">
            <T k="study.purifyPlus" />
          </span>
          <h2 className="mt-2.5 font-serif text-[19px] font-bold leading-snug text-paper text-balance">{t(titleKey)}</h2>
          <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.6] text-paper/70">{t(blurbKey)}</p>
        </div>
      </div>
      <button type="button" onClick={() => upgrade.open(modalFeature)} className={cn(FLOR_BUTTON, "mt-5")}>
        <T k="study.seePurifyPlus" />
      </button>
      <p className="mt-3.5 font-sans text-caption leading-[1.55] text-paper/60">
        <T k="study.everythingYouHaveAlreadyGathered" />
      </p>
    </div>
  );
}
