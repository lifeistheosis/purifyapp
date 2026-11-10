"use client";

import { useEffect, useState } from "react";

import { campaignPrayer, type PrayerRef } from "./model";
import type { CampaignPrayerText } from "./prayerTexts";

/**
 * A campaign's psalm with its words, fetched as a piece of the app's code
 * only when a campaign that names one is on the screen (./prayerTexts.ts). Null
 * while it loads and when the campaign names none.
 */
export function useCampaignPrayer(ref: PrayerRef | null | undefined): CampaignPrayerText | null {
  const known = campaignPrayer(ref);
  const key = known ? `${known.rule}/${known.id}` : null;
  const [loaded, setLoaded] = useState<{ key: string; psalm: CampaignPrayerText | null } | null>(null);
  useEffect(() => {
    if (!key || !known) return;
    let live = true;
    void import("./prayerTexts").then((m) => {
      if (live) setLoaded({ key, psalm: m.campaignPrayerText(known) });
    });
    return () => {
      live = false;
    };
    // `known` is derived from `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return key && loaded?.key === key ? loaded.psalm : null;
}
