import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { emailsByUserId, userIdByEmail } from "@/lib/admin/accountEmails";
import { logActivity } from "@/lib/admin/activityLog";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { GRANTED_BADGES } from "@/lib/profile/badges";
import { normalizeHandle } from "@/lib/profile/handle";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The badges the team gives by hand: Purify Team, Moderator, Beta Tester,
 * Bug Hunter, Translator, Contributor (lib/profile/badges.ts). The automatic
 * ones (Plus, Pro, Verified, Early Reader, Ambassador) are not here: they
 * follow the tables they come from.
 *
 * user_badges has RLS on and no policy, so this route, behind
 * getAdminUser() and the service role, is the only way in. A reader is
 * named by email or by @handle and resolved to an account here; no auth
 * uuid is sent to the panel.
 */

type Grant = {
  handle: string | null;
  name: string | null;
  email: string | null;
  badge: string;
  granted_at: string;
  granted_by: string | null;
  note: string | null;
};

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_badges")
    .select("user_id, badge, granted_at, granted_by, note")
    .order("granted_at", { ascending: false })
    .limit(500);
  if (error) {
    if (isTableAbsent(error)) return NextResponse.json({ grants: [], unavailable: true });
    return NextResponse.json({ error: "The badge list could not be read." }, { status: 500 });
  }
  const rows = (data ?? []) as { user_id: string; badge: string; granted_at: string; granted_by: string | null; note: string | null }[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const [emails, profiles] = await Promise.all([
    emailsByUserId(ids),
    ids.length
      ? admin.from("profiles").select("id, handle, display_name").in("id", ids)
      : Promise.resolve({ data: [] as { id: string; handle: string | null; display_name: string | null }[] }),
  ]);
  const byId = new Map(
    ((profiles.data ?? []) as { id: string; handle: string | null; display_name: string | null }[]).map((p) => [p.id, p]),
  );
  const grants: Grant[] = rows.map((r) => ({
    handle: byId.get(r.user_id)?.handle ?? null,
    name: byId.get(r.user_id)?.display_name ?? null,
    email: emails.get(r.user_id) ?? null,
    badge: r.badge,
    granted_at: r.granted_at,
    granted_by: r.granted_by,
    note: r.note,
  }));
  return NextResponse.json({ grants }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z
  .object({
    email: z.string().trim().email().optional(),
    handle: z.string().trim().max(40).optional(),
    badge: z.enum(GRANTED_BADGES),
    grant: z.boolean(),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .refine((v) => Boolean(v.email) !== Boolean(v.handle), { message: "Give exactly one of email or handle." });

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { email, handle, badge, grant, note } = parsed.data;
  const admin = createAdminClient();

  let userId: string | null = null;
  if (email) {
    userId = await userIdByEmail(email);
    if (!userId) return NextResponse.json({ error: `No account with that email: ${email}` }, { status: 404 });
  } else {
    const h = normalizeHandle(handle!);
    const { data } = await admin.from("profiles").select("id").eq("handle", h).maybeSingle();
    userId = (data as { id: string } | null)?.id ?? null;
    if (!userId) return NextResponse.json({ error: `No reader with the handle @${h}` }, { status: 404 });
  }

  const write = grant
    ? admin
        .from("user_badges")
        .upsert(
          { user_id: userId, badge, granted_by: adminUser.email ?? "admin", note: note || null },
          { onConflict: "user_id,badge" },
        )
        .select("badge")
    : admin.from("user_badges").delete().eq("user_id", userId).eq("badge", badge).select("badge");
  const { data, error } = await write;
  if (error) {
    if (isTableAbsent(error)) {
      return NextResponse.json({ error: "Badges are not open yet: run the profiles migration first." }, { status: 409 });
    }
    console.warn("[admin] badge write failed", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }
  if (grant && (!data || data.length === 0)) {
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: grant ? "user.badge.grant" : "user.badge.revoke",
    entityType: "user_badges",
    entityId: userId,
    detail: { badge, note: note ?? null },
  });
  return NextResponse.json({ ok: true, removed: !grant && (data?.length ?? 0) > 0 });
}
