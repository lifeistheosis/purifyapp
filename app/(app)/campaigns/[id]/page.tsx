import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

/**
 * Legacy pretty URL for a campaign. The real detail view is the query-string
 * route (/campaigns/detail?id=), because the native app ships a static export
 * with no server to resolve a dynamic segment: this whole directory is stashed
 * out of the bundle in scripts/native-build.mjs.
 *
 * It used to render a FeatureShell reading "Campaign #<uuid> ... Stubbed for
 * now", so any web visitor who guessed or was linked to /campaigns/<id> got a
 * fake page instead of the campaign. Redirecting keeps the link working.
 */
export default async function CampaignPage({ params }: { params: Params }) {
  const { id } = await params;
  redirect(`/campaigns/detail?id=${encodeURIComponent(id)}`);
}
