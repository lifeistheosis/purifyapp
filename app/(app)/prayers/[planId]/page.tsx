import { FeatureShell } from "@/components/feature/FeatureShell";

type Params = Promise<{ planId: string }>;

export default async function PrayerPlanPage({ params }: { params: Params }) {
  const { planId } = await params;
  return (
    <FeatureShell
      eyebrow="Prayer plan"
      title={`Plan: ${planId}`}
      body="Plan detail view coming soon - day-by-day prayers, audio guides, and progress tracking."
    />
  );
}
