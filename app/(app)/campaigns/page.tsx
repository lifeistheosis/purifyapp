import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = {
  title: "Prayer Campaigns",
  description:
    "Joining a community prayer campaign, a coordinated period of intercession for a person, a parish, or a need. Coming soon.",
};

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
