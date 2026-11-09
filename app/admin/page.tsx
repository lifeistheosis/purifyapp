import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { adminAccess } from "@/lib/admin/access";
import { verifiedFactorCount } from "@/lib/admin/secondStep";
import { AdminSecondStep } from "@/components/admin/AdminSecondStep";
import { RAIL_COOKIE } from "@/lib/admin/rail";
import { getOwnerUser } from "@/lib/owner/access";
import { AdminShell } from "@/components/admin/AdminShell";
// admin-theme.css is imported by app/admin/layout.tsx, which also sets the
// data-adm-theme attribute the stylesheet keys its light palette on.

// Always rendered fresh + never indexed; gated to admin emails.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await adminAccess();
  // Don't reveal the route to non-admins.
  if (access.state === "none") notFound();

  // The second sign-in step (A4, lib/admin/secondStep.ts). An admin who has
  // added the code app types it before anything else renders, and every admin
  // route answers 403 until then; with ADMIN_MFA=required, an admin without
  // one adds it first. Nothing of the panel is sent before either.
  const email = access.user.email ?? "admin";
  if (access.state === "verify" || access.state === "enroll") {
    return <AdminSecondStep mode={access.state} email={email} />;
  }
  const admin = access.user;

  // Adding the code app by choice, from Settings: /admin?second-step=set-up.
  // Only while the account has none, so a stray link cannot start a second.
  const hasCode = verifiedFactorCount(admin.factors) > 0;
  if ((await searchParams)["second-step"] === "set-up" && !hasCode) {
    return <AdminSecondStep mode="enroll" email={email} optional />;
  }

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

  // The rail's order as this browser last worked it out from the usage log
  // (lib/admin/rail.ts). Read here so the rail is drawn in that order from
  // the first paint instead of moving once the page is up. Page ids only;
  // the shell checks every one and falls back to the picked rail.
  const savedRail = (await cookies()).get(RAIL_COOKIE)?.value ?? null;

  return (
    // The shell owns its own ground and width now: the rail has to reach the
    // full height of the viewport, which a padded max-w wrapper prevented.
    <AdminShell adminEmail={admin.email ?? "admin"} isOwner={Boolean(owner)} savedRail={savedRail} signInCode={hasCode} />
  );
}
