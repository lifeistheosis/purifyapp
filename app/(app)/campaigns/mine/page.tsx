import { MyPrayers } from "@/components/campaigns/MyPrayers";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "My Prayers",
  description: "The prayer campaigns you have joined and started on Purify.",
};

export default function MyPrayersPage() {
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
  return <MyPrayers />;
}
