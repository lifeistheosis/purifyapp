import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { cachedLedger } from "@/lib/billing/stripeLedger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Stripe ledger for the Revenue tab. See lib/billing/stripeLedger.ts,
 * which also holds the minute cache both this route and the revenue route
 * read through.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "all";

  // The one join to the books: payment intent -> order id. Small: every
  // order that ever reached Stripe, ids only.
  const supa = createAdminClient();
  const { data: orders } = await supa
    .from("shop_orders")
    .select("id, stripe_payment_intent")
    .not("stripe_payment_intent", "is", null)
    .limit(5000);
  const orderByIntent = new Map<string, string>();
  for (const o of (orders ?? []) as { id: string; stripe_payment_intent: string | null }[]) {
    if (o.stripe_payment_intent) orderByIntent.set(o.stripe_payment_intent, o.id);
  }

  return NextResponse.json(await cachedLedger(range, orderByIntent));
}
