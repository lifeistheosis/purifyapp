import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import {
  giftDays,
  isOrderBuyer,
  orderDelivered,
  orderGiftMonths,
  parseOrderNumber,
  zipMatches,
  type OrderGiftResult,
} from "@/lib/gifts/orderGift";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { EIKON_STORE_ID } from "@/lib/shop/eikon";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Claim the Purify Plus an EIKON order came with.
 *
 * Two ways in:
 *   { orderId }            the buyer, from the list /api/gifts/order showed
 *                          them. Re-checked here: their own order, or a guest
 *                          order placed with the address they have confirmed.
 *   { orderNumber, zip }   anyone holding the parcel (an icon given as a
 *                          present): the EIK number and the ZIP, both on the
 *                          parcel's label. A wrong number and a wrong ZIP get
 *                          the same answer, and the reader gets 8 tries an
 *                          hour, so a number seen in a support thread is not
 *                          enough to take someone's gift.
 *
 * The gift opens only for an order marked delivered (the card is inside the
 * parcel), and only through this route, which only the gift page calls: the
 * owner's "the reason it gives them the gift is because they went through the
 * gift. And also, if their order is marked as delivered" (2026-11-06).
 *
 * The months come from lib/gifts/orderGift.ts by the day the order was paid.
 * The claim, the one-per-order rule and "write nothing while Plus or Pro is
 * running" are all in claim_order_gift (20261111172547_order_gifts.sql), in
 * one transaction, with the SERVICE ROLE. The reader's identity comes from
 * their own token, never from the body.
 */

const bodySchema = z.union([
  z.object({ orderId: z.string().uuid() }).strict(),
  z
    .object({
      orderNumber: z.string().trim().min(1).max(40),
      zip: z.string().trim().min(1).max(20),
    })
    .strict(),
]);

type OrderRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  payment_status: string;
  fulfillment_status: string | null;
  paid_at: string | null;
  created_at: string;
  shipping_address: { address?: { postal_code?: string | null } | null } | null;
};

const ORDER_COLS =
  "id, user_id, email, payment_status, fulfillment_status, paid_at, created_at, shipping_address";

function answer(result: OrderGiftResult, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ result, ...extra }, { headers: { "Cache-Control": "no-store" } });
}

async function handlePOST(req: Request) {
  if (await rateLimited(`order-gift:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a little while." },
      { status: 429 },
    );
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const body = parsed.data;
  const admin = createAdminClient();

  let order: OrderRow | null = null;

  if ("orderId" in body) {
    const { data, error } = await admin
      .from("shop_orders")
      .select(ORDER_COLS)
      .eq("id", body.orderId)
      .eq("store_id", EIKON_STORE_ID)
      .maybeSingle();
    if (error) {
      console.error("[gifts/order/claim] order read failed", error.message);
      return NextResponse.json({ error: "Claim failed." }, { status: 500 });
    }
    const row = data as OrderRow | null;
    const reader = {
      id: user.id,
      email: user.email,
      emailConfirmed: Boolean(user.email_confirmed_at),
    };
    // Not theirs reads exactly like not there.
    if (!row || !isOrderBuyer(row, reader)) return answer("no_order");
    order = row;
  } else {
    if (await rateLimited(`order-gift-number:${user.id}`, 3600, 8)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a little while." },
        { status: 429 },
      );
    }
    const hex = parseOrderNumber(body.orderNumber);
    if (!hex) return answer("no_order");
    const { data: ids, error: findError } = await admin.rpc("eikon_order_by_number", { p_hex: hex });
    if (findError) {
      console.error("[gifts/order/claim] lookup failed", findError.message);
      return NextResponse.json({ error: "Claim failed." }, { status: 500 });
    }
    const matches = (ids ?? []) as { id: string }[];
    // Two orders sharing the 8 characters: refuse rather than guess.
    if (matches.length !== 1) return answer("no_order");
    const { data, error } = await admin
      .from("shop_orders")
      .select(ORDER_COLS)
      .eq("id", matches[0].id)
      .maybeSingle();
    if (error) {
      console.error("[gifts/order/claim] order read failed", error.message);
      return NextResponse.json({ error: "Claim failed." }, { status: 500 });
    }
    const row = data as OrderRow | null;
    if (!row || !zipMatches(body.zip, row.shipping_address?.address?.postal_code)) {
      return answer("no_order");
    }
    order = row;
  }

  if (order.payment_status !== "paid") return answer("not_paid");
  const months = orderGiftMonths(order.paid_at ?? order.created_at);
  if (months <= 0) return answer("not_eligible");
  // claim_order_gift holds this rule too; asked here first so an order still
  // on its way costs no database write.
  if (!orderDelivered(order.fulfillment_status)) return answer("not_delivered");

  const { data: claimed, error: claimError } = await admin
    .rpc("claim_order_gift", {
      p_order_id: order.id,
      p_user_id: user.id,
      p_days: giftDays(months),
    })
    .maybeSingle();
  if (claimError || !claimed) {
    console.error("[gifts/order/claim] claim_order_gift failed", claimError?.message ?? "no row");
    return NextResponse.json({ error: "Claim failed." }, { status: 500 });
  }

  const row = claimed as { result: OrderGiftResult; plus_until: string | null };
  return answer(row.result, { months, plusUntil: row.plus_until });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
