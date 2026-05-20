import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = {
  title: "Sell your work",
  description:
    "Sell your Orthodox work on Purify, application, terms, and what we look for in a listing. Coming soon.",
};

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
