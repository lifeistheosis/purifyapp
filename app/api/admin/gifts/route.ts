import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send a claimable gift, and list recent ones.
 *
 * Unlike the comp grant (app/api/admin/subscriptions/comp), this writes NO
 * entitlement: it queues a row the reader opens themselves, and the claim
 * route grants the tier at that point. So a gift that is never claimed never
 * costs anything, and the grant extends rather than replaces their time.
 */
const giftSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["plus", "pro"]),
  days: z.number().int().min(1).max(3650),
  message: z.string().max(280).optional().nullable(),
});

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("gifts")
    .select("id, user_id, tier, days, message, created_by_email, created_at, claimed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as {
    user_id: string;
    [k: string]: unknown;
  }[];

  // Attach recipient emails so the table is readable.
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const emailById = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", ids);
    for (const p of (profiles ?? []) as { id: string; email: string }[]) {
      emailById.set(p.id, p.email);
    }
  }

  return NextResponse.json(
    {
      gifts: rows.map((r) => ({ ...r, email: emailById.get(r.user_id) ?? null })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parsed;
  try {
    parsed = giftSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const target = parsed.email.trim().toLowerCase();

  // Resolve the account by email through the profiles mirror.
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", target)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      {
        error:
          "No Purify account uses that email yet. Ask them to sign in once, then send the gift.",
      },
      { status: 404 },
    );
  }

  const { error } = await admin.from("gifts").insert({
    user_id: (profile as { id: string }).id,
    tier: parsed.tier,
    days: parsed.days,
    message: parsed.message?.trim() || null,
    created_by_email: adminUser.email ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: (profile as { email: string }).email,
    tier: parsed.tier,
    days: parsed.days,
  });
}
