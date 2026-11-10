import { notFound } from "next/navigation";

import { CampaignsGate } from "@/components/campaigns/CampaignsGate";
import { StartCampaign } from "@/components/campaigns/StartCampaign";
import { campaignsInBuild } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Start a Prayer Campaign",
  description: "Ask the people of Purify to pray with you.",
  robots: { index: false, follow: false },
};

export default function NewCampaignPage() {
  // A 404 while the switch is closed, and the gate for everyone campaigns
  // are not open for: see app/(app)/campaigns/page.tsx. The page itself holds
  // the whole screen with its own way out, as making a post does, so it
  // mounts no bar (components/campaigns/StartCampaign.tsx).
  if (!campaignsInBuild()) notFound();
  return (
    <CampaignsGate>
      <StartCampaign />
    </CampaignsGate>
  );
}
