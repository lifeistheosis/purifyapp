import type { Metadata } from "next";
import Link from "next/link";

import { SellerNav } from "@/components/shop/seller/SellerNav";
import { getSellerContext } from "@/lib/shop/seller";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Seller console", template: "%s — Seller console" },
  robots: { index: false, follow: false },
};

/**
 * Seller console shell. The /shop layout above already 404s when the
 * marketplace flag is dark; this layout adds the seller gate: signed
 * out → sign in, signed in without a seller row → the Sell on Purify
 * path, suspended → an honest notice. Console access exists only
 * through an admin-provisioned shop_sellers row.
 */
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSellerContext();

  if (ctx.state === "signed_out") {
    return (
      <GatePanel title="Seller console">
        <p className="font-serif text-body text-paper/70 leading-[1.65]">
          Sign in with your seller account to manage orders, messages, and
          listings.
        </p>
        <Link
          href="/signin?next=/shop/seller"
          className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
        >
          Sign in
        </Link>
      </GatePanel>
    );
  }

  if (ctx.state === "not_seller") {
    return (
      <GatePanel title="Sell on Purify">
        <p className="font-serif text-body text-paper/70 leading-[1.65]">
          This account doesn&rsquo;t have a store yet. Selling on Purify starts
          with an application: every merchant is reviewed by hand before a
          store opens.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop/sell"
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
          >
            Learn about selling
          </Link>
          <Link
            href="/shop/sell/application"
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper"
          >
            Check my application
          </Link>
        </div>
      </GatePanel>
    );
  }

  if (ctx.seller.status !== "active") {
    return (
      <GatePanel title="Store suspended">
        <p className="font-serif text-body text-paper/70 leading-[1.65]">
          Your seller account is currently{" "}
          {ctx.seller.status === "suspended" ? "suspended" : "closed"}. Existing
          orders remain visible to buyers; nothing new can be listed or sold.
          Write to support@purifyapp.net if you believe this is a mistake.
        </p>
      </GatePanel>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
      <header className="pt-8 md:pt-12">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Seller console
        </p>
      </header>
      <div className="mt-4 md:mt-8 md:flex md:gap-10">
        <SellerNav storeName={ctx.store?.public_name ?? ctx.seller.public_name} />
        <main className="min-w-0 flex-1 pt-4 md:pt-0">{children}</main>
      </div>
    </div>
  );
}

function GatePanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pt-10 md:px-8 md:pt-14">
      <h1 className="font-display-serif text-heading text-paper">{title}</h1>
      <div className="mt-4">{children}</div>
    </div>
  );
}
