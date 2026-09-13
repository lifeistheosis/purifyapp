import { NextResponse } from "next/server";
import { z } from "zod";

import { emailsByUserId, userIdByEmail } from "@/lib/admin/accountEmails";
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
  // Read profiles.email, a column that does not exist, and discarded the
  // 42703: every gift recipient rendered blank. See lib/admin/accountEmails.ts.
  const ids = [...new Set(rows.map((r) => r.user_id))] as string[];
  const emailById = await emailsByUserId(ids);

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

  // Resolve the account through auth, which is where emails live.
  //
  // THIS USED TO READ profiles.email, and profiles has no email column. The
  // GET handler above already carried the note about that 42703; the POST
  // handler never got the same fix. PostgREST answered every lookup with an
  // error, the error was not read, `data` was null, and every gift fell
  // through to "No Purify account uses that email", including gifts to
  // accounts that plainly existed. The comp route worked for the same address
  // because it asks auth directly. userIdByEmail is the tested helper the
  // stores, verification and owner-alert routes already use.
  const userId = await userIdByEmail(target);

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "No Purify account uses that email yet. Ask them to sign in once, then send the gift.",
      },
      { status: 404 },
    );
  }

  const { error } = await admin.from("gifts").insert({
    user_id: userId,
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
    email: target,
    tier: parsed.tier,
    days: parsed.days,
  });
}
