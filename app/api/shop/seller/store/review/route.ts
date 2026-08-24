import { NextResponse } from "next/server";
import { z } from "zod";

import { logActivity } from "@/lib/admin/activityLog";
import { rateLimited } from "@/lib/security/ratelimit";
import { shopEnabled } from "@/lib/shop/flags";
import { getSellerContext } from "@/lib/shop/seller";
import { sendStoreReviewRequestEmail } from "@/lib/shop/sellerEmails";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * "My store is ready. Please open it."
 *
 * This replaces the line in the seller overview that told a seller to write to
 * lifeistheosis@gmail.com to schedule the review that flips their store live.
 * That instruction asked the seller to compose the message this route composes
 * for them, gave them no idea what to put in it, and left no record anywhere
 * that they had asked.
 *
 * NO NEW TABLE AND NO NEW STATUS. shop_stores.status has a CHECK of exactly
 * (draft, live, paused, closed), so an "in_review" state would need a
 * migration, and a migration to record a request that resolves within a day is
 * the wrong trade. The request is a notification plus an activity-log line,
 * both of which already exist and neither of which can drift out of sync with
 * a status column.
 *
 * The listing count travels with it because it is the first thing an admin
 * would otherwise go and look up, and a store asking to open with zero
 * published listings is the common case worth catching before anybody clicks
 * through to a storefront.
 */

const schema = z.object({ note: z.string().max(1000).optional().nullable() });

export async function POST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  const ctx = await getSellerContext();
  if (ctx.state !== "seller" || !ctx.store) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (ctx.seller.status !== "active") {
    return NextResponse.json(
      { error: "Your seller account is not active." },
      { status: 403 },
    );
  }
  if (ctx.store.status === "live") {
    return NextResponse.json(
      { error: "Your store is already open." },
      { status: 409 },
    );
  }
  // Tight, because this sends mail to a human. Asking twice is fine; asking
  // twenty times in an afternoon is how a notification stops being read.
  if (await rateLimited(`shop-seller-review:${ctx.userId}`, 86400, 3)) {
    return NextResponse.json(
      { error: "You've already asked today. We'll be in touch shortly." },
      { status: 429 },
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // An empty body is a perfectly good request; the note is optional.
  }
  const parsed = schema.safeParse(body);
  const note = parsed.success ? (parsed.data.note ?? null) : null;

  const admin = createAdminClient();
  const { count } = await admin
    .from("shop_products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", ctx.store.id)
    .eq("status", "published");

  const sent = await sendStoreReviewRequestEmail({
    storeName: ctx.store.public_name,
    slug: ctx.store.slug,
    sellerEmail: ctx.store.support_email ?? null,
    publishedListings: count ?? 0,
    note,
  });

  // Recorded whether or not the mail went. If email is dark, this line in the
  // deploy log is the only trace that a seller asked, and an operator grepping
  // for it is better served than one who never hears at all.
  void logActivity({
    actorEmail: ctx.store.support_email ?? null,
    action: "store.review-requested",
    entityType: "shop_store",
    entityId: ctx.store.id,
    detail: {
      slug: ctx.store.slug,
      publishedListings: count ?? 0,
      note,
      emailed: sent.ok,
      bySellerUserId: ctx.userId,
    },
  });

  return NextResponse.json({ ok: true });
}
