import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingForm } from "@/components/shop/seller/ListingForm";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { getSellerContext } from "@/lib/shop/seller";
import { listSellerProducts } from "@/lib/shop/sellerData";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  const { id } = await params;
  const product = (await listSellerProducts(ctx.seller.id)).find(
    (p) => p.id === id,
  );
  if (!product) notFound();

  return (
    <div className="max-w-[760px] pb-16">
      <Link
        href="/shop/seller/listings"
        className="inline-flex items-center gap-1 font-sans text-detail font-medium text-paper/60 hover:text-paper"
      >
        <ChevronLeft size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
        Listings
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display-serif text-heading text-paper">
          Edit listing
        </h1>
        {product.status === "published" ? (
          <Link
            href={`/shop/icons/${product.slug}`}
            className="inline-flex items-center gap-1 font-sans text-detail font-medium text-paper"
          >
            View in the shop
            <ChevronRight size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
          </Link>
        ) : null}
      </div>
      <div className="mt-8">
        <ListingForm
          product={product}
          storeLive={ctx.store?.status === "live"}
        />
      </div>
    </div>
  );
}
