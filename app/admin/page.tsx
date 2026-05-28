import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { AdminShell } from "@/components/admin/AdminShell";

// Always rendered fresh + never indexed; gated to admin emails.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await getAdminUser();
  // Don't reveal the route to non-admins.
  if (!admin) notFound();

  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-10 md:py-14">
      <div className="mx-auto max-w-[1200px] w-full">
        <AdminShell adminEmail={admin.email ?? "admin"} />
      </div>
    </section>
  );
}
