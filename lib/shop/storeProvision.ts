import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Seller/store creation, shared by the application-provision endpoint
 * and the owner dashboard's direct "create store" path. Creation is
 * always an admin act; nothing here is reachable from a public route.
 */

export const SELLER_DISCLOSURES: Record<string, (name: string) => string> = {
  purify_owned: (n) => `${n} selects, inspects, and ships every icon it sells.`,
  independent_iconographer: (n) =>
    `${n} is an independent iconographer selling on Purify Shop.`,
  monastery: (n) => `${n} is a monastery community selling on Purify Shop.`,
  workshop: (n) => `${n} is an independent workshop selling on Purify Shop.`,
  retailer: (n) => `${n} is an independent retailer selling on Purify Shop.`,
};

export function defaultDisclosure(sellerType: string, name: string): string {
  return (
    SELLER_DISCLOSURES[sellerType]?.(name) ??
    `${name} is an independent seller on Purify Shop.`
  );
}

export function storeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "store"
  );
}

/** First free slug: name, name-2, name-3… bounded. */
export async function freeStoreSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  let slug = base;
  for (let attempt = 2; attempt <= 20; attempt++) {
    const { data: taken } = await admin
      .from("shop_stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

/** Exact-email account lookup through the profiles mirror. */
export async function userIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export type CreateSellerStoreInput = {
  storeName: string;
  sellerType: string;
  userId: string | null;
  legalName?: string | null;
  supportEmail?: string | null;
  shippingOrigin?: string | null;
  /**
   * What the applicant typed into "return policy" on the application form.
   *
   * It was collected, stored on the application row, and then never copied
   * anywhere, so it was orphaned there forever while
   * shop_stores.return_policy_md, which the storefront renders, stayed null on
   * every store. Asking somebody for their returns policy and then not using
   * it is worse than not asking.
   *
   * A starting point, not a final answer: the seller can rewrite it from the
   * Store section of their console the moment they sign in.
   */
  returnPolicy?: string | null;
};

export type CreateSellerStoreResult =
  | { ok: true; sellerId: string; storeId: string; slug: string }
  | { ok: false; error: string };

/**
 * Create seller + draft store. When userId is given and that user
 * already owns a seller, the existing seller is reused (one seller per
 * account) and only a missing store is added.
 */
export async function createSellerAndStore(
  input: CreateSellerStoreInput,
): Promise<CreateSellerStoreResult> {
  const admin = createAdminClient();

  let sellerId: string | undefined;
  if (input.userId) {
    const { data: existing } = await admin
      .from("shop_sellers")
      .select("id")
      .eq("user_id", input.userId)
      .maybeSingle();
    sellerId = existing?.id;
  }

  if (!sellerId) {
    const { data: seller, error } = await admin
      .from("shop_sellers")
      .insert({
        user_id: input.userId,
        seller_type: input.sellerType,
        public_name: input.storeName,
        legal_name: input.legalName ?? null,
        status: "active",
        verification_status: "verified",
      })
      .select("id")
      .single();
    if (error || !seller) {
      console.warn("[shop] seller create failed", error?.message);
      return { ok: false, error: "Couldn't create the seller." };
    }
    sellerId = seller.id;
  }

  const { data: existingStore } = await admin
    .from("shop_stores")
    .select("id, slug")
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (existingStore) {
    return {
      ok: true,
      sellerId: sellerId!,
      storeId: existingStore.id,
      slug: existingStore.slug,
    };
  }

  const slug = await freeStoreSlug(storeSlug(input.storeName));
  const { data: store, error } = await admin
    .from("shop_stores")
    .insert({
      seller_id: sellerId,
      slug,
      public_name: input.storeName,
      ownership_disclosure: defaultDisclosure(input.sellerType, input.storeName),
      support_email: input.supportEmail ?? null,
      shipping_origin: input.shippingOrigin ?? null,
      return_policy_md: input.returnPolicy?.trim() || null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !store) {
    console.warn("[shop] store create failed", error?.message);
    return { ok: false, error: "Couldn't create the store." };
  }
  return { ok: true, sellerId: sellerId!, storeId: store.id, slug };
}
