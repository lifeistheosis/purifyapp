import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = {
  title: "Monasteries",
  description:
    "Support a monastery directly, wax, prosphora, prayer ropes, and produce from working communities. Coming soon.",
};

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
