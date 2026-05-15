import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = { title: "Sell on Purify - Purify" };

export default function SellPage() {
  return (
    <FeatureShell
      eyebrow="Marketplace · sellers"
      title="Sell your work"
      body="Open a shop, list your icons, books, or hand-made goods, and connect your payouts. Monasteries can apply for verification."
      tierBadge="Paid"
      ctaLabel="Upgrade to open a shop"
    />
  );
}
