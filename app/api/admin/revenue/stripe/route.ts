import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLedger, rangeFrom, type Ledger } from "@/lib/billing/stripeLedger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Stripe ledger for the Revenue tab. See lib/billing/stripeLedger.ts.
 *
 * Cached a minute per range in module memory: the tab polls on the same
 * 60s cadence as the rest of Revenue, and re-walking every balance
 * transaction on each poll would spend Stripe's rate limit on identical
 * bytes. A refresh from the panel inside the minute gets the cached copy;
 * the Freshness control says when it was fetched.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; body: Ledger }>();

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = req.nextUrl.searchParams.get("range") ?? "all";
  const hit = cache.get(range);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.body);

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

  const body = await fetchLedger({ from: rangeFrom(range), orderByIntent });
  // A failed read is not cached: the next poll should try again.
  if (!body.error) cache.set(range, { at: Date.now(), body });
  return NextResponse.json(body);
}
