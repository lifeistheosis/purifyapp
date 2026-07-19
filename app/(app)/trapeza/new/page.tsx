import { FeatureShell } from "@/components/feature/FeatureShell";
import { SubmitRecipeClient } from "@/components/trapeza/SubmitRecipeClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Share a Recipe",
  description: "Share a fasting recipe with the Purify community.",
};

export default function SubmitRecipePage() {
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
  return <SubmitRecipeClient />;
}
