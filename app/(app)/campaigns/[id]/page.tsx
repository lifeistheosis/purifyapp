import { FeatureShell } from "@/components/feature/FeatureShell";

type Params = Promise<{ id: string }>;

export default async function CampaignPage({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <FeatureShell
      eyebrow="Campaign"
      title={`Campaign #${id}`}
      body="Campaign detail: intentions, prayer list, participants, and updates. Stubbed for now."
      tierBadge="Free"
    />
  );
}
