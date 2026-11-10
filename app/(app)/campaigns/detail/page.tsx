import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CampaignMenuButton } from "@/components/campaigns/CampaignMenuButton";
import { CampaignPage } from "@/components/campaigns/CampaignPage";
import { CampaignsGate } from "@/components/campaigns/CampaignsGate";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { campaignsInBuild } from "@/lib/campaigns/flags";

export const metadata = {
  // It names nobody: the campaign is read on the device, and a link to this
  // page says only what it is (docs/1.9-build/notes/campaigns-fable.md, 2.10).
  title: "Prayer Campaign",
  description: "A prayer campaign on Purify.",
  robots: { index: false, follow: false },
};

/** Where the campaigns live in the app: Community's first half. */
const HOME = "/community#pray";

export default function CampaignDetailPage() {
  // A 404 while the switch is closed, and the gate for everyone campaigns
  // are not open for: see app/(app)/campaigns/page.tsx.
  if (!campaignsInBuild()) notFound();
  return (
    // The campaign's id is read from the address on the device.
    <Suspense fallback={null}>
      <CampaignsGate>
        {/* The bars are mounted here, by the page, and set by the page's
            component: the clear one over the picture once the campaign is on
            the screen, the plain one while it opens (CampaignPage). */}
        <CampaignPage
          bar={
            <MobileTopBar
              titleKey="community.prayerCampaigns"
              back
              backFallback={HOME}
              revealTitleOn="campaign-title"
              overlay
              trailing={<CampaignMenuButton />}
            />
          }
          plainBar={<MobileTopBar titleKey="community.prayerCampaigns" back backFallback={HOME} />}
        />
      </CampaignsGate>
    </Suspense>
  );
}
