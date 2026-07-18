import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { cartSyncSchema } from "@/lib/security/schemas";
import { createClientFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Live cart sync. The client (lib/shop/cartSync) debounces a POST on every
 * cart change, carrying a client-generated cart token + the cart snapshot.
 * Guests are allowed (the token covers them); a signed-in session links the
 * row to the user. Recovery/analytics only — the server never trusts this
 * for money; checkout re-prices everything (lib/shop/checkout).
 *
 * Reachable from the native shell (cross-origin + Bearer), same as checkout.
 */
async function handlePOST(req: Request) {
  if (await rateLimited(`cart-sync:${ipKey(req.headers)}`, 60, 30)) {
    return NextResponse.json({ error: "Slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = cartSyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { cartToken, items, subtotalCents, currency } = parsed.data;

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  // An emptied cart clears the row rather than lingering as a stale "live
  // cart" in the admin view.
  if (itemCount === 0) {
    await admin.from("shop_carts").delete().eq("cart_token", cartToken);
    return NextResponse.json({ ok: true });
  }

  await admin.from("shop_carts").upsert(
    {
      cart_token: cartToken,
      user_id: user?.id ?? null,
      items,
      item_count: itemCount,
      subtotal_cents: subtotalCents,
      currency: currency ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cart_token" },
  );

  // Opportunistic GC: ~1% of writes prune carts untouched for 30+ days so
  // the table never accumulates abandoned guest rows forever.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
    await admin.from("shop_carts").delete().lt("updated_at", cutoff);
  }

  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
