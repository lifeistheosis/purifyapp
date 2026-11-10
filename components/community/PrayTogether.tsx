"use client";

import { useState } from "react";

import { PrayTogetherCampaigns } from "@/components/campaigns/PrayTogetherCampaigns";
import { AddToPrayersSheet, type WallPick } from "@/components/community/AddToPrayersSheet";
import { CampaignCard } from "@/components/community/CampaignCard";
import type { RunningCampaign } from "@/lib/community/runningCampaign";
import { useWallNames } from "@/lib/prayers/useWallNames";
import { activeWallName } from "@/lib/prayers/wallNames";

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
 * in its place. Its Add to my prayers still carries a name into the
 * reader's own prayers as a request on the wall once did
 * (AddToPrayersSheet, lib/prayers/wallNames.ts).
 */
export function PrayTogether({ signedIn, campaign }: { signedIn: boolean; campaign: RunningCampaign | null }) {
  const carried = useWallNames();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // What Add to my prayers carries into the reader's own prayers: the name
  // the campaign prays for, and its title as the words (AddToPrayersSheet).
  const pick: WallPick | null = campaign ? { id: `campaign-${campaign.id}`, name: campaign.name, intention: campaign.title } : null;
  const added = pick ? activeWallName(carried, pick.id) !== null : false;

  return (
    <div className="space-y-9">
      {campaign && pick ? (
        <div>
          <CampaignCard
            campaign={campaign}
            added={added}
            onAdd={() => {
              setNotice(null);
              setAdding(true);
            }}
          />
          {notice ? (
            <p role="status" className="mt-2 px-1 font-sans text-caption text-paper/70">
              {notice}
            </p>
          ) : null}
          <AddToPrayersSheet
            key={pick.id}
            open={adding}
            pick={pick}
            onClose={() => setAdding(false)}
            onDone={(message) => {
              setAdding(false);
              setNotice(message);
            }}
          />
        </div>
      ) : null}
      <PrayTogetherCampaigns signedIn={signedIn} />
    </div>
  );
}
