import { notFound } from "next/navigation";
import { CreateCampaignClient } from "@/components/campaigns/CreateCampaignClient";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Start a Prayer Campaign",
  description: "Ask the Purify community to pray with you.",
};

export default function NewCampaignPage() {
  // WITHDRAWN, so this is a 404 and not a page. It used to render a
  // FeatureShell: an eyebrow, a title, a paragraph and a call to action,
  // which is a marketing page for a feature that is not there. Anyone who
  // guessed the URL or held an old link was invited to come back, and search
  // engines were handed something to index. "Not visible" has to mean absent,
  // not politely deferred. See lib/campaigns/flags.ts.
  if (!campaignsEnabled()) notFound();
  return <CreateCampaignClient />;
}
