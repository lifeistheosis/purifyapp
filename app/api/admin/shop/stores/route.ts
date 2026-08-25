import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { emailsByUserId } from "@/lib/admin/accountEmails";
import { logActivity } from "@/lib/admin/activityLog";
import {
  canGoLive,
  connectStatus,
  COMMISSION_CEILING_BPS,
  COMMISSION_FLOOR_BPS,
} from "@/lib/shop/connect";
import {
  ensureStorePayoutsRow,
  getStorePayouts,
  setCommissionBps,
} from "@/lib/shop/payouts";
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
  const [sellers, stores, products, payouts] = await Promise.all([
    admin.from("shop_sellers").select("*").order("created_at", { ascending: true }),
    admin.from("shop_stores").select("*").order("created_at", { ascending: true }),
    admin.from("shop_products").select("id, store_id, status"),
    // Not fatal if absent: the migration is held unsigned, and the console
    // must still render every store while it waits.
    admin
      .from("shop_store_payouts")
      .select(
        "store_id, stripe_account_id, charges_enabled, payouts_enabled, commission_rate_bps, onboarding_started_at",
      ),
  ]);
  if (sellers.error) {
    return NextResponse.json({ error: sellers.error.message }, { status: 500 });
  }

  // Account emails. This used to read profiles.email, a column that does not
  // exist, with the error discarded: emailById was ALWAYS empty, so every
  // store rendered the "unassigned" pill even when a seller was attached.
  // EIKON is attached to a real account and has read as unassigned the whole
  // time. See lib/admin/accountEmails.ts.
  const userIds = (sellers.data ?? [])
    .map((s) => s.user_id)
    .filter((v): v is string => Boolean(v));
  const emailById = await emailsByUserId(userIds);

  const payoutsByStore = new Map<string, Record<string, unknown>>();
  for (const p of payouts.data ?? []) payoutsByStore.set(p.store_id, p);

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
      stores: (stores.data ?? []).map((st) => {
        const p = payoutsByStore.get(st.id) as
          | Parameters<typeof connectStatus>[0]
          | undefined;
        return {
          ...st,
          listings: countsByStore.get(st.id) ?? { total: 0, published: 0 },
          // The commission is safe HERE and nowhere else: this route is
          // admin-gated and served with the service role. It is deliberately
          // not a column on shop_stores, which is world-readable for live
          // stores. See 20260824_shop_connect.sql.
          payouts: {
            status: connectStatus(p),
            commissionRateBps: p?.commission_rate_bps ?? null,
            chargesEnabled: Boolean(p?.charges_enabled),
            payoutsEnabled: Boolean(p?.payouts_enabled),
          },
        };
      }),
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
  // The one term negotiated per seller. Basis points, so 1250 is 12.5%.
  storeCommission: z
    .object({
      storeId: z.string().uuid(),
      commissionRateBps: z
        .number()
        .int()
        .min(COMMISSION_FLOOR_BPS)
        .max(COMMISSION_CEILING_BPS),
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
      !parsed.data.storeCommission &&
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

    // A STORE WHOSE SELLER CANNOT BE PAID MUST NOT BE PUBLIC. Without this the
    // failure is silent and expensive: a buyer pays for an independent
    // seller's goods, the money settles in Purify's balance, and there is no
    // mechanism to forward it. Opening the store is the only moment that can
    // be prevented, because everything after it is a real customer.
    //
    // Purify-operated stores are exempt by seller_type, never by "has no
    // payouts row". Reading absence as ours would let every un-onboarded
    // stranger through the same gate.
    if (status === "live") {
      const { data: store } = await admin
        .from("shop_stores")
        .select("id, public_name, seller:shop_sellers(seller_type)")
        .eq("id", storeId)
        .maybeSingle();
      if (!store) {
        return NextResponse.json({ error: "Store not found." }, { status: 404 });
      }
      const seller = Array.isArray(store.seller) ? store.seller[0] : store.seller;
      const verdict = canGoLive({
        purifyOperated: seller?.seller_type === "purify_owned",
        payouts: await getStorePayouts(storeId),
      });
      if (!verdict.ok) {
        return NextResponse.json({ error: verdict.reason }, { status: 409 });
      }
    }

    const { error } = await admin
      .from("shop_stores")
      .update({ status, updated_at: now })
      .eq("id", storeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void logActivity({
      actorEmail: adminUser.email ?? null,
      action: "store.status",
      entityType: "shop_store",
      entityId: storeId,
      detail: { status },
    });
  }

  if (parsed.data.storeCommission) {
    const { storeId, commissionRateBps } = parsed.data.storeCommission;
    // The row may not exist yet: a rate can be agreed before the seller has
    // been anywhere near Stripe, and ensure preserves an existing rate rather
    // than resetting it to the default on the way past.
    const row = await ensureStorePayoutsRow(storeId);
    if (!row) {
      return NextResponse.json(
        { error: "Couldn't reach the payouts table. Is 20260824_shop_connect.sql applied?" },
        { status: 500 },
      );
    }
    const ok = await setCommissionBps(storeId, commissionRateBps);
    if (!ok) {
      return NextResponse.json({ error: "Couldn't save the commission." }, { status: 500 });
    }
    // The prior value is carried because the row no longer holds it, and a
    // renegotiated rate is exactly the kind of change somebody later disputes.
    void logActivity({
      actorEmail: adminUser.email ?? null,
      action: "store.commission",
      entityType: "shop_store",
      entityId: storeId,
      detail: {
        commissionRateBps,
        previous: { commissionRateBps: row.commission_rate_bps },
      },
    });
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
