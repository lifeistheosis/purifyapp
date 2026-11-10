"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TOP_ICON, TOP_PLATE } from "@/components/nav/topPlate";
import { More } from "@/components/ui/icons/More";
import { openCampaignMenu } from "@/lib/campaigns/pageMenu";

/**
 * The round ••• over a campaign's page, opposite the way back (1.9.1). It is
 * the page's top bar's `trailing`, drawn from the house's one plate (build 89
 * note 15, components/nav/topPlate.ts) as the works' reader draws its own
 * (components/saints/MobileWorkActions.tsx), and one of the plates
 * lib/ui/__tests__/topPlates.test.ts knows. It only asks: the menu itself is
 * the page's (components/campaigns/CampaignPage.tsx), which knows whose
 * campaign it is.
 */
export function CampaignMenuButton() {
  const { t } = useTranslate();
  return (
    <button type="button" aria-label={t("bible.moreActions")} aria-haspopup="dialog" onClick={openCampaignMenu} className={`tap-press ${TOP_PLATE}`}>
      <More size={TOP_ICON.size} />
    </button>
  );
}
