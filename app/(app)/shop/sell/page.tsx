import type { Metadata } from "next";
import Link from "next/link";

import { MerchantApplyForm } from "@/components/shop/MerchantApplyForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-8 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Purify Shop
        </p>
        <h1 className="mt-2 font-display-serif text-heading md:text-display-sm text-paper">
          Sell on Purify
        </h1>
        <p className="mt-3 font-serif text-lede text-paper/70 leading-[1.6]">
          Purify is opening a curated marketplace for Orthodox icons. Every
          merchant is reviewed by hand, every listing must describe its
          production honestly, and nothing is published automatically.
        </p>
      </header>

      <section aria-label="Who can apply" className="mt-8 grid gap-4 sm:grid-cols-2">
        {WHO.map((w) => (
          <div key={w.title} className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
            <h2 className="font-display-serif text-title-sm text-paper">{w.title}</h2>
            <p className="mt-2 font-serif text-detail text-paper/65 leading-[1.6]">
              {w.body}
            </p>
          </div>
        ))}
      </section>

      <section aria-label="How review works" className="mt-8 rounded-lg border border-paper/10 bg-night-soft/60 p-6">
        <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          How review works
        </h2>
        <ol className="mt-3 space-y-2 font-serif text-body text-paper/70 leading-[1.65]">
          <li>1. You submit the application below.</li>
          <li>2. A person reads it; we may write back with questions.</li>
          <li>3. Approved sellers set up their storefront with us before anything goes live.</li>
          <li>4. Purify administrators approve every store before it opens.</li>
        </ol>
        <p className="mt-4 font-sans text-detail text-paper/60">
          The marketplace currently hosts EIKON, Purify&rsquo;s own store.
          Independent merchants join through this process.
        </p>
      </section>

      <div className="mt-10">
        <h2 className="font-display-serif text-title text-paper">Apply</h2>
        {user ? (
          <div className="mt-5">
            <MerchantApplyForm />
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-6">
            <p className="font-serif text-body text-paper/70 leading-[1.65]">
              Applications are tied to a Purify account so you can follow your
              review status. Sign in or create a free account to apply.
            </p>
            <Link
              href="/signin?next=/shop/sell"
              className="tap-press mt-4 inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
            >
              Sign in to apply
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
