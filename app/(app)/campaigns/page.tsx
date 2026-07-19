import { CampaignsClient } from "@/components/campaigns/CampaignsClient";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Prayer Campaigns",
  description:
    "Pray with the faithful for a person, a need, or a soul at rest. Join a community prayer campaign and it joins your daily prayers.",
};

export default function CampaignsPage() {
  if (!campaignsEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="ui.together" />}
        title={<T k="nav.discoverMenu.campaigns" />}
        body={<T k="ui.campaignsBody" />}
        ctaLabel={<T k="ui.seeActiveCampaigns" />}
      />
    );
  }
  return <CampaignsClient />;
}
