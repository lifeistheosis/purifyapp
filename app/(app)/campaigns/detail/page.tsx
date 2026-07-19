import { Suspense } from "react";

import { CampaignDetailClient } from "@/components/campaigns/CampaignDetailClient";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Prayer Campaign",
  description: "A community prayer campaign on Purify.",
};

export default function CampaignDetailPage() {
  if (!campaignsEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="ui.together" />}
        title={<T k="nav.discoverMenu.campaigns" />}
        body="Community prayer campaigns are coming soon."
        ctaLabel={<T k="ui.seeActiveCampaigns" />}
      />
    );
  }
  return (
    <Suspense fallback={null}>
      <CampaignDetailClient />
    </Suspense>
  );
}
