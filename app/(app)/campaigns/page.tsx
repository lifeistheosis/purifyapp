import { notFound } from "next/navigation";

import { BOARD_TITLE, CampaignBoard } from "@/components/campaigns/CampaignBoard";
import { CampaignsGate } from "@/components/campaigns/CampaignsGate";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { campaignsInBuild } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Prayer Campaigns",
  description: "Pray with the faithful for a person, a need, or a soul at rest.",
  // Campaigns are for the people of Community, not for a search engine
  // (docs/1.9-build/notes/campaigns-fable.md, 4.2).
  robots: { index: false, follow: false },
};

export default function CampaignsPage() {
  // WITHDRAWN while the switch is closed, so this is a 404 and not a page.
  // It once drew a FeatureShell, a marketing page for a feature that was not
  // there: anyone who guessed the address was invited to come back, and
  // search engines were handed something to index. "Not visible" has to mean
  // absent, not politely deferred (lib/campaigns/flags.ts).
  //
  // In a build that has campaigns, the page cannot ask who is reading it
  // (AGENTS.md: a page shown in the apps reads no session on the server), so
  // the gate asks on the device, and draws the same not-found page for
  // everyone campaigns are not open for.
  if (!campaignsInBuild()) notFound();
  return (
    <CampaignsGate>
      <MobileTopBar titleKey="community.prayerCampaigns" back backFallback="/community#pray" revealTitleOn={BOARD_TITLE} />
      <CampaignBoard />
    </CampaignsGate>
  );
}
