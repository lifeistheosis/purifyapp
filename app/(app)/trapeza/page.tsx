import { FeatureShell } from "@/components/feature/FeatureShell";
import { TrapezaClient } from "@/components/trapeza/TrapezaClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";

export const metadata = {
  title: "The Trapeza",
  description:
    "Fasting-friendly recipes kept by the Purify community, filtered by fast level, season, and tradition.",
};

export default function TrapezaPage() {
  if (!trapezaEnabled()) {
    return (
      <FeatureShell
        eyebrow="The Trapeza"
        title="Fasting at the table"
        body="Recipes for the days of the fast, kept by the community. Coming soon."
        ctaLabel="See the recipes"
      />
    );
  }
  return <TrapezaClient />;
}
