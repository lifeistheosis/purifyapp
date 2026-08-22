import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { getOwnerUser } from "@/lib/owner/access";
import { AdminShell } from "@/components/admin/AdminShell";
// admin-theme.css is imported by app/admin/layout.tsx, which also sets the
// data-adm-theme attribute the stylesheet keys its light palette on.

// Always rendered fresh + never indexed; gated to admin emails.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getAdminUser();
  // Don't reveal the route to non-admins.
  if (!admin) notFound();

  // The second gate. getOwnerUser() is layered on getAdminUser(), so this is
  // one extra allowlist check against a session already resolved, not a
  // second round trip.
  //
  // What this boolean does and does not do: it decides whether the Owner
  // segment renders in the rail. It is not what keeps owner DATA or the
  // projection engine away from a non-owner, because a client prop cannot.
  // The data gate is app/api/owner/actuals/route.ts, and the code gate is
  // the fetch-then-import() in components/admin/OwnerSection.tsx.
  const owner = await getOwnerUser();

  return (
    // The shell owns its own ground and width now: the rail has to reach the
    // full height of the viewport, which a padded max-w wrapper prevented.
    <AdminShell adminEmail={admin.email ?? "admin"} isOwner={Boolean(owner)} />
  );
}
