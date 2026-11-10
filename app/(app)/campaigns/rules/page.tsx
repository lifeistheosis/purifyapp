import { notFound } from "next/navigation";

import { CampaignRules, RULES_TITLE } from "@/components/campaigns/CampaignRules";
import { CampaignsGate } from "@/components/campaigns/CampaignsGate";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { campaignsInBuild } from "@/lib/campaigns/flags";

export const metadata = {
  title: "The Rules of Praying Together",
  description: "What a prayer campaign on Purify is for, and what it may not carry.",
  robots: { index: false, follow: false },
};

export default function CampaignRulesPage() {
  // A 404 while the switch is closed, and the gate for everyone campaigns
  // are not open for: see app/(app)/campaigns/page.tsx.
  if (!campaignsInBuild()) notFound();
  return (
    <CampaignsGate>
      <MobileTopBar titleKey="campaigns.rules.title" back backFallback="/campaigns" revealTitleOn={RULES_TITLE} />
      <CampaignRules />
    </CampaignsGate>
  );
}
