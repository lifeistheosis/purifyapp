import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

// Always rendered fresh + never indexed; gated to admin emails.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getAdminUser();
  // Don't reveal the route to non-admins.
  if (!admin) notFound();

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-12 md:py-16">
      <div className="mx-auto max-w-[1100px] w-full">
        <AdminDashboard adminEmail={admin.email ?? "admin"} />
      </div>
    </section>
  );
}
