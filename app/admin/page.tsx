import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { AdminShell } from "@/components/admin/AdminShell";
import "./admin-theme.css";

// Always rendered fresh + never indexed; gated to admin emails.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getAdminUser();
  // Don't reveal the route to non-admins.
  if (!admin) notFound();

  return (
    // The shell owns its own ground and width now: the rail has to reach the
    // full height of the viewport, which a padded max-w wrapper prevented.
    <AdminShell adminEmail={admin.email ?? "admin"} />
  );
}
