import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllSettled } from "@/lib/supabase/pageAll";
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
  // order that ever reached Stripe, ids only. In pages all the same: one
  // request stops at 1,000 rows whatever .limit() asks for, and a charge
  // whose order was past that would have shown in the ledger as matching
  // nothing.
  const supa = createAdminClient();
  const { data: orders } = await pageAllSettled<{ id: string; stripe_payment_intent: string | null }>((from, to) =>
    supa
      .from("shop_orders")
      .select("id, stripe_payment_intent")
      .not("stripe_payment_intent", "is", null)
      .order("id")
      .range(from, to),
  );
  const orderByIntent = new Map<string, string>();
  for (const o of orders ?? []) {
    if (o.stripe_payment_intent) orderByIntent.set(o.stripe_payment_intent, o.id);
  }

  return NextResponse.json(await cachedLedger(range, orderByIntent));
}
