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
// it works in the native local-first export. Requests A of r3-19 (the
// owner's pick of 2026-10-31): the title and one line, then the one field.
export default function RequestIconPage() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 md:px-8">
      <header className="pt-6 md:pt-14">
        <h1 className="font-heading text-[28px] font-semibold leading-[1.12] tracking-[-0.2px] text-paper">
          <T k="shop.requestAnIcon" />
        </h1>
        <p className="mt-1.5 font-sans text-[13.5px] leading-snug text-paper/65">
          <T k="shop.tellUsWhoYouRe" />
        </p>
      </header>
      <div className="mt-4 pb-8">
        <Suspense fallback={null}>
          <RequestFormIsland />
        </Suspense>
      </div>
    </div>
  );
}
