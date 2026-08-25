import type { Metadata } from "next";

import Link from "next/link";

import { StoreForm } from "@/components/shop/seller/StoreForm";
import { getSellerContext } from "@/lib/shop/seller";

export const metadata: Metadata = { title: "Store" };

/**
 * The section the console did not have.
 *
 * SellerNav listed five sections and none of them was the store itself, which
 * is the single reason the console read as a supplier portal rather than a
 * shop somebody runs. Everything here was previously editable by nobody: an
 * admin had to hand-craft a PATCH against a route with no callers, and four of
 * the columns had no writer anywhere in the codebase.
 */
export default async function SellerStorePage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null; // layout already gated

  if (!ctx.store) {
    return (
      <div className="max-w-[720px] pb-16">
        <h1 className="font-display-serif text-heading text-paper">Store</h1>
        <div className="mt-6 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            Your store is being prepared
          </p>
          <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
            Your seller account is active but the storefront hasn&rsquo;t been
            created yet. This page will work as soon as it is.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] pb-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display-serif text-heading text-paper">Store</h1>
        <p className="inline-flex rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption font-semibold text-paper/75">
          {ctx.store.status}
        </p>
      </div>
      <p className="mt-2 font-serif text-body text-paper/70 leading-[1.6]">
        This is what a buyer sees at{" "}
        <span className="text-paper">/shop/{ctx.store.slug}</span>. Changes are
        live on your storefront as soon as you save, and the storefront itself
        is only public once your store is open.
      </p>

      {/* Until this existed a seller filled all of it in blind: the storefront
          API 404s a store that is not live, for its owner too, so the first
          person to see their shop was the admin deciding whether to open it. */}
      <Link
        href={`/shop/${ctx.store.slug}`}
        className="tap-press mt-4 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-5 font-sans text-ui font-semibold text-paper hover:border-paper/45"
      >
        Preview your storefront
      </Link>

      <StoreForm />
    </div>
  );
}
