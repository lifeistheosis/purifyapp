import { CampaignsClient } from "@/components/campaigns/CampaignsClient";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Prayer Campaigns",
  description:
    "Pray with the faithful for a person, a need, or a soul at rest. Join a community prayer campaign and it joins your daily prayers.",
};

export default function CampaignsPage() {
  if (!campaignsEnabled()) {
    return (
      <FeatureShell
        eyebrow="Together"
        title="Prayer Campaigns"
        body="Join the faithful praying for a cause, a person, or a need. Open campaigns, parish-led campaigns, and seasonal initiatives."
        ctaLabel="See active campaigns"
      />
    );
  }
  return <CampaignsClient />;
}
