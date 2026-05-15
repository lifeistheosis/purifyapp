import { FeatureShell } from "@/components/feature/FeatureShell";

type Params = Promise<{ shopId: string }>;

export default async function ShopPage({ params }: { params: Params }) {
  const { shopId } = await params;
  return (
    <FeatureShell
      eyebrow="Shop"
      title={`Shop: ${shopId}`}
      body="Shop storefront: listings, artisan bio, reviews. Not yet wired to a real catalog."
      tierBadge="Free"
    />
  );
}
