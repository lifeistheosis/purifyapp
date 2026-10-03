/**
 * EIKON, Purify's own store, told apart from the marketplace.
 *
 * The owner asked for EIKON as a store within the store (2026-09-30): its own
 * dark boutique and a told story on each piece, where the marketplace keeps
 * the ordinary shop. The spec named an `is_eikon` flag on products; nothing
 * needs one. Every product already carries its store, and EIKON's store row
 * was seeded with a fixed id in 20260704000000_shop_phase1.sql, so this compares
 * against that id. No migration, and a bundle already in the stores with an
 * older API still answers correctly, because the id is in every product it
 * has ever received.
 *
 * The server side reads the same fact from the store's `purify_owned` seller
 * (lib/shop/lowStockServer.ts); only the seeded store has that seller.
 */

export const EIKON_STORE_ID = "6e1b0000-0000-4000-8000-000000000002";

export function isEikonStore(store: { id?: string | null } | null | undefined): boolean {
  return store?.id === EIKON_STORE_ID;
}

export function isEikonProduct(product: { store_id?: string | null } | null | undefined): boolean {
  return product?.store_id === EIKON_STORE_ID;
}
