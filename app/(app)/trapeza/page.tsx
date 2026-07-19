import { FeatureShell } from "@/components/feature/FeatureShell";
import { TrapezaClient } from "@/components/trapeza/TrapezaClient";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "The Trapeza",
  description:
    "Fasting-friendly recipes kept by the Purify community, filtered by fast level, season, and tradition.",
};

export default function TrapezaPage() {
  if (!trapezaEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="study.theTrapeza" />}
        title={<T k="study.trapeza.eyebrow" />}
        body={<T k="study.trapeza.comingSoonBody" />}
        ctaLabel={<T k="study.trapeza.seeRecipes" />}
      />
    );
  }
  return <TrapezaClient />;
}
