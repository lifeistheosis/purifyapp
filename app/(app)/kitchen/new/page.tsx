import { FeatureShell } from "@/components/feature/FeatureShell";
import { T } from "@/components/i18n/T";
import { SubmitRecipeClient } from "@/components/kitchen/SubmitRecipeClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";

export const metadata = {
  title: "Share a Recipe",
  description: "Share a recipe for the fast with the Purify Kitchen.",
};

export default function KitchenSubmitPage() {
  if (!trapezaEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="kitchen.name" />}
        title={<T k="study.fastingAtTheTable" />}
        body={<T k="kitchen.comingSoon" />}
      />
    );
  }
  return <SubmitRecipeClient />;
}
