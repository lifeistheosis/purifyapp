import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { emailsByUserId, findUserByEmail } from "@/lib/admin/users";
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

  // Attach recipient emails so the table is readable. Emails live in auth,
  // never in profiles, so this resolves through the auth admin API.
  const ids = [...new Set(rows.map((r) => r.user_id))];
  let emailById = new Map<string, string>();
  try {
    emailById = await emailsByUserId(admin, ids);
  } catch {
    // Non-fatal: the table still renders, just without addresses.
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

  // Resolve the account by email. Auth is the only source of truth: profiles
  // has no email column, and querying one made this route reject every address.
  let recipient;
  try {
    recipient = await findUserByEmail(admin, parsed.email);
  } catch (err) {
    // A lookup failure is NOT "no such account" — say so, or the next person
    // debugging this chases the same ghost.
    return NextResponse.json(
      {
        error: `Could not reach the account directory: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      },
      { status: 502 },
    );
  }

  if (!recipient) {
    return NextResponse.json(
      {
        error:
          "No Purify account uses that email yet. Ask them to sign in once, then send the gift.",
      },
      { status: 404 },
    );
  }

  const { error } = await admin.from("gifts").insert({
    user_id: recipient.id,
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
    email: recipient.email,
    tier: parsed.tier,
    days: parsed.days,
  });
}
