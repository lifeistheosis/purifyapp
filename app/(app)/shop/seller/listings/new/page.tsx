import type { Metadata } from "next";
import Link from "next/link";

import { ListingForm } from "@/components/shop/seller/ListingForm";
import { getSellerContext } from "@/lib/shop/seller";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null;
  // Every other console section handles this; this one sent the seller
  // through the entire form first and refused at the end.
  if (!ctx.store) {
    return (
      <div className="max-w-[720px] pb-16">
        <h1 className="font-display-serif text-heading text-paper">Listings</h1>
        <div className="mt-6 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            Your store is being prepared
          </p>
          <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
            A listing has to belong to a storefront, and yours hasn&rsquo;t been
            created yet. This page will work as soon as it is.
          </p>
        </div>
      </div>
    );
  }

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
