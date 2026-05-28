import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser, adminDebugEnabled } from "@/lib/admin/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only diagnostic for the OAuth-link state of the currently
 * signed-in user. Returns the identities array on the auth.users row
 * (the source of truth) plus the same array as seen via the public
 * session, so we can spot SDK staleness vs server-state mismatch.
 *
 * Use when /account/security shows "Not connected" but you believe a
 * Google account is linked. The truth lives here.
 */
export async function GET() {
  if (!adminDebugEnabled()) notFound();
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "no session" });
  }

  // Pull the canonical row via the admin API.
  const adminClient = createAdminClient();
  const { data: adminUserData, error: adminErr } =
    await adminClient.auth.admin.getUserById(sessionUser.id);

  const sessionIdentities = (sessionUser.identities ?? []).map((i) => ({
    provider: i.provider,
    identity_id: i.identity_id,
    email: (i.identity_data as { email?: string } | null)?.email ?? null,
    created_at: i.created_at,
  }));

  const adminIdentities = adminUserData?.user?.identities
    ? adminUserData.user.identities.map((i) => ({
        provider: i.provider,
        identity_id: i.identity_id,
        email: (i.identity_data as { email?: string } | null)?.email ?? null,
        created_at: i.created_at,
      }))
    : null;

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
      },
      sessionIdentities,
      adminIdentities,
      adminLookupError: adminErr?.message ?? null,
      sessionAheadOfAdmin:
        adminIdentities &&
        sessionIdentities.length !== adminIdentities.length,
      notes:
        adminIdentities &&
        adminIdentities.some((i) => i.provider === "google")
          ? "Google IS linked to this account on the server. If the UI shows 'Not connected,' the client SDK has a stale identities cache; hard-refresh /account/security."
          : "Google is NOT linked to this account. If linkIdentity is throwing 'already linked,' the Google ID is on a *different* Purify account.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
