import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Tell me when it is back", on a sold-out product.
 *
 * The highest-intent email in retail, and it segments itself: the reader asked
 * about this one piece. So it is a requested alert, not the shop list: it needs
 * no marketing consent, fires once when the piece comes back
 * (lib/email/stockAlerts.ts), and is done.
 *
 * Signed in only, because the email goes to the account's address and nothing
 * here collects one. corsRoute for the app, the same as the other signed-in
 * routes.
 */

const Body = z.object({ productId: z.string().uuid() });

async function userFrom(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function handleGET(req: Request) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ alerted: false, signedIn: false });
  const productId = new URL(req.url).searchParams.get("productId") ?? "";
  if (!z.string().uuid().safeParse(productId).success) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }
  const { data, error } = await createAdminClient()
    .from("stock_alerts")
    .select("id, notified_at")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Alerts are not available yet." }, { status: 503 });
  const row = data as { notified_at: string | null } | null;
  return NextResponse.json({ alerted: !!row && !row.notified_at, signedIn: true });
}

async function handlePOST(req: Request) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: "Sign in to be told when it is back." }, { status: 401 });
  if (await rateLimited(`stock-alert:${user.id ?? ipKey(req.headers)}`, 60, 20)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown product." }, { status: 400 });

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("shop_products")
    .select("id, status, inventory_status")
    .eq("id", parsed.data.productId)
    .maybeSingle();
  const p = product as { status: string; inventory_status: string } | null;
  if (!p || p.status !== "published") return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  if (p.inventory_status !== "out_of_stock") {
    return NextResponse.json({ error: "This piece is available now." }, { status: 409 });
  }

  // A reader who was told once and asks again gets a fresh alert.
  const { error } = await admin
    .from("stock_alerts")
    .upsert(
      { user_id: user.id, product_id: parsed.data.productId, notified_at: null, created_at: new Date().toISOString() },
      { onConflict: "user_id,product_id" },
    );
  if (error) return NextResponse.json({ error: "Alerts are not available yet." }, { status: 503 });
  return NextResponse.json({ alerted: true, signedIn: true });
}

async function handleDELETE(req: Request) {
  const user = await userFrom(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("stock_alerts")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", parsed.data.productId);
  if (error) return NextResponse.json({ error: "Alerts are not available yet." }, { status: 503 });
  return NextResponse.json({ alerted: false, signedIn: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
