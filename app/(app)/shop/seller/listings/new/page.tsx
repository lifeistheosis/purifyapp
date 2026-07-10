import type { Metadata } from "next";
import Link from "next/link";

import { ListingForm } from "@/components/shop/seller/ListingForm";
import { getSellerContext } from "@/lib/shop/seller";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;

  return (
    <div className="max-w-[760px] pb-16">
      <Link
        href="/shop/seller/listings"
        className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
      >
        ← Listings
      </Link>
      <h1 className="mt-3 font-display-serif text-heading text-paper">
        New listing
      </h1>
      <div className="mt-8">
        <ListingForm product={null} storeLive={ctx.store?.status === "live"} />
      </div>
    </div>
  );
}
