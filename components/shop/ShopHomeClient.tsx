"use client";

import Link from "next/link";

import { ProductRail } from "@/components/shop/ProductRail";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopError, ShopHomeSkeleton } from "@/components/shop/ShopStates";
import { fetchShopHome } from "@/lib/shop/catalogClient";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopCategory } from "@/lib/shop/types";

/**
 * Marketplace home. Fetched live (published products, live stores) so it works
 * identically on the web and inside the native shell. Every section renders
 * only when it has real content — no fabricated counts or empty shells.
 */
export function ShopHomeClient() {
  const { data, error, loading, reload } = useAsyncData(fetchShopHome, []);
  const categories = Object.entries(CATEGORY_LABELS) as [ShopCategory, string][];

  return (
    <div className="mx-auto w-full max-w-[1200px] md:px-8">
      {/* Masthead */}
      <header className="px-5 pt-10 text-center md:px-0 md:pt-16">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Purify Shop
        </p>
        <h1 className="mx-auto mt-3 max-w-[640px] font-display-serif text-display-sm md:text-display text-paper leading-[1.05]">
          Icons for the life of prayer.
        </h1>
        <p className="mx-auto mt-4 max-w-[520px] font-serif text-lede text-paper/70 leading-[1.6]">
          Curated Orthodox icons: selected for faithfulness to the tradition,
          inspected by hand, and packaged with care.
        </p>
      </header>

      {/* Category chips */}
      <nav aria-label="Browse by category" className="mt-8">
        <ul className="flex gap-2 overflow-x-auto scrollbar-thin px-5 pb-1 md:justify-center md:px-0">
          {categories.map(([slug, label]) => (
            <li key={slug} className="shrink-0">
              <Link
                href={`/shop/category/${slug}`}
                className="tap-press inline-flex min-h-[40px] items-center rounded-pill border border-paper/15 bg-paper/[0.03] px-4 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {loading ? <ShopHomeSkeleton /> : null}
      {error ? <ShopError message={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <ProductRail title="Featured Icons" products={data.featured} />
          <ProductRail
            title="Ready to Ship"
            products={data.readyToShip}
            seeAllHref="/shop/category/all?inventory=ready_to_ship"
          />

          {/* Founding store */}
          {data.eikon ? (
            <section aria-label="EIKON" className="mt-12 px-5 md:px-0">
              <Link
                href="/shop/eikon"
                className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-6 md:p-10"
              >
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                  The founding store
                </p>
                <p className="mt-3 font-display-serif text-heading md:text-display-sm tracking-[0.08em] text-paper">
                  EIKON
                </p>
                <p className="mt-4 max-w-[560px] font-serif text-body text-paper/70 leading-[1.6]">
                  {data.eikon.description}
                </p>
                <p className="mt-4 font-sans text-detail font-medium text-gold">
                  Visit the store →
                </p>
              </Link>
            </section>
          ) : null}

          {/* Recently added */}
          {data.recent.length > 0 ? (
            <section aria-label="Recently added" className="mt-12 px-5 md:px-0">
              <h2 className="mb-4 font-display-serif text-title md:text-heading text-paper">
                Recently Added
              </h2>
              <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {data.recent.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {/* Request + Sell (static; always available) */}
      <section aria-label="Request an icon" className="mt-12 grid gap-4 px-5 md:grid-cols-2 md:px-0">
        <Link
          href="/shop/request"
          className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-6"
        >
          <h2 className="font-display-serif text-title text-paper">
            Looking for a saint you don&rsquo;t see?
          </h2>
          <p className="mt-2 font-serif text-body text-paper/65 leading-[1.6]">
            Tell us who you&rsquo;re praying with. We&rsquo;ll look for the icon
            and write back.
          </p>
          <p className="mt-3 font-sans text-detail font-medium text-gold">
            Request an icon →
          </p>
        </Link>
        <Link
          href="/shop/sell"
          className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-6"
        >
          <h2 className="font-display-serif text-title text-paper">
            Do you make or sell icons?
          </h2>
          <p className="mt-2 font-serif text-body text-paper/65 leading-[1.6]">
            Purify is opening a curated marketplace for iconographers,
            monasteries, workshops, and retailers. Applications are reviewed by
            hand.
          </p>
          <p className="mt-3 font-sans text-detail font-medium text-gold">
            Sell on Purify →
          </p>
        </Link>
      </section>

      {/* Merchant disclosure */}
      <footer className="mt-14 border-t border-white/8 px-5 pt-6 md:px-0">
        <p className="font-sans text-caption text-paper/60">
          Merchants join Purify Shop by application and review.
        </p>
      </footer>
    </div>
  );
}
