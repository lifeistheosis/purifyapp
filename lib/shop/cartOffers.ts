import { pickTripwire } from "./addOn";
import { previewCart, type CartPreview, type PreviewDeal } from "./cartPricing";
import { isEikonProduct } from "./eikon";
import { cartLadder, unlocks, type Ladder, type PromoConfig, type ShippingRule, type Unlock } from "./promotions";
import { roleOf, setCompletion } from "./sets";
import type { ShopProductFull } from "./types";

/**
 * Everything the cart and the drawer show about the offers, from one place
 * (the owner, 2026-10-01: a "tripwire funnel" in the cart):
 *
 *   preview    each line at the price checkout will charge (lib/shop/cartPricing.ts)
 *   ladder     where the order stands against free shipping, the multi-buy
 *              and the set (lib/shop/promotions.ts cartLadder)
 *   setFinish  the pieces that would make the cart a whole set, and what
 *              adding them saves
 *   tripwire   the one piece to offer beside the order, preferring one that
 *              would newly give it something (lib/shop/addOn.ts pickTripwire),
 *              with what it would cost in this order
 *
 * Every "would" is the order priced again with the piece added, by the same
 * function checkout runs, so a card never claims an unlock or a saving the
 * Stripe page would not show.
 *
 * The catalogue is how a cart line is known to be an icon, a rope or a cross,
 * and to be EIKON's. A line the catalogue does not hold is priced as nothing
 * special, which can only ever understate a saving: checkout reads the
 * product itself.
 *
 * Pure.
 */

export type OfferItem = { slug: string; quantity: number; priceCents: number };

export type CartOffers = {
  preview: CartPreview;
  ladder: Ladder;
  setFinish: {
    add: ShopProductFull[];
    /** What adding them takes off the order, beyond what it saves already. */
    savingsCents: number;
    /** What adding them adds to the order, at the prices it would charge. */
    addedCents: number;
  } | null;
  tripwire: {
    product: ShopProductFull;
    unlocks: Unlock | null;
    /** The piece's price in this order once added, which an offer may lower. */
    unitCents: number;
  } | null;
};

export function cartOffers(input: {
  items: readonly OfferItem[];
  catalogue: readonly ShopProductFull[];
  deals: Readonly<Record<string, PreviewDeal>> | null | undefined;
  now: number;
  promotions: PromoConfig;
  shipping: ShippingRule;
  /** False where no bump is shown, to skip pricing the order once per candidate. */
  tripwire?: boolean;
}): CartOffers {
  const { items, catalogue, deals, now, promotions, shipping } = input;
  const bySlug = new Map(catalogue.map((p) => [p.slug, p]));

  const price = (list: readonly OfferItem[]) => {
    const preview = previewCart(
      list.map((i) => {
        const p = bySlug.get(i.slug);
        return { ...i, role: p ? roleOf(p) : null, eligible: p ? isEikonProduct(p) : false };
      }),
      deals,
      now,
      promotions,
    );
    return { preview, ladder: cartLadder(preview.lines, preview.priced, promotions, shipping) };
  };
  const withAdded = (add: readonly ShopProductFull[]) =>
    price([...items, ...add.map((p) => ({ slug: p.slug, quantity: 1, priceCents: p.price_cents }))]);

  const { preview, ladder } = price(items);

  let setFinish: CartOffers["setFinish"] = null;
  if (ladder.set.kind === "partial") {
    const held = items.map((i) => bySlug.get(i.slug)).filter((p): p is ShopProductFull => Boolean(p && isEikonProduct(p)));
    const add = setCompletion(held, catalogue.filter((p) => isEikonProduct(p)));
    if (add) {
      const after = withAdded(add);
      if (after.preview.priced.sets > preview.priced.sets) {
        setFinish = {
          add,
          savingsCents: after.preview.savingsCents - preview.savingsCents,
          addedCents: after.preview.subtotalCents - preview.subtotalCents,
        };
      }
    }
  }

  let tripwire: CartOffers["tripwire"] = null;
  const pick =
    input.tripwire === false
      ? null
      : pickTripwire([...catalogue], new Set(items.map((i) => i.slug)), preview.subtotalCents, (c) =>
          unlocks(ladder, withAdded([c]).ladder),
        );
  if (pick) {
    const after = withAdded([pick.product]);
    const own = after.preview.priced.segments.find((s) => s.line === items.length);
    tripwire = { product: pick.product, unlocks: pick.unlocks, unitCents: own?.unitCents ?? pick.product.price_cents };
  }

  return { preview, ladder, setFinish, tripwire };
}
