import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CampaignDetailClient } from "@/components/campaigns/CampaignDetailClient";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "Prayer Campaign",
  description: "A community prayer campaign on Purify.",
};

export default function CampaignDetailPage() {
  // WITHDRAWN, so this is a 404 and not a page. It used to render a
  // FeatureShell: an eyebrow, a title, a paragraph and a call to action,
  // which is a marketing page for a feature that is not there. Anyone who
  // guessed the URL or held an old link was invited to come back, and search
  // engines were handed something to index. "Not visible" has to mean absent,
  // not politely deferred. See lib/campaigns/flags.ts.
  if (!campaignsEnabled()) notFound();
  return (
    <Suspense fallback={null}>
      <CampaignDetailClient />
    </Suspense>
  );
}
