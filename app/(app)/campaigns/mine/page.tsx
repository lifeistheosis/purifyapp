import { notFound } from "next/navigation";
import { MyPrayers } from "@/components/campaigns/MyPrayers";
import { campaignsEnabled } from "@/lib/campaigns/flags";

export const metadata = {
  title: "My Prayers",
  description: "The prayer campaigns you have joined and started on Purify.",
};

export default function MyPrayersPage() {
  // WITHDRAWN, so this is a 404 and not a page. It used to render a
  // FeatureShell: an eyebrow, a title, a paragraph and a call to action,
  // which is a marketing page for a feature that is not there. Anyone who
  // guessed the URL or held an old link was invited to come back, and search
  // engines were handed something to index. "Not visible" has to mean absent,
  // not politely deferred. See lib/campaigns/flags.ts.
  if (!campaignsEnabled()) notFound();
  return <MyPrayers />;
}
