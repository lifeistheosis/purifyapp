import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { RatingStars } from "@/components/shop/RatingStars";
import {
  CLASSIFICATION_LABELS,
  dispatchWindowLabel,
  formatPrice,
  INVENTORY_LABELS,
  productRating,
  unitsSoldLabel,
} from "@/lib/shop/format";
import type { ShopProductFull } from "@/lib/shop/types";
import { cn } from "@/lib/cn";

/**
 * Image-first listing card, Airbnb-flavoured: a rounded photo that zooms on
 * hover, a save heart floated top-right, an availability badge bottom-left,
 * and the whole surface lifting on hover / dipping on tap (`.card-lift`).
 *
 * The card is a plain container (not an <a>) so the heart button can be truly
 * interactive; a stretched, absolutely-positioned Link sits under the heart
 * and makes the rest of the card navigate. Everything below the photo stays
 * deliberately spare, the product page carries the detail.
 */
export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 60vw",
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
  const dotColor = ready
    ? "bg-emerald-400"
    : product.inventory_status === "coming_soon"
      ? "bg-sky-400"
      : "bg-amber-400";
  const priceLabel = formatPrice(product.price_cents, product.currency);

  return (
    <div
      style={style}
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-2xl border border-paper/10 bg-night-soft/60 card-lift",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-paper/[0.04]">
        {image ? (
          <Image
            src={image.media_url}
            alt={image.alt_text}
            fill
            sizes={sizes}
            className="object-contain p-4"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full items-center justify-center font-display-serif text-title text-paper/20"
          >
            ☩
          </div>
        )}

        {/* Availability badge. */}
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

      {/* Stretched navigation target: covers the whole card, sits below the heart. */}
      <Link
        href={`/shop/icons/${product.slug}`}
        aria-label={product.title}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      />

      <div className="flex flex-1 flex-col p-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
          {CLASSIFICATION_LABELS[product.classification]}
        </p>
        <h3 className="mt-1.5 line-clamp-2 font-display-serif text-title-sm leading-snug text-paper transition-colors group-hover:text-gold">
          {product.title}
        </h3>
        <div className="mt-auto pt-3">
          <p className="font-sans text-lede font-semibold text-paper">
            {priceLabel}
          </p>
          {rating.count > 0 || sold ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {rating.count > 0 ? (
                <RatingStars avg={rating.avg} count={rating.count} />
              ) : null}
              {sold ? (
                <span className="font-sans text-caption text-paper/55">
                  {rating.count > 0 ? `· ${sold}` : sold}
                </span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-1.5 font-sans text-caption text-paper/55">
            {dispatchWindowLabel(product.dispatch_min_days, product.dispatch_max_days)}
            {" · "}
            {product.store.public_name}
          </p>
        </div>
      </div>
    </div>
  );
}
