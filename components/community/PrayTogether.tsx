"use client";

import { PrayTogetherCampaigns } from "@/components/campaigns/PrayTogetherCampaigns";
import { CampaignCard } from "@/components/community/CampaignCard";
import type { RunningCampaign } from "@/lib/community/runningCampaign";

/**
 * Pray together, Community's first half (1.8, the owner's pick of r3-02,
 * "B with A's top"): under the head, the campaign running now (CampaignCard),
 * and readers' own prayer campaigns (1.9, the rework:
 * components/campaigns/PrayTogetherCampaigns.tsx), the one the reader
 * carries as that same card. That part draws nothing, and asks nobody
 * anything, unless campaigns are open for this reader.
 *
 * THE PRAYER WALL STOOD HERE UNTIL 1.9. His word of 2026-11-10: "I'd say
 * remove the prayer wall and just keep the prayer campaigns", and then
 * "wall B": asking for prayers goes everywhere, the wall, the line on a
 * profile and its switch, I prayed and its notice. There is one way to ask
 * for prayer in Purify now, a campaign. Nothing is drawn in the wall's
 * place (docs/1.9-build/notes/campaigns-fable.md, sections 21 and 26).
 *
 * With no campaign of the app's own running, and none runs
 * (lib/community/runningCampaign.ts), its card is not drawn. Never a sample
 * in its place. The card is one tap that opens the campaign, whose own page
 * holds Pray and In my prayers (his word, 2026-11-28).
 */
export function PrayTogether({ signedIn, campaign }: { signedIn: boolean; campaign: RunningCampaign | null }) {
  return (
    <div className="space-y-9">
      {campaign ? <CampaignCard campaign={campaign} /> : null}
      <PrayTogetherCampaigns signedIn={signedIn} />
    </div>
  );
}
