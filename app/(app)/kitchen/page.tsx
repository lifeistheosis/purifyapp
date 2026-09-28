import { FeatureShell } from "@/components/feature/FeatureShell";
import { T } from "@/components/i18n/T";
import { KitchenClient } from "@/components/kitchen/KitchenClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";

export const metadata = {
  title: "The Kitchen",
  description:
    "Recipes for every kind of fast day, from the strict days to the feasts, with photos, kept by the Purify kitchen and the community.",
};

// The recipe catalogue once called the Trapeza (renamed 2026-09-28). The old
// /trapeza addresses redirect here from next.config.ts.
export default function KitchenPage() {
  if (!trapezaEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="kitchen.name" />}
        title={<T k="study.fastingAtTheTable" />}
        body={<T k="kitchen.comingSoon" />}
      />
    );
  }
  return <KitchenClient />;
}
