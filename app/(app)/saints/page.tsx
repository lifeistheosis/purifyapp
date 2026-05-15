import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = { title: "Saints - Purify" };

export default function SaintsPage() {
  return (
    <FeatureShell
      eyebrow="Saints"
      title="Saints' Works"
      body="Lives, writings, and sayings of the saints - Desert Fathers, Athonites, modern elders, and the great teachers of the Church."
      tierBadge="Free"
      ctaLabel="Browse saints"
    />
  );
}
