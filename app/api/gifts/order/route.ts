import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import {
  isOrderBuyer,
  orderDelivered,
  orderGiftMonths,
  orderNumberOf,
  plusRunning,
  type OrderGiftOrder,
  type OrderGiftState,
} from "@/lib/gifts/orderGift";
import { EIKON_STORE_ID } from "@/lib/shop/eikon";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The gift page's state (purifyapp.net/gift, the QR on the EIKON thank-you
 * card): is Plus already running, and which of the reader's EIKON orders
 * carry a gift and whether each is claimed.
 *
 * Reached cross-origin from the native shell with a Bearer token, like
 * /api/gifts/pending. Reads with the SERVICE ROLE because a guest order has no
 * user_id, so RLS cannot show it to the buyer; isOrderBuyer() is the gate
 * instead (their own order, or a guest order placed with the address they
 * have confirmed). Only the order number, the payment day and the gift state
 * leave this route: no address, no email, no money.
 */

const NO_STORE = { "Cache-Control": "no-store" };
const ORDER_COLS = "id, user_id, email, payment_status, fulfillment_status, paid_at, created_at";

type OrderRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  payment_status: string;
  fulfillment_status: string | null;
  paid_at: string | null;
  created_at: string;
};

async function handleGET(req: Request) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ signedIn: false } satisfies OrderGiftState, { headers: NO_STORE });
  }

  const reader = {
    id: user.id,
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
  const admin = createAdminClient();

  const own = admin
    .from("shop_orders")
    .select(ORDER_COLS)
    .eq("store_id", EIKON_STORE_ID)
    .eq("payment_status", "paid")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  // ilike for case; isOrderBuyer() below makes it exact, so a "_" in an
  // address can only widen this read, never hand over someone else's order.
  const guest =
    reader.emailConfirmed && user.email
      ? admin
          .from("shop_orders")
          .select(ORDER_COLS)
          .eq("store_id", EIKON_STORE_ID)
          .eq("payment_status", "paid")
          .is("user_id", null)
          .ilike("email", user.email)
          .order("created_at", { ascending: false })
          .limit(20)
      : null;
  const ent = admin
    .from("entitlements")
    .select("is_supporter, plus_until, plus_source, pro_until")
    .eq("user_id", user.id)
    .maybeSingle();

  const [ownRes, guestRes, entRes] = await Promise.all([own, guest, ent]);
  if (ownRes.error || guestRes?.error || entRes.error) {
    console.error(
      "[gifts/order] read failed",
      ownRes.error?.message ?? guestRes?.error?.message ?? entRes.error?.message,
    );
    return NextResponse.json({ error: "Could not load your gift." }, { status: 500, headers: NO_STORE });
  }

  const seen = new Set<string>();
  const rows = [...((ownRes.data ?? []) as OrderRow[]), ...((guestRes?.data ?? []) as OrderRow[])]
    .filter((o) => isOrderBuyer(o, reader))
    .filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
    .sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at));

  let claimedBy = new Map<string, string>();
  if (rows.length) {
    const { data: gifts, error } = await admin
      .from("gifts")
      .select("order_id, user_id")
      .in(
        "order_id",
        rows.map((o) => o.id),
      );
    if (error) {
      console.error("[gifts/order] gift read failed", error.message);
      return NextResponse.json({ error: "Could not load your gift." }, { status: 500, headers: NO_STORE });
    }
    claimedBy = new Map(
      ((gifts ?? []) as { order_id: string; user_id: string }[]).map((g) => [g.order_id, g.user_id]),
    );
  }

  const orders: OrderGiftOrder[] = rows
    .map((o) => {
      const paidAt = o.paid_at ?? o.created_at;
      const by = claimedBy.get(o.id);
      return {
        id: o.id,
        number: orderNumberOf(o.id),
        paidAt,
        months: orderGiftMonths(paidAt),
        delivered: orderDelivered(o.fulfillment_status),
        claimed: by !== undefined,
        mine: by === user.id,
      };
    })
    // Orders from before the gift began came without a card: not shown.
    .filter((o) => o.months > 0 || o.claimed);

  const state: OrderGiftState = {
    signedIn: true,
    plus: plusRunning(entRes.data),
    orders,
  };
  return NextResponse.json(state, { headers: NO_STORE });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
