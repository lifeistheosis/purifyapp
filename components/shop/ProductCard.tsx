"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { RatingStars } from "@/components/shop/RatingStars";
import { Cart } from "@/components/ui/icons/Cart";
import { Check } from "@/components/ui/icons/Check";
import { addToCart } from "@/lib/shop/cart";
import {
  CLASSIFICATION_LABELS,
  formatPrice,
  INVENTORY_LABELS,
  productRating,
  unitsSoldLabel,
} from "@/lib/shop/format";
import type { ShopProductFull } from "@/lib/shop/types";
import { cn } from "@/lib/cn";

/**
 * Image-first listing card. Airbnb presentation (rounded photo, save heart,
 * availability chip, whole-card lift) crossed with Amazon scannability: the
 * price, rating, classification tag, and a one-tap add-to-cart are all here,
 * so a shopper can compare and buy without opening every product.
 *
 * The card is a plain container (not an <a>) so the heart and quick-add stay
 * truly interactive; a stretched, absolutely-positioned Link sits beneath
 * them and carries the rest of the surface into the product page.
 */
export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  className,
  style,
}: {
  product: ShopProductFull;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const image = product.media[0];
  const rating = productRating(product);
  const sold = unitsSoldLabel(product.units_sold);
  const ready = product.inventory_status === "ready_to_ship";
  const soldOut = product.inventory_status === "out_of_stock";
  const dotColor = ready
    ? "bg-emerald-400"
    : product.inventory_status === "coming_soon"
      ? "bg-sky-400"
      : soldOut
        ? "bg-paper/40"
        : "bg-amber-400";
  const priceLabel = formatPrice(product.price_cents, product.currency);
  const [added, setAdded] = useState(false);

  function quickAdd() {
    addToCart({
      slug: product.slug,
      title: product.title,
      priceCents: product.price_cents,
      currency: product.currency,
      imageUrl: image?.media_url,
      imageAlt: image?.alt_text,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div
      style={style}
      className={cn(
        // h-full: fill the (equal-height) grid / rail cell so the mt-auto price
        // row lands on the same baseline across cards regardless of how many
        // lines the title wraps to. Without it the card is content-height and
        // the bottoms misalign.
        "group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-paper/10 bg-night-soft/60 card-lift",
        className,
      )}
    >
      {/* Icons are sacred images: never crop a face. The photo is matted
          into a portrait frame with `object-contain`, presented like a
          framed piece; the whole frame lifts + the image breathes on hover.
          The gradient matte gives the letterboxing an intentional, gallery
          feel rather than empty bars. */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-paper/[0.06] to-paper/[0.02]">
        {image ? (
          <Image
            src={image.media_url}
            alt={image.alt_text}
            fill
            sizes={sizes}
            className="object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full items-center justify-center font-display-serif text-display text-paper/15"
          >
            ☩
          </div>
        )}

        {/* Availability chip. */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-night/70 px-2.5 py-1 font-sans text-caption font-medium text-paper backdrop-blur-sm">
          <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
          {INVENTORY_LABELS[product.inventory_status]}
        </span>

        {/* Save heart floats above the stretched link. */}
        <FavoriteButton
          productSlug={product.slug}
          title={product.title}
          storeName={product.store.public_name}
          priceLabel={priceLabel}
          imageUrl={image?.media_url}
          imageAlt={image?.alt_text}
          className="absolute right-2.5 top-2.5 z-20 h-10 w-10 bg-night/45 backdrop-blur-sm"
        />
      </div>

      {/* Stretched navigation target: covers the whole card, sits below the
          interactive controls. */}
      <Link
        href={`/shop/icons/${product.slug}`}
        aria-label={product.title}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      />

      <div className="flex flex-1 flex-col p-3.5 md:p-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.1px] text-paper/50">
          {CLASSIFICATION_LABELS[product.classification]}
        </p>
        <h3 className="mt-1.5 line-clamp-2 font-display-serif text-title-sm leading-snug text-paper transition-colors group-hover:text-gold">
          {product.title}
        </h3>

        {rating.count > 0 ? (
          <div className="mt-1.5">
            <RatingStars avg={rating.avg} count={rating.count} />
          </div>
        ) : sold ? (
          <p className="mt-1.5 font-sans text-caption text-paper/50">{sold}</p>
        ) : null}

        {/* Price + one-tap add sit on the baseline so every card ends the
            same height regardless of the copy above. */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="font-sans text-lede font-semibold text-paper">
            {priceLabel}
          </p>
          {!soldOut ? (
            <button
              type="button"
              onClick={quickAdd}
              aria-label={added ? "Added to cart" : `Add ${product.title} to cart`}
              className={cn(
                "tap-press relative z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
                added
                  ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                  : "border-paper/20 text-paper/75 hover:border-gold/60 hover:bg-gold/12 hover:text-gold",
              )}
            >
              {added ? <Check size={17} /> : <Cart size={17} />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
