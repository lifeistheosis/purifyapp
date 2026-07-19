"use client";

import Link from "next/link";

import { ProductRail } from "@/components/shop/ProductRail";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopError, ShopHomeSkeleton } from "@/components/shop/ShopStates";
import { Search } from "@/components/ui/icons/Search";
import { fetchShopHome } from "@/lib/shop/catalogClient";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import type { ShopCategory } from "@/lib/shop/types";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const TRUST = [
  "Inspected by hand",
  "Ships from the US",
  "30-day returns",
];

/**
 * Marketplace home. Fetched live (published products, live stores) so it works
 * identically on the web and inside the native shell. Every section renders
 * only when it has real content — no fabricated counts or empty shells.
 */
export function ShopHomeClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(fetchShopHome, []);
  const categories = Object.entries(CATEGORY_LABELS) as [ShopCategory, string][];

  return (
    <div className="mx-auto w-full max-w-[1200px] md:px-8">
      {/* Masthead: tighter promise, honest trust row, a real primary action. */}
      <header className="px-5 pt-9 text-center md:px-0 md:pt-16">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          {t("shop.purifyShop")}
        </p>
        <h1 className="mx-auto mt-3 max-w-[640px] font-display-serif text-display-sm md:text-display text-paper leading-[1.05]">
          {t("shop.iconsForTheLifeOf")}
        </h1>
        <p className="mx-auto mt-3.5 max-w-[440px] font-serif text-body md:text-lede text-paper/70 leading-[1.6]">
          {t("shop.curatedOrthodoxIconsFaithfulTo")}
        </p>

        <ul className="mx-auto mt-5 flex max-w-[560px] flex-wrap items-center justify-center gap-x-2 gap-y-2">
          {TRUST.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-1.5 rounded-pill border border-paper/12 bg-paper/[0.03] px-3 py-1.5 font-sans text-caption text-paper/70"
            >
              <span aria-hidden className="text-paper/55">✓</span>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-center gap-2.5">
          <Link
            href="/shop/category/all"
            className="tap-press inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
          >
            {t("shop.browseIcons")}
          </Link>
          <Link
            href="/shop/category/all"
            aria-label={t("shop.searchTheShop")}
            className="tap-press inline-flex h-12 w-12 items-center justify-center rounded-full border border-paper/20 text-paper/75 transition-colors hover:border-paper/40 hover:text-paper"
          >
            <Search size={19} />
          </Link>
        </div>
      </header>

      {/* Category carousel: snap scrolling, edge-to-edge on phones. */}
      <nav aria-label={t("shop.browseByCategory")} className="mt-8 -mx-0">
        <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-thin px-5 pb-1 md:justify-center md:px-0">
          {categories.map(([slug, label]) => (
            <li key={slug} className="shrink-0 snap-start">
              <Link
                href={`/shop/category/${slug}`}
                className="tap-press inline-flex min-h-[42px] items-center rounded-pill border border-paper/15 bg-paper/[0.03] px-4 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper"
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
          <ProductRail title={t("shop.featuredIcons")} products={data.featured} />
          <ProductRail
            title={t("shop.readyToShipX")}
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
                  {t("shop.theFoundingStore")}
                </p>
                <p className="mt-3 font-display-serif text-heading md:text-display-sm tracking-[0.08em] text-paper">
                  {t("shop.eikon")}
                </p>
                <p className="mt-4 max-w-[560px] font-serif text-body text-paper/70 leading-[1.6]">
                  {data.eikon.description}
                </p>
                <p className="mt-4 font-sans text-detail font-medium text-paper/70">
                  {t("shop.visitTheStore")}
                </p>
              </Link>
            </section>
          ) : null}

          {/* Recently added */}
          {data.recent.length > 0 ? (
            <section aria-label={t("study.theology.recentlyAdded")} className="mt-12 px-5 md:px-0">
              <h2 className="mb-4 font-display-serif text-title md:text-heading text-paper">
                {t("shop.recentlyAdded")}
              </h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {data.recent.map((p, i) => (
                  <li key={p.id} className="rise-in" style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {/* Request + Sell (static; always available) */}
      <section aria-label={t("shop.requestAnIcon")} className="mt-12 grid gap-4 px-5 md:grid-cols-2 md:px-0">
        <Link
          href="/shop/request"
          className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-6"
        >
          <h2 className="font-display-serif text-title text-paper">
            {t("shop.lookingForASaintYou")}
          </h2>
          <p className="mt-2 font-serif text-body text-paper/65 leading-[1.6]">
            {t("shop.tellUsWhoYouRe")}
          </p>
          <p className="mt-3 font-sans text-detail font-medium text-paper/70">
            {t("shop.requestAnIconX")}
          </p>
        </Link>
        <Link
          href="/shop/sell"
          className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-6"
        >
          <h2 className="font-display-serif text-title text-paper">
            {t("shop.doYouMakeOrSell")}
          </h2>
          <p className="mt-2 font-serif text-body text-paper/65 leading-[1.6]">
            {t("shop.purifyIsOpeningACuratedX")}
          </p>
          <p className="mt-3 font-sans text-detail font-medium text-paper/70">
            {t("shop.sellOnPurifyX")}
          </p>
        </Link>
      </section>

      {/* Merchant disclosure */}
      <footer className="mt-14 border-t border-white/8 px-5 pt-6 md:px-0">
        <p className="font-sans text-caption text-paper/60">
          {t("shop.merchantsJoinPurifyShopBy")}
        </p>
      </footer>
    </div>
  );
}
