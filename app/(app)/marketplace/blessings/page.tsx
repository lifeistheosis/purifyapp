import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = {
  title: "Paid blessings",
  description:
    "Request a moleben, a panikhida, or commemoration at the proskomedia from a priest or monastic. Coming soon.",
};

export default function BlessingsPage() {
  return (
    <FeatureShell
      eyebrow="Marketplace · blessings"
      title="Paid blessings"
      body="Request a memorial, supplication, or blessing prayed by a verified priest. Your offering funds the priest directly."
      tierBadge="Paid"
      ctaLabel="Upgrade to request a blessing"
    />
  );
}
