import { notFound } from "next/navigation";

import { CampaignsGate } from "@/components/campaigns/CampaignsGate";
import { MINE_TITLE, MyCampaigns } from "@/components/campaigns/MyCampaigns";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { campaignsInBuild } from "@/lib/campaigns/flags";

export const metadata = {
  title: "My Prayer Campaigns",
  description: "The prayer campaigns you are praying and those you started on Purify.",
  robots: { index: false, follow: false },
};

export default function MyCampaignsPage() {
  // A 404 while the switch is closed, and the gate for everyone campaigns
  // are not open for: see app/(app)/campaigns/page.tsx.
  if (!campaignsInBuild()) notFound();
  return (
    <CampaignsGate>
      <MobileTopBar titleKey="campaigns.mine.title" back backFallback="/account" revealTitleOn={MINE_TITLE} />
      <MyCampaigns />
    </CampaignsGate>
  );
}
