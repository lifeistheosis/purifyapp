import { NO_PROMOTIONS, priceCart, type PricedCart, type PromoConfig, type PromoLine } from "./promotions";
import type { SetRole } from "./sets";

/**
 * The cart's preview of what checkout will charge: each line at its best price
 * (a live cart deal, the prayer corner set, the multi-buy price), the
 * subtotal, and what the offers saved.
 *
 * A PREVIEW. Checkout recomputes all of it from the database
 * (lib/shop/checkout.ts) and never reads a number from here; this exists so the
 * cart and the drawer show the same figures the Stripe page will. The pricing
 * itself is lib/shop/promotions.ts, which checkout runs too.
 */

export type PreviewDeal = { percent: number; unitCents: number; listCents: number; endsAt: number };

export type PreviewLine = {
  slug: string;
  quantity: number;
  /** The price the cart stored when the item was added. */
  priceCents: number;
  /** The place the piece can take in a set. Unknown means none. */
  role?: SetRole | null;
  /** Sold by Purify's own store, which the standing offers apply to. */
  eligible?: boolean;
};

export type CartPreview = {
  subtotalCents: number;
  savingsCents: number;
  /**
   * The live deal per slug, only for lines whose deal has not ended AND is
   * what the line is charged: a set price that beats the deal wins, and the
   * deal's countdown then has nothing to count down to.
   */
  deals: Record<string, PreviewDeal>;
  /** Every line at its price, with why. */
  priced: PricedCart;
  /** The lines as they were priced, for the ladder. */
  lines: PromoLine[];
};

export function previewCart(
  lines: readonly PreviewLine[],
  deals: Readonly<Record<string, PreviewDeal>> | null | undefined,
  now: number,
  promotions: PromoConfig = NO_PROMOTIONS,
): CartPreview {
  const live: Record<string, PreviewDeal> = {};
  const promoLines: PromoLine[] = lines.map((l) => {
    const d = deals?.[l.slug];
    // A deal priced off a list price the cart no longer shows (the owner
    // changed the price since) is left out of the preview; checkout decides.
    const usable = d && d.endsAt > now && d.listCents === l.priceCents && d.unitCents < l.priceCents ? d : null;
    return {
      slug: l.slug,
      quantity: l.quantity,
      listCents: l.priceCents,
      role: l.role ?? null,
      eligible: l.eligible === true,
      dealUnitCents: usable?.unitCents ?? null,
      dealPercent: usable?.percent ?? null,
    };
  });
  const priced = priceCart(promoLines, promotions);
  for (const s of priced.segments) {
    const d = deals?.[s.slug];
    if (s.kind === "cart_deal" && d) live[s.slug] = d;
  }
  return {
    subtotalCents: priced.itemsCents,
    savingsCents: priced.savingsCents,
    deals: live,
    priced,
    lines: promoLines,
  };
}
