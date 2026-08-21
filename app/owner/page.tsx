import { notFound } from "next/navigation";

import { getOwnerUser } from "@/lib/owner/access";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Owner" };

/**
 * The strategic view: where the numbers are, where the model says they could
 * go, and which of the two any given figure is.
 *
 * Separate from /admin on purpose. The operational panel answers what
 * happened; this answers what it is worth and what it could become, which is
 * the half a future moderator should not inherit. Same person behind both
 * doors today, two doors anyway.
 */
export default async function OwnerPage() {
  const owner = await getOwnerUser();
  if (!owner) notFound();
  return <OwnerDashboard ownerEmail={owner.email ?? "owner"} />;
}
