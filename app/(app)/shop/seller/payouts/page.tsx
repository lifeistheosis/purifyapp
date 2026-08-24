import type { Metadata } from "next";

import { PayoutsClient } from "@/components/shop/seller/PayoutsClient";
import { getSellerContext } from "@/lib/shop/seller";

export const metadata: Metadata = { title: "Payouts" };

/**
 * How a seller gets paid. Everything real happens in the client component,
 * which has to re-ask the server after Stripe returns the seller to the app;
 * this file exists to gate the route and name the page.
 */
export default async function SellerPayoutsPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null; // layout already gated

  return (
    <div className="max-w-[720px] pb-16">
      <h1 className="font-display-serif text-heading text-paper">Payouts</h1>
      <p className="mt-2 font-serif text-body text-paper/70 leading-[1.6]">
        Purify takes payment from the buyer at checkout and Stripe passes your
        share to your bank. Purify never holds your bank details.
      </p>

      {ctx.store ? (
        <PayoutsClient />
      ) : (
        <div className="mt-6 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            Your store is being prepared
          </p>
          <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
            Payouts attach to a storefront, and yours has not been created yet.
            This page will work as soon as it is.
          </p>
        </div>
      )}
    </div>
  );
}
