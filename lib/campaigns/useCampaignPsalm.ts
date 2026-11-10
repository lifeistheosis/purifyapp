"use client";

import { useEffect, useState } from "react";

import { campaignPsalm, type PrayerRef } from "./model";
import type { CampaignPsalm } from "./psalms";

/**
 * A campaign's psalm with its words, fetched as a piece of the app's code
 * only when a campaign that names one is on the screen (./psalms.ts). Null
 * while it loads and when the campaign names none.
 */
export function useCampaignPsalm(ref: PrayerRef | null | undefined): CampaignPsalm | null {
  const known = campaignPsalm(ref);
  const key = known ? `${known.rule}/${known.id}` : null;
  const [loaded, setLoaded] = useState<{ key: string; psalm: CampaignPsalm | null } | null>(null);
  useEffect(() => {
    if (!key || !known) return;
    let live = true;
    void import("./psalms").then((m) => {
      if (live) setLoaded({ key, psalm: m.campaignPsalmText(known) });
    });
    return () => {
      live = false;
    };
    // `known` is derived from `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return key && loaded?.key === key ? loaded.psalm : null;
}
