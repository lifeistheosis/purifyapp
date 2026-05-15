import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = { title: "Monasteries - Purify" };

export default function MonasteriesPage() {
  return (
    <FeatureShell
      eyebrow="Marketplace · monasteries"
      title="Verified monasteries"
      body="Browse storefronts from verified Orthodox monasteries. Each is reviewed before going live. Verification workflow in development."
      tierBadge="Free"
    />
  );
}
