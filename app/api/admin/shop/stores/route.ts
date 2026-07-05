import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import {
  createSellerAndStore,
  userIdByEmail,
} from "@/lib/shop/storeProvision";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Owner dashboard: sellers and stores. GET lists every seller + store
 * with the account email behind it and a listing count; POST creates a
 * store directly (with or without an application); PATCH is the small
 * bank of owner actions — attach/detach an account email, flip seller
 * and store status, edit the store's public copy.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [sellers, stores, products] = await Promise.all([
    admin.from("shop_sellers").select("*").order("created_at", { ascending: true }),
    admin.from("shop_stores").select("*").order("created_at", { ascending: true }),
    admin.from("shop_products").select("id, store_id, status"),
  ]);
  if (sellers.error) {
    return NextResponse.json({ error: sellers.error.message }, { status: 500 });
  }

  // Account emails via the profiles mirror, one IN query.
  const userIds = (sellers.data ?? [])
    .map((s) => s.user_id)
    .filter((v): v is string => Boolean(v));
  const emailById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    for (const p of profiles ?? []) emailById.set(p.id, p.email);
  }

  const countsByStore = new Map<string, { total: number; published: number }>();
  for (const p of products.data ?? []) {
    const row = countsByStore.get(p.store_id) ?? { total: 0, published: 0 };
    row.total += 1;
    if (p.status === "published") row.published += 1;
    countsByStore.set(p.store_id, row);
  }

  return NextResponse.json(
    {
      sellers: (sellers.data ?? []).map((s) => ({
        ...s,
        email: s.user_id ? (emailById.get(s.user_id) ?? null) : null,
      })),
      stores: (stores.data ?? []).map((st) => ({
        ...st,
        listings: countsByStore.get(st.id) ?? { total: 0, published: 0 },
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const createSchema = z.object({
  storeName: z.string().min(2).max(120),
  sellerType: z.enum([
    "purify_owned",
    "independent_iconographer",
    "monastery",
    "workshop",
    "retailer",
  ]),
  email: z.string().email().max(320).optional().nullable(),
  legalName: z.string().max(200).optional().nullable(),
  supportEmail: z.string().email().max(320).optional().nullable(),
  shippingOrigin: z.string().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  let userId: string | null = null;
  if (parsed.data.email) {
    userId = await userIdByEmail(parsed.data.email);
    if (!userId) {
      return NextResponse.json(
        { error: `No Purify account found for ${parsed.data.email}. They need to sign up first, or create the store unassigned.` },
        { status: 404 },
      );
    }
  }

  const result = await createSellerAndStore({
    storeName: parsed.data.storeName,
    sellerType: parsed.data.sellerType,
    userId,
    legalName: parsed.data.legalName ?? null,
    supportEmail: parsed.data.supportEmail ?? parsed.data.email ?? null,
    shippingOrigin: parsed.data.shippingOrigin ?? null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}

const patchSchema = z.object({
  // Attach/detach the account that gets the seller console.
  assignEmail: z
    .object({
      sellerId: z.string().uuid(),
      // null/empty detaches.
      email: z.string().email().max(320).nullable(),
    })
    .optional(),
  sellerStatus: z
    .object({
      sellerId: z.string().uuid(),
      status: z.enum(["active", "suspended", "closed"]),
    })
    .optional(),
  storeStatus: z
    .object({
      storeId: z.string().uuid(),
      status: z.enum(["draft", "live", "paused", "closed"]),
    })
    .optional(),
  storeFields: z
    .object({
      storeId: z.string().uuid(),
      tagline: z.string().max(200).optional().nullable(),
      description: z.string().max(4000).optional().nullable(),
      ownership_disclosure: z.string().min(3).max(500).optional(),
      operational_disclosure: z.string().max(1000).optional().nullable(),
      support_email: z.string().email().max(320).optional().nullable(),
      shipping_origin: z.string().max(200).optional().nullable(),
    })
    .optional(),
});

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (
    !parsed.success ||
    (!parsed.data.assignEmail &&
      !parsed.data.sellerStatus &&
      !parsed.data.storeStatus &&
      !parsed.data.storeFields)
  ) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (parsed.data.assignEmail) {
    const { sellerId, email } = parsed.data.assignEmail;
    let userId: string | null = null;
    if (email) {
      userId = await userIdByEmail(email);
      if (!userId) {
        return NextResponse.json(
          { error: `No Purify account found for ${email}.` },
          { status: 404 },
        );
      }
      // One seller per account: refuse to attach an account that
      // already owns a different seller.
      const { data: owned } = await admin
        .from("shop_sellers")
        .select("id")
        .eq("user_id", userId)
        .neq("id", sellerId)
        .maybeSingle();
      if (owned) {
        return NextResponse.json(
          { error: "That account already owns another store." },
          { status: 409 },
        );
      }
    }
    const { error } = await admin
      .from("shop_sellers")
      .update({ user_id: userId, updated_at: now })
      .eq("id", sellerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.sellerStatus) {
    const { sellerId, status } = parsed.data.sellerStatus;
    const { error } = await admin
      .from("shop_sellers")
      .update({ status, updated_at: now })
      .eq("id", sellerId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.storeStatus) {
    const { storeId, status } = parsed.data.storeStatus;
    const { error } = await admin
      .from("shop_stores")
      .update({ status, updated_at: now })
      .eq("id", storeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.storeFields) {
    const { storeId, ...fields } = parsed.data.storeFields;
    const { error } = await admin
      .from("shop_stores")
      .update({ ...fields, updated_at: now })
      .eq("id", storeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
