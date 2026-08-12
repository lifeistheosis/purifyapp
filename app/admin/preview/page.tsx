import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { PurifyShopifyAdmin } from "@/components/admin/preview/PurifyShopifyAdmin";

// Design preview for the Polaris-grade admin. Same posture as app/admin/page.tsx:
// always fresh, never indexed, and invisible to non-admins in production.
//
// The dev bypass exists so the design can actually be looked at. Signing in
// locally is currently impossible (the Supabase anon key in .env.local is
// revoked) and ADMIN_EMAILS is still the example placeholder, so an
// auth-only gate would make this page unopenable on this machine. The page
// renders sample data and reads nothing, so nothing is exposed by rendering it
// under `next dev`. On Render NODE_ENV is "production" and the admin gate is
// the only path in.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin preview",
  robots: { index: false, follow: false },
};

export default async function AdminPreviewPage() {
  const isDev = process.env.NODE_ENV === "development";
  const admin = await getAdminUser();

  if (!isDev && !admin) notFound();

  return <PurifyShopifyAdmin adminEmail={admin?.email ?? "preview@purifyapp.net"} />;
}
