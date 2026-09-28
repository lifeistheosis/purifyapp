import { Suspense } from "react";

import { FeatureShell } from "@/components/feature/FeatureShell";
import { T } from "@/components/i18n/T";
import { KitchenRecipeClient } from "@/components/kitchen/KitchenRecipeClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";

export const metadata = {
  title: "Recipe",
  description: "A recipe for the fast from the Purify Kitchen.",
};

// ?id= rather than a dynamic segment: the apps ship a static export, and a
// recipe added after a build must still open in them.
export default function KitchenRecipePage() {
  if (!trapezaEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="kitchen.name" />}
        title={<T k="study.fastingAtTheTable" />}
        body={<T k="kitchen.comingSoon" />}
      />
    );
  }
  return (
    <Suspense fallback={null}>
      <KitchenRecipeClient />
    </Suspense>
  );
}
