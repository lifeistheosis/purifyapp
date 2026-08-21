import { notFound } from "next/navigation";

import { getOwnerUser } from "@/lib/owner/access";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Owner dashboard preview" };

/**
 * The owner dashboard, openable on a dev machine.
 *
 * Same reason app/admin/shell-preview exists and the same bypass: /owner
 * cannot be opened locally at all, because the Supabase anon key in .env.local
 * is revoked and ADMIN_EMAILS is still the example placeholder, so
 * getOwnerUser() returns null and the real page 404s before rendering
 * anything. Loosening the gate itself would weaken every /api/owner route
 * behind it; a dev-only route weakens nothing.
 *
 * Nothing is exposed. /api/owner/actuals still runs its own gate and still
 * returns 403 here, so the dashboard renders its loading, empty and failure
 * states against a real endpoint, which are exactly the states a projection
 * screen is least likely to get looked at in.
 *
 * On Render NODE_ENV is "production" so this is a 404, and
 * scripts/native-build.mjs stashes the whole app/owner tree out of the native
 * export. Delete it alongside /admin/preview and /admin/shell-preview when
 * those go.
 */
export default async function OwnerPreviewPage() {
  const isDev = process.env.NODE_ENV === "development";
  const owner = await getOwnerUser();
  if (!isDev && !owner) notFound();
  return <OwnerDashboard ownerEmail={owner?.email ?? "dev@localhost"} />;
}
