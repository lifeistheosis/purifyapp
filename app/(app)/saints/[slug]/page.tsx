import { FeatureShell } from "@/components/feature/FeatureShell";

type Params = Promise<{ slug: string }>;

export default async function SaintPage({ params }: { params: Params }) {
  const { slug } = await params;
  const name = slug.replace(/-/g, " ");
  return (
    <FeatureShell
      eyebrow="Saint"
      title={name}
      body="Saint detail: life, troparion, kontakion, icon, and selected writings. Content pipeline pending."
      tierBadge="Free"
    />
  );
}
