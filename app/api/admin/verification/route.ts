import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { emailsByUserId } from "@/lib/admin/accountEmails";
import { logActivity } from "@/lib/admin/activityLog";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The verification queue: who asked, and the toggle that decides.
 *
 * ── Why this is admin-gated and service-role throughout ─────────────────
 *
 * A badge confers standing in a religious community, so the one thing that
 * must be impossible is granting it to yourself. public.user_verification has
 * insert, update and delete revoked from anon and authenticated
 * (20260826_community_reactions_and_verification.sql), and every write here
 * goes through the service role behind getAdminUser(). A reader may SELECT
 * their own row and nothing else.
 *
 * ── Emails come from GoTrue, not profiles ───────────────────────────────
 *
 * public.profiles has no email column and never has, which silently emptied
 * six admin surfaces before it was found. lib/admin/accountEmails.ts asks the
 * right system. An admin deciding whether to verify somebody needs to know who
 * they are looking at.
 *
 * ── Every decision is attributed ────────────────────────────────────────
 *
 * decided_by is the admin's email, on the row, and logActivity records it
 * separately. Not defensive bookkeeping: this is the write somebody will ask
 * about later, and "who verified that account" has to have an answer.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_verification")
    .select("user_id, status, claim, requested_at, decided_at, decided_by, note")
    // Requested first: the queue is the point of this screen, and a decided
    // row is history. Within that, oldest request first, so nobody is left
    // waiting because newer asks keep landing on top.
    .order("requested_at", { ascending: true })
    .limit(500);
  if (error) {
    // Bound and checked. An admin screen that answers 200 with an empty list
    // when the query failed is how a queue silently stops being worked.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const emails = await emailsByUserId(rows.map((r) => r.user_id as string));

  return NextResponse.json(
    {
      requests: rows.map((r) => ({
        ...r,
        email: emails.get(r.user_id as string) ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const patchSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["requested", "verified", "declined"]),
  note: z.string().max(2000).optional().nullable(),
});

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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  const { userId, status, note } = parsed.data;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // The prior status travels into the log, because the row is about to stop
  // holding it and "was this account verified before?" is the question that
  // gets asked after a badge is removed.
  const { data: before } = await admin
    .from("user_verification")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  const { data, error } = await admin
    .from("user_verification")
    .upsert(
      {
        user_id: userId,
        status,
        note: note ?? null,
        decided_at: status === "requested" ? null : now,
        decided_by: status === "requested" ? null : (adminUser.email ?? "admin"),
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select("user_id");
  if (error) {
    console.warn("[admin] verification write failed", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }
  // Rows matched, not "no error": PostgREST reports success for a write that
  // changed nothing, and an admin told a badge was granted when it was not
  // will find out from the person who asked.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "user.verification",
    entityType: "user_verification",
    entityId: userId,
    detail: { status, previous: before?.status ?? null, note },
  });

  return NextResponse.json({ ok: true, status });
}
