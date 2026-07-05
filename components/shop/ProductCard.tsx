import Image from "next/image";
import Link from "next/link";

import {
  CLASSIFICATION_LABELS,
  dispatchWindowLabel,
  formatPrice,
  INVENTORY_LABELS,
} from "@/lib/shop/format";
import type { ShopProductFull } from "@/lib/shop/types";
import { cn } from "@/lib/cn";

/**
 * Image-first product card. Deliberately spare: photo, subject, title,
 * price, store, classification, availability, dispatch. Anything more
 * belongs on the product page.
 */
export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 60vw",
  className,
}: {
  product: ShopProductFull;
  sizes?: string;
  className?: string;
}) {
  const image = product.media[0];
  const ready = product.inventory_status === "ready_to_ship";

  return (
    <Link
      href={`/shop/icons/${product.slug}`}
      className={cn(
        "group block overflow-hidden rounded-lg border border-paper/10 bg-night-soft/60 press-card",
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
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full items-center justify-center font-display-serif text-title text-paper/20"
          >
            ☩
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/50">
          {CLASSIFICATION_LABELS[product.classification]}
        </p>
        <h3 className="mt-1.5 font-display-serif text-title-sm leading-snug text-paper transition-colors group-hover:text-gold">
          {product.title}
        </h3>
        <p className="mt-2 font-sans text-ui font-semibold text-paper">
          {formatPrice(product.price_cents, product.currency)}
        </p>
        <p className="mt-2 font-sans text-caption text-paper/55">
          <span className={cn("font-semibold", ready ? "text-paper/80" : "text-paper/60")}>
            {INVENTORY_LABELS[product.inventory_status]}
          </span>
          {" · "}
          {dispatchWindowLabel(product.dispatch_min_days, product.dispatch_max_days)}
        </p>
        <p className="mt-1 font-sans text-caption text-paper/45">
          {product.store.public_name}
        </p>
      </div>
    </Link>
  );
}
