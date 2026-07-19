import type { Metadata } from "next";
import { Suspense } from "react";

import { RequestFormIsland } from "@/components/shop/RequestFormIsland";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "Request an Icon",
  description:
    "Tell us the saint or subject you're looking for and the Purify Shop team will look for the icon and write back.",
};

// Static shell; the form island resolves auth + query prefill client-side so
// it works in the native local-first export.
export default function RequestIconPage() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          <T k="shop.purifyShop" />
        </p>
        <h1 className="mt-2 font-display-serif text-heading md:text-display-sm text-paper">
          <T k="shop.requestAnIcon" />
        </h1>
        <p className="mt-3 font-serif text-lede text-paper/70 leading-[1.6]">
          <T k="shop.theSaintsOfTheChurch" />
        </p>
      </header>
      <div className="mt-8 pb-8">
        <Suspense fallback={null}>
          <RequestFormIsland />
        </Suspense>
      </div>
    </div>
  );
}
