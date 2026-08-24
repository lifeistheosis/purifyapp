import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/security/ratelimit";
import { shopSellerStoreSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { getSellerContext } from "@/lib/shop/seller";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * A seller edits their own store page.
 *
 * WHY THIS EXISTS. A seller could edit NOTHING about their store. storeFields
 * on the admin route had zero callers anywhere in the repo, so even an admin
 * had to hand-craft a PATCH, and four columns were reachable by nobody at all:
 * logo_url, banner_url, shipping_policy_md and return_policy_md. The last two
 * already render on the storefront (components/shop/StoreClient.tsx) and
 * simply could never be filled in, which is why every storefront fell back to
 * two hardcoded trust claims that belonged to EIKON.
 *
 * That single gap is why the console read as a supplier portal rather than a
 * shop the seller runs.
 *
 * WHAT A SELLER MAY NOT EDIT, and why it is not an oversight: public_name,
 * slug, status, ownership_disclosure and operational_disclosure. Those tell a
 * buyer who they are buying from and how the goods reach them. A seller
 * rewriting their own disclosure is exactly what disclosure exists to prevent,
 * and a seller flipping their own status to live would walk straight past the
 * payout gate in lib/shop/connect.ts. All five stay on the admin route.
 *
 * The write uses the service role rather than the caller's session, and the
 * store id comes from getSellerContext rather than the request body. There is
 * no id in the schema at all, so there is nothing for a caller to substitute.
 */

const EDITABLE = [
  "tagline",
  "description",
  "support_email",
  "shipping_origin",
  "shipping_policy_md",
  "return_policy_md",
  "logo_url",
  "banner_url",
] as const;

export async function GET() {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!ctx.store) {
    return NextResponse.json({ store: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const store = ctx.store as unknown as Record<string, unknown>;
  return NextResponse.json(
    {
      store: {
        // Read-only context, so the form can show what it cannot change
        // instead of pretending those fields do not exist.
        public_name: store.public_name ?? null,
        slug: store.slug ?? null,
        status: store.status ?? null,
        ownership_disclosure: store.ownership_disclosure ?? null,
        ...Object.fromEntries(EDITABLE.map((k) => [k, store[k] ?? null])),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(req: Request) {
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
  if (await rateLimited(`shop-seller-store:${ctx.userId}`, 3600, 120)) {
    return NextResponse.json(
      { error: "Too many updates. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopSellerStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update." },
      { status: 400 },
    );
  }

  // Only the keys actually sent. Spreading the parsed object wholesale would
  // write null over every field the form did not include, which is how a
  // seller editing their tagline erases their returns policy.
  const values: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in (body as Record<string, unknown>)) {
      values[key] = (parsed.data as Record<string, unknown>)[key] ?? null;
    }
  }
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  values.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_stores")
    .update(values)
    .eq("id", ctx.store.id)
    .select("id");
  if (error) {
    console.warn("[shop] seller store update failed", error.message);
    return NextResponse.json({ error: "Couldn't save your store." }, { status: 500 });
  }
  // Rows matched, not "no error": PostgREST reports success for an UPDATE that
  // changed nothing, and a seller told their policy saved when it did not will
  // find out from a buyer.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Couldn't save your store." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, fields: Object.keys(values).length - 1 });
}
