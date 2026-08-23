import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Grant a COMPLIMENTARY Plus/Pro subscription to an existing account, for
 * mobile testers / reviewers. Admin-gated + service role. Writes the
 * entitlements row with plus_source = "comp" so it is always excluded from
 * paid/MRR counts and shown under "Comped" in the dashboard.
 *
 * Identified by email (the account the tester signed in with); the account
 * must already exist (they sign in once, then get comped).
 */
const schema = z.object({
  email: z.string().email().max(320),
  tier: z.enum(["plus", "pro"]),
  days: z.number().int().min(1).max(3660), // up to ~10 years
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { email, tier, days } = parsed.data;
  const target = email.trim().toLowerCase();

  const admin = createAdminClient();

  // Resolve email -> account. profiles has no email column, so the source of
  // truth is auth; page through it (lists are small) until we find a match.
  let userId: string | null = null;
  let name: string | null = null;
  for (let page = 1; page <= 25 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) break;
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) {
      userId = hit.id;
      const md = (hit.user_metadata ?? {}) as {
        full_name?: string;
        name?: string;
      };
      name = md.full_name ?? md.name ?? null;
    }
    if (users.length < 200) break; // reached the last page
  }

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "No Purify account uses that email yet. Ask them to sign in once, then grant the comp.",
      },
      { status: 404 },
    );
  }

  const until = new Date(Date.now() + days * 86_400_000).toISOString();

  // Read the row BEFORE overwriting it. This upsert is destructive in three
  // ways at once: plus_until is REPLACED rather than extended, plus_source
  // becomes "comp" so the record that this account ever PAID is gone, and
  // pro_until is nulled on a Plus comp. entitlements has no actor column and no
  // history, so unless the prior values are captured here they survive nowhere.
  const { data: previous } = await admin
    .from("entitlements")
    .select("plus_until, pro_until, plus_source, is_supporter")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await admin.from("entitlements").upsert(
    {
      user_id: userId,
      plus_until: until,
      plus_source: "comp",
      // Pro implies Plus; a Plus comp clears any Pro so the tier is exactly
      // what the admin picked.
      pro_until: tier === "pro" ? until : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire and forget: this cannot fail the grant. Until
  // supabase/migrations/20260823_admin_activity_log.sql is applied the record
  // lives in the Render deploy log, greppable as "tag":"admin-activity".
  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "comp.grant",
    entityType: "entitlement",
    entityId: userId,
    detail: { tier, days, until, email, previous: previous ?? null },
  });

  return NextResponse.json({
    ok: true,
    userId,
    name,
    email: target,
    tier: tier === "pro" ? "Pro" : "Plus",
    until,
  });
}
