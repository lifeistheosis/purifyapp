import { MyPrayers } from "@/components/campaigns/MyPrayers";
import { FeatureShell } from "@/components/feature/FeatureShell";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "My Prayers",
  description: "The prayer campaigns you have joined and started on Purify.",
};

export default function MyPrayersPage() {
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
  return <MyPrayers />;
}
