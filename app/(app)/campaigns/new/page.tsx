import { CreateCampaignClient } from "@/components/campaigns/CreateCampaignClient";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Start a Prayer Campaign",
  description: "Ask the Purify community to pray with you.",
};

export default function NewCampaignPage() {
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
  return <CreateCampaignClient />;
}
