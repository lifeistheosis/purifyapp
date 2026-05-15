import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = { title: "Prayer Campaigns - Purify" };

export default function CampaignsPage() {
  return (
    <FeatureShell
      eyebrow="Together"
      title="Prayer Campaigns"
      body="Join the faithful praying for a cause, a person, or a need. Open campaigns, parish-led campaigns, and seasonal initiatives."
      tierBadge="Free"
      ctaLabel="See active campaigns"
    />
  );
}
