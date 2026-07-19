import { CreateCampaignClient } from "@/components/campaigns/CreateCampaignClient";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Start a Prayer Campaign",
  description: "Ask the Purify community to pray with you.",
};

export default function NewCampaignPage() {
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
  return <CreateCampaignClient />;
}
