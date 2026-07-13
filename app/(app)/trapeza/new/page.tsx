import { FeatureShell } from "@/components/feature/FeatureShell";
import { SubmitRecipeClient } from "@/components/trapeza/SubmitRecipeClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";

export const metadata = {
  title: "Share a Recipe",
  description: "Share a fasting recipe with the Purify community.",
};

export default function SubmitRecipePage() {
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
  return <SubmitRecipeClient />;
}
