import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin/access";
import { getOwnerUser } from "@/lib/owner/access";
import { AdminShell } from "@/components/admin/AdminShell";

// The real AdminShell, openable locally. Same posture and same bypass as
// app/admin/preview/page.tsx: always fresh, never indexed, and invisible to
// non-admins in production.
//
// It exists because /admin itself cannot be opened on a dev machine. Signing
// in locally is impossible (the Supabase anon key in .env.local is revoked)
// and ADMIN_EMAILS is still the example placeholder, so app/admin/page.tsx
// notFound()s before rendering anything. Loosening that gate, or the shared
// one in lib/admin/access.ts, would weaken the guard every admin API route
// depends on. A separate dev-only route weakens nothing.
//
// Nothing is exposed by rendering it. Every /api/admin route still runs its
// own getAdminUser() check and still returns 403 here, so the tabs render
// their loading, empty and error states against real endpoints. Those states
// are exactly the ones a theme change is most likely to break and least
// likely to get looked at.
//
// On Render NODE_ENV is "production" and this is a 404. scripts/native-build.mjs
// stashes the whole app/admin tree, so it never reaches the native export.
//
// Delete this alongside /admin/preview when the Polaris migration lands, per
// task 9 of docs/admin-rework.md.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin shell preview",
  robots: { index: false, follow: false },
};

export default async function AdminShellPreviewPage() {
  const isDev = process.env.NODE_ENV === "development";
  const admin = await getAdminUser();
  const owner = await getOwnerUser();

  if (!isDev && !admin) notFound();

  // isOwner is forced on in dev so the Operations | Owner switch is visible
  // while designing, which is the whole point of this route. It reveals
  // nothing: OwnerSection still asks /api/owner/actuals before it imports
  // anything, and that route still answers 403 on a dev machine with no
  // session. What renders here is the refusal state, which is a state worth
  // being able to look at.
  return (
    <AdminShell
      adminEmail={admin?.email ?? "dev@localhost"}
      isOwner={isDev || Boolean(owner)}
    />
  );
}
