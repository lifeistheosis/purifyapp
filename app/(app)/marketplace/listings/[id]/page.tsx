import { FeatureShell } from "@/components/feature/FeatureShell";

type Params = Promise<{ id: string }>;

export default async function ListingPage({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <FeatureShell
      eyebrow="Listing"
      title={`Listing #${id}`}
      body="Listing detail: images, description, seller, price, shipping. Stubbed."
      tierBadge="Free"
    />
  );
}
