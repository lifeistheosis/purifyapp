import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { emailsByUserId, userIdByEmail } from "@/lib/admin/accountEmails";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { logMod, moderatorFor } from "@/lib/community/moderation";
import { CLERGY_RANKS } from "@/lib/profile/clergy";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The verified clergy queue (clergy_verifications, 20261005): who asked, what
 * they said about themselves and how to check it, and the decision.
 *
 * The seal confers standing in a church, so the one thing that must be
 * impossible is granting it to yourself: the table takes no writes from a
 * browser, and every decision here is the service role behind the admin
 * allowlist, recorded on the row (decided_by) and in the moderation log.
 * The team may also verify somebody who never asked, by email.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clergy_verifications")
    .select("user_id, status, rank, jurisdiction, parish, evidence, requested_at, decided_at, decided_by, note")
    // Waiting first, oldest first: a queue sorted newest-first quietly stops
    // being a queue.
    .order("requested_at", { ascending: true })
    .limit(500);
  if (error) {
    if (isTableAbsent(error)) return NextResponse.json({ live: false, requests: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as { user_id: string }[];
  const ids = rows.map((r) => r.user_id);
  const [emails, handles] = await Promise.all([
    emailsByUserId(ids),
    ids.length ? admin.from("profiles").select("id, handle").in("id", ids) : Promise.resolve({ data: [] }),
  ]);
  const handleOf = new Map(((handles.data ?? []) as { id: string; handle: string | null }[]).map((p) => [p.id, p.handle]));
  return NextResponse.json(
    {
      live: true,
      requests: rows.map((r) => ({ ...r, email: emails.get(r.user_id) ?? null, handle: handleOf.get(r.user_id) ?? null })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const patchSchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().trim().email().optional(),
    status: z.enum(["requested", "verified", "declined"]),
    rank: z.enum(CLERGY_RANKS).optional().nullable(),
    jurisdiction: z.string().trim().max(80).optional().nullable(),
    parish: z.string().trim().max(80).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .refine((v) => Boolean(v.userId) !== Boolean(v.email), { message: "Give exactly one of userId or email." });

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  const p = parsed.data;
  const userId = p.userId ?? (await userIdByEmail(p.email!));
  if (!userId) return NextResponse.json({ error: `No account with that email: ${p.email}` }, { status: 404 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: before } = await admin.from("clergy_verifications").select("status, rank").eq("user_id", userId).maybeSingle();
  const patch: Record<string, unknown> = {
    user_id: userId,
    status: p.status,
    decided_at: p.status === "requested" ? null : now,
    decided_by: p.status === "requested" ? null : (adminUser.email ?? "admin"),
    updated_at: now,
  };
  if (p.rank !== undefined) patch.rank = p.rank;
  if (p.jurisdiction !== undefined) patch.jurisdiction = p.jurisdiction || null;
  if (p.parish !== undefined) patch.parish = p.parish || null;
  if (p.note !== undefined) patch.note = p.note || null;
  if (!before) patch.requested_at = now;

  const { data, error } = await admin.from("clergy_verifications").upsert(patch, { onConflict: "user_id" }).select("user_id");
  if (error) {
    if (isTableAbsent(error)) return NextResponse.json({ error: "Clergy verification opens with 20261005000000_community_three.sql." }, { status: 409 });
    console.warn("[admin/clergy] write failed", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }
  // Rows matched, not "no error": a decision that changed nothing must not
  // read as granted.
  if (!data || data.length === 0) return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });

  const actor = await moderatorFor(admin, adminUser);
  if (actor) {
    const prev = before as { status?: string; rank?: string | null } | null;
    await logMod(admin, actor, {
      action: `clergy_${p.status}`,
      target: "clergy",
      targetId: null,
      summary: `${p.rank ?? prev?.rank ?? "clergy"}${prev?.status ? `, was ${prev.status}` : ""}`,
    });
  }
  return NextResponse.json({ ok: true, status: p.status });
}
