import { Suspense } from "react";

import { FeatureShell } from "@/components/feature/FeatureShell";
import { TrapezaDetailClient } from "@/components/trapeza/TrapezaDetailClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Recipe",
  description: "A fasting recipe from the Purify Trapeza.",
};

export default function TrapezaDetailPage() {
  if (!trapezaEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="study.theTrapeza" />}
        title={<T k="study.trapeza.eyebrow" />}
        body="The Trapeza is coming soon."
        ctaLabel={<T k="study.trapeza.seeRecipes" />}
      />
    );
  }
  return (
    <Suspense fallback={null}>
      <TrapezaDetailClient />
    </Suspense>
  );
}
