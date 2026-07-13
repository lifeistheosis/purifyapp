import { Suspense } from "react";

import { FeatureShell } from "@/components/feature/FeatureShell";
import { TrapezaDetailClient } from "@/components/trapeza/TrapezaDetailClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";

export const metadata = {
  title: "Recipe",
  description: "A fasting recipe from the Purify Trapeza.",
};

export default function TrapezaDetailPage() {
  if (!trapezaEnabled()) {
    return (
      <FeatureShell
        eyebrow="The Trapeza"
        title="Fasting at the table"
        body="The Trapeza is coming soon."
        ctaLabel="See the recipes"
      />
    );
  }
  return (
    <Suspense fallback={null}>
      <TrapezaDetailClient />
    </Suspense>
  );
}
