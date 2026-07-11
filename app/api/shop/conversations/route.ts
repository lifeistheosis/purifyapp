import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { rateLimited } from "@/lib/security/ratelimit";
import { shopConversationStartSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * A buyer opens a conversation with a store. Signed-in only: threads
 * belong to accounts, not emails. The thread anchors to an order or a
 * product when one is named, and the server resolves the store from
 * that anchor — the client can never point a thread at a store the
 * anchor doesn't belong to. Inserts run with the service role (writes
 * never happen under RLS), after this route has proven ownership.
 */
async function handlePOST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  }
  if (await rateLimited(`shop-conv:${user.id}`, 3600, 20)) {
    return NextResponse.json(
      { error: "Too many new conversations. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopConversationStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Resolve the store through the anchor. Reads use the caller's own
  // client so RLS proves ownership of the order for free.
  let storeId: string | null = null;
  let sellerId: string | null = null;
  let orderId: string | null = null;
  let productId: string | null = null;

  if (data.orderId) {
    const { data: order } = await supabase
      .from("shop_orders")
      .select("id, store_id, seller_id, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    orderId = order.id;
    storeId = order.store_id;
    sellerId = order.seller_id;
  } else if (data.productSlug) {
    const { data: product } = await supabase
      .from("shop_products")
      .select("id, store_id, seller_id")
      .eq("slug", data.productSlug)
      .maybeSingle();
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    productId = product.id;
    storeId = product.store_id;
    sellerId = product.seller_id;
  } else if (data.storeSlug) {
    const { data: store } = await supabase
      .from("shop_stores")
      .select("id, seller_id")
      .eq("slug", data.storeSlug)
      .maybeSingle();
    if (!store) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }
    storeId = store.id;
    sellerId = store.seller_id;
  } else {
    return NextResponse.json(
      { error: "Name an order, product, or store to message about." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Reuse an existing open thread on the same anchor rather than
  // splintering the same question across threads: order-anchored
  // messages join that order's thread, everything else joins the
  // buyer's general thread with the store.
  let reuseQuery = admin
    .from("shop_conversations")
    .select("id")
    .eq("buyer_user_id", user.id)
    .eq("store_id", storeId)
    .eq("status", "open")
    .order("last_message_at", { ascending: false })
    .limit(1);
  reuseQuery = orderId
    ? reuseQuery.eq("order_id", orderId)
    : reuseQuery.is("order_id", null);
  const { data: reuseRows } = await reuseQuery;
  const reuse = reuseRows?.[0] ?? null;

  let conversationId: string;
  if (reuse) {
    conversationId = reuse.id;
  } else {
    const { data: conv, error } = await admin
      .from("shop_conversations")
      .insert({
        store_id: storeId,
        seller_id: sellerId,
        buyer_user_id: user.id,
        order_id: orderId,
        product_id: productId,
        subject: data.subject,
      })
      .select("id")
      .single();
    if (error || !conv) {
      console.warn("[shop] conversation insert failed", error?.message);
      return NextResponse.json(
        { error: "Couldn't start the conversation. Please try again." },
        { status: 500 },
      );
    }
    conversationId = conv.id;
  }

  const now = new Date().toISOString();
  const { error: msgError } = await admin.from("shop_messages").insert({
    conversation_id: conversationId,
    sender: "buyer",
    sender_user_id: user.id,
    body: data.body,
  });
  if (msgError) {
    console.warn("[shop] message insert failed", msgError.message);
    return NextResponse.json(
      { error: "Couldn't send the message. Please try again." },
      { status: 500 },
    );
  }
  await admin
    .from("shop_conversations")
    .update({ last_message_at: now, buyer_last_read_at: now })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true, conversationId });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
