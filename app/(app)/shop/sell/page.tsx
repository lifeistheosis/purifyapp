import type { Metadata } from "next";

import { MerchantApplyGate } from "@/components/shop/MerchantApplyGate";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "Sell on Purify",
  description:
    "Apply to sell Orthodox icons on the Purify marketplace: iconographers, monasteries, workshops, and retailers, reviewed by hand.",
};

const WHO = [
  {
    title: "Independent iconographers",
    body: "Painters and carvers working in the tradition, selling ready-made pieces or taking commissions.",
  },
  {
    title: "Monasteries",
    body: "Communities whose icon workshops support the life of the monastery.",
  },
  {
    title: "Workshops",
    body: "Studios producing icons in the canonical tradition, from printed and mounted to hand-finished work.",
  },
  {
    title: "Retailers",
    body: "Sellers of faithfully produced icons with confirmed reproduction rights.",
  },
];

export default function SellPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-8 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          <T k="shop.purifyShop" />
        </p>
        <h1 className="mt-2 font-display-serif text-heading md:text-display-sm text-paper">
          <T k="shop.sellOnPurify" />
        </h1>
        <p className="mt-3 font-serif text-lede text-paper/70 leading-[1.6]">
          <T k="shop.purifyIsOpeningACurated" />
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {WHO.map((w) => (
          <div key={w.title} className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
            <h2 className="font-display-serif text-title-sm text-paper">{w.title}</h2>
            <p className="mt-2 font-serif text-detail text-paper/65 leading-[1.6]">
              {w.body}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-paper/10 bg-night-soft/60 p-6">
        <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          <T k="shop.howReviewWorks" />
        </h2>
        <ol className="mt-3 space-y-2 font-serif text-body text-paper/70 leading-[1.65]">
          <li><T k="shop.1YouSubmitTheApplication" /></li>
          <li><T k="shop.2APersonReadsIt" /></li>
          <li><T k="shop.3ApprovedSellersSetUp" /></li>
          <li><T k="shop.4PurifyAdministratorsApproveEvery" /></li>
        </ol>
        <p className="mt-4 font-sans text-detail text-paper/60">
          <T k="shop.theMarketplaceCurrentlyHostsEikon" />
        </p>
      </section>

      <div className="mt-10">
        <h2 className="font-display-serif text-title text-paper"><T k="study.apply" /></h2>
        <MerchantApplyGate />
      </div>
    </div>
  );
}
