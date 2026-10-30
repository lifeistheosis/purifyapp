"use client";

import { useState } from "react";

import { AddToPrayersSheet, type WallPick } from "@/components/community/AddToPrayersSheet";
import { CampaignCard } from "@/components/community/CampaignCard";
import { PrayerWall } from "@/components/community/PrayerWall";
import type { RunningCampaign } from "@/lib/community/runningCampaign";
import { useWallNames } from "@/lib/prayers/useWallNames";
import { activeWallName } from "@/lib/prayers/wallNames";

/**
 * Pray together, Community's first half (1.8, the owner's pick of r3-02,
 * "B with A's top"): under the head, the campaign running now (CampaignCard),
 * and under it the prayer wall, which left the bar of pills for this half.
 *
 * With no campaign running, and none runs in 1.8 (lib/community/
 * runningCampaign.ts), the card is not drawn and the wall stands under the
 * head. Never a sample in its place.
 */
export function PrayTogether({
  signedIn,
  campaign,
  onOpenProfile,
}: {
  signedIn: boolean;
  campaign: RunningCampaign | null;
  onOpenProfile: (handle: string, seed: { handle: string; name: string; avatar: string | null }) => void;
}) {
  const carried = useWallNames();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // What Add to my prayers carries into the reader's own prayers: the name
  // the campaign prays for, and its title as the words, as a request on the
  // wall carries its name and its words (AddToPrayersSheet).
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
      <PrayerWall signedIn={signedIn} onOpenProfile={onOpenProfile} />
    </div>
  );
}
