"use client";

// A reader's campaigns, for the Campaigns door on their profile (1.9, phase
// 4; components/community/profile/ProfileViewer.tsx mounts it).
//
// Asked once a profile, and only once campaigns are open for the reader who
// looks (./useCampaignsOpen.ts): a closed build asks nobody, and a reader
// campaigns are not open for is never shown the door. What comes back is what
// the server allows on a profile (./server.ts, listByCreator): the empty list
// for a private profile, for someone the reader has blocked, and for a reader
// with no campaign to show, so the door is drawn only where something stands
// behind it.

import { useEffect, useState } from "react";

import { fetchByCreator } from "./client";
import type { PublicCampaign } from "./model";
import { useCampaignsOpen } from "./useCampaignsOpen";

const NONE: readonly PublicCampaign[] = [];

export function useProfileCampaigns(handle: string | null | undefined): readonly PublicCampaign[] {
  const open = useCampaignsOpen();
  const [found, setFound] = useState<{ handle: string; list: PublicCampaign[] } | null>(null);

  useEffect(() => {
    if (!open || !handle) return;
    let live = true;
    void fetchByCreator(handle).then((list) => {
      if (live) setFound({ handle, list });
    });
    return () => {
      live = false;
    };
  }, [open, handle]);

  // Another profile's list is never shown under this one's name while its own is on its way.
  return open && handle && found && found.handle === handle ? found.list : NONE;
}
