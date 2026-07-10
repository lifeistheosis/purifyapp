import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { formatPrice, INVENTORY_LABELS } from "@/lib/shop/format";
import { getSellerContext } from "@/lib/shop/seller";
import { listSellerProducts } from "@/lib/shop/sellerData";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Listings" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Live",
  paused: "Paused",
  archived: "Archived",
};

/**
 * The seller's catalog, image-led like the buyer grid but wearing its
 * status openly: Live in gold, drafts quiet. The whole card edits.
 */
export default async function SellerListingsPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  const products = await listSellerProducts(ctx.seller.id);

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display-serif text-heading text-paper">Listings</h1>
        <Link
          href="/shop/seller/listings/new"
          className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          New listing
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-lg border border-paper/10 bg-night-soft/60 p-8">
          <p className="font-display-serif text-title text-paper">
            Nothing listed yet.
          </p>
          <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
            Start with one good listing: a clear photo, an honest
            classification, a fair dispatch window. You can keep it as a draft
            until everything reads right.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {products.map((p) => {
            const image = p.media[0];
            return (
              <li key={p.id}>
                <Link
                  href={`/shop/seller/listings/${p.id}`}
                  className="press-card group block overflow-hidden rounded-lg border border-paper/10 bg-night-soft/60"
                >
                  <div className="relative aspect-square overflow-hidden bg-paper/[0.04]">
                    {image ? (
                      <Image
                        src={image.media_url}
                        alt={image.alt_text}
                        fill
                        sizes="(min-width: 1024px) 25vw, 45vw"
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
                    <span
                      className={cn(
                        "absolute left-3 top-3 rounded-pill px-2.5 py-1 font-sans text-caption font-semibold",
                        p.status === "published"
                          ? "bg-gold text-night"
                          : "bg-night/85 text-paper/80 backdrop-blur",
                      )}
                    >
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-display-serif text-title-sm leading-snug text-paper">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 font-sans text-ui font-semibold text-paper">
                      {formatPrice(p.price_cents, p.currency)}
                    </p>
                    <p className="mt-1 font-sans text-caption text-paper/60">
                      {INVENTORY_LABELS[p.inventory_status]}
                      {p.quantity_available != null
                        ? ` · ${p.quantity_available} on hand`
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
