import { Suspense } from "react";

import { CampaignDetailClient } from "@/components/campaigns/CampaignDetailClient";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Prayer Campaign",
  description: "A community prayer campaign on Purify.",
};

export default function CampaignDetailPage() {
  if (!campaignsEnabled()) {
    return (
      <FeatureShell
        eyebrow="Together"
        title="Prayer Campaigns"
        body="Community prayer campaigns are coming soon."
        ctaLabel="See active campaigns"
      />
    );
  }
  return (
    <Suspense fallback={null}>
      <CampaignDetailClient />
    </Suspense>
  );
}
