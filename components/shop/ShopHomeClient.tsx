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

/**
 * Three claims Purify makes about the MARKETPLACE, on the marketplace's own
 * front page. They used to be "Inspected by hand", "Ships from the US" and
 * "30-day returns", which are EIKON's, about EIKON's pipeline, and false about
 * every other store the moment one exists: an independent seller ships from
 * wherever they live, and the 30-day floor is a term of a seller agreement
 * still in draft (docs/legal/marketplace-terms-draft.md).
 *
 * These three are things the code actually guarantees. Every seller really is
 * approved by hand (application, manual review, manual provision, manual
 * go-live), checkout really is Stripe, and each store's shipping and returns
 * policies really do live on its own page and are written by its own seller.
 */
const TRUST_KEYS = [
  "shop.trustSellersReviewed",
  "shop.trustStripeCheckout",
  "shop.trustStorePolicies",
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
      {/* Masthead: tighter promise, honest trust row, a real primary action.
          The glow is pure CSS depth (a candle against the night palette), and
          the compressed rhythm exists so the Featured rail's cards crest into
          the first viewport instead of a full screen of empty black. */}
      <header className="relative px-5 pt-9 text-center md:px-0 md:pt-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-28 mx-auto h-80 max-w-[760px] rounded-full bg-gold/[0.07] blur-3xl"
        />
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/70">
          {t("shop.purifyShop")}
        </p>
        <h1 className="title-in mx-auto mt-3 max-w-[640px] font-display-serif text-display-sm md:text-display text-paper leading-[1.05]">
          {t("shop.iconsForTheLifeOf")}
        </h1>
        <p className="mx-auto mt-3.5 max-w-[440px] font-serif text-body md:text-lede text-paper/70 leading-[1.6]">
          {t("shop.curatedOrthodoxIconsFaithfulTo")}
        </p>

        <ul className="mx-auto mt-5 flex max-w-[560px] flex-wrap items-center justify-center gap-x-2 gap-y-2">
          {TRUST_KEYS.map((key) => (
            <li
              key={key}
              className="inline-flex items-center gap-1.5 rounded-pill border border-paper/10 bg-paper/[0.03] px-3 py-1.5 font-sans text-caption text-paper/65"
            >
              <span aria-hidden className="text-gold/60">✓</span>
              {t(key)}
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
      <nav aria-label={t("shop.browseByCategory")} className="mt-7 -mx-0">
        <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-thin px-5 pb-1 md:justify-center md:px-0">
          <li className="shrink-0 snap-start">
            <Link
              href="/shop/category/all"
              className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-gold/35 bg-gold/[0.06] px-4 font-sans text-detail font-semibold text-gold hover:bg-gold/[0.12]"
            >
              {t("shop.everything")}
            </Link>
          </li>
          {categories.map(([slug, label]) => (
            <li key={slug} className="shrink-0 snap-start">
              <Link
                href={`/shop/category/${slug}`}
                className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/15 bg-paper/[0.03] px-4 font-sans text-detail font-medium text-paper/75 hover:border-gold/40 hover:text-gold"
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
          <ProductRail
            title={t("shop.featuredIcons")}
            products={data.featured}
            seeAllHref="/shop/category/all"
          />
          <ProductRail
            title={t("shop.readyToShipX")}
            products={data.readyToShip}
            seeAllHref="/shop/category/all?inventory=ready_to_ship"
          />

          {/*
            THE STORES. This was one card, linking to /shop/eikon by literal
            and labelled "the founding store". A second store could be created,
            provisioned, stocked and made live, and nothing on this site would
            have linked to it: it was reachable only by typing its URL.

            Oldest first, so EIKON keeps the front position it has by age
            rather than by being named in the source.
          */}
          {/* ?? [] is not paranoia: this endpoint is served with
            Cache-Control public max-age=30, so for half a minute after a
            deploy a browser can still be holding the previous shape. */}
          {(data.stores ?? []).length > 0 ? (
            <section aria-label={t("shop.theStores")} className="mt-12 px-5 md:px-0">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="font-display-serif text-title md:text-heading text-paper">
                  {t("shop.theStores")}
                </h2>
                {(data.stores ?? []).length > 3 ? (
                  <Link
                    href="/shop/stores"
                    className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
                  >
                    {t("shop.allStores")}
                  </Link>
                ) : null}
              </div>
              <ul className="grid gap-4 md:grid-cols-2">
                {(data.stores ?? []).slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/shop/${s.slug}`}
                      className="press-card block h-full rounded-lg border border-gold/20 bg-night-soft/60 p-6 md:p-8"
                    >
                      <p className="font-display-serif text-title tracking-[0.08em] text-paper">
                        {s.public_name}
                      </p>
                      {s.tagline ? (
                        <p className="mt-2 font-serif text-body italic text-paper/65 leading-[1.5]">
                          {s.tagline}
                        </p>
                      ) : null}
                      {s.description ? (
                        <p className="mt-3 line-clamp-3 font-serif text-body text-paper/70 leading-[1.6]">
                          {s.description}
                        </p>
                      ) : null}
                      <p className="mt-4 font-sans text-detail font-medium text-paper/70">
                        {t("shop.visitTheStore")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Recently added */}
          {data.recent.length > 0 ? (
            <section aria-label={t("study.theology.recentlyAdded")} className="mt-12 px-5 md:px-0">
              <h2 className="mb-4 font-display-serif text-title md:text-heading text-paper">
                {t("shop.recentlyAdded")}
              </h2>
              {/* Hand-rolled stagger, kept on purpose for now. `.cascade` with
                  `cascade-tight cascade-rise` is the successor and reads the
                  same, but this is a product GRID rather than a reading-order
                  column, and its 520ms per-card `rise-in` is slower than the
                  cascade's 320ms. Migrate it when the other `.rise-in` call
                  sites are consolidated, not before. */}
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
