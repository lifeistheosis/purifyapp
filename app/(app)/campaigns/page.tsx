import { notFound } from "next/navigation";
import { CampaignsClient } from "@/components/campaigns/CampaignsClient";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Prayer Campaigns",
  description:
    "Pray with the faithful for a person, a need, or a soul at rest. Join a community prayer campaign and it joins your daily prayers.",
};

export default function CampaignsPage() {
  // WITHDRAWN, so this is a 404 and not a page. It used to render a
  // FeatureShell: an eyebrow, a title, a paragraph and a call to action,
  // which is a marketing page for a feature that is not there. Anyone who
  // guessed the URL or held an old link was invited to come back, and search
  // engines were handed something to index. "Not visible" has to mean absent,
  // not politely deferred. See lib/campaigns/flags.ts.
  if (!campaignsEnabled()) notFound();
  return <CampaignsClient />;
}
