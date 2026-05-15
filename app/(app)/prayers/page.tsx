import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = { title: "Prayer Plans - Purify" };

export default function PrayersPage() {
  return (
    <FeatureShell
      eyebrow="Prayer"
      title="Prayer Plans"
      body="Morning and evening rules, akathists, the Jesus Prayer, and seasonal plans for Lent and Pascha. Free for everyone."
      tierBadge="Free"
      ctaLabel="Browse plans"
    />
  );
}
