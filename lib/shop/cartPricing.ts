/**
 * The cart's preview of what checkout will charge: each line at its deal price
 * while the deal is live, the subtotal, and what the deals saved.
 *
 * A PREVIEW. Checkout recomputes all of it from the database
 * (lib/shop/checkout.ts) and never reads a number from here; this exists so the
 * cart and the drawer show the same figures the Stripe page will.
 */

export type PreviewDeal = { percent: number; unitCents: number; listCents: number; endsAt: number };

export type PreviewLine = {
  slug: string;
  quantity: number;
  /** The price the cart stored when the item was added. */
  priceCents: number;
};

export type CartPreview = {
  subtotalCents: number;
  savingsCents: number;
  /** The live deal per slug, only for lines whose deal has not ended. */
  deals: Record<string, PreviewDeal>;
};

export function previewCart(
  lines: readonly PreviewLine[],
  deals: Readonly<Record<string, PreviewDeal>> | null | undefined,
  now: number,
): CartPreview {
  let subtotalCents = 0;
  let savingsCents = 0;
  const live: Record<string, PreviewDeal> = {};
  for (const l of lines) {
    const d = deals?.[l.slug];
    // A deal priced off a list price the cart no longer shows (the owner
    // changed the price since) is left out of the preview; checkout decides.
    if (d && d.endsAt > now && d.listCents === l.priceCents && d.unitCents < l.priceCents) {
      live[l.slug] = d;
      subtotalCents += d.unitCents * l.quantity;
      savingsCents += (l.priceCents - d.unitCents) * l.quantity;
    } else {
      subtotalCents += l.priceCents * l.quantity;
    }
  }
  return { subtotalCents, savingsCents, deals: live };
}
