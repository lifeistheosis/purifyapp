import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PolicyText } from "@/components/shop/PolicyText";
import { ProductCard } from "@/components/shop/ProductCard";
import { getStore, listProducts } from "@/lib/shop/catalog";
import { CATEGORY_LABELS } from "@/lib/shop/format";
import type { ShopCategory, ShopProductFull } from "@/lib/shop/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { store: slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Store not found" };
  return {
    title: `${store.public_name} — ${store.tagline ?? "Curated Orthodox icons"}`,
    description: store.description ?? undefined,
  };
}

function ProductGrid({ title, products }: { title: string; products: ShopProductFull[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title} className="mt-12">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-display-serif text-title md:text-heading text-paper">
          {title}
        </h2>
        <span className="font-sans text-caption text-paper/45">
          {products.length} {products.length === 1 ? "icon" : "icons"}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {products.map((p, i) => (
          <li key={p.id} className="rise-in" style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function StorePage({ params }: Params) {
  const { store: slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const products = await listProducts({ storeSlug: slug, limit: 60 });
  const ready = products.filter((p) => p.inventory_status === "ready_to_ship");
  const special = products.filter((p) => p.inventory_status === "special_order");
  const upcoming = products.filter((p) => p.inventory_status === "coming_soon");
  const categoriesPresent = [
    ...new Set(products.map((p) => p.category)),
  ] as ShopCategory[];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8">
      {/* Brand masthead: text wordmark, letter-spaced, no fake logo. */}
      <header className="pt-12 text-center md:pt-20">
        <h1 className="font-display-serif text-display-sm md:text-display tracking-[0.14em] text-paper">
          {store.public_name.toUpperCase()}
        </h1>
        {store.tagline ? (
          <p className="mt-3 font-serif text-lede italic text-paper/70">
            {store.tagline}
          </p>
        ) : null}
        {store.description ? (
          <p className="mx-auto mt-5 max-w-[560px] font-serif text-body text-paper/70 leading-[1.65]">
            {store.description}
          </p>
        ) : null}

        {/* Trust row + catalogue size: the store's promises at a glance. */}
        <ul className="mx-auto mt-6 flex max-w-[640px] flex-wrap items-center justify-center gap-2">
          {[
            "Selected & inspected by hand",
            store.shipping_origin ? `Ships from ${store.shipping_origin}` : null,
            "30-day returns",
          ]
            .filter((c): c is string => Boolean(c))
            .map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-pill border border-paper/12 bg-paper/[0.03] px-3 py-1.5 font-sans text-caption text-paper/70"
              >
                <span aria-hidden className="text-gold">✓</span>
                {chip}
              </li>
            ))}
        </ul>
        {products.length > 0 ? (
          <p className="mt-4 font-sans text-caption text-paper/45">
            {products.length} {products.length === 1 ? "icon" : "icons"}
            {ready.length > 0 ? ` · ${ready.length} ready to ship` : ""}
          </p>
        ) : null}
      </header>

      {/* Category chips for this store */}
      {categoriesPresent.length > 1 ? (
        <nav aria-label="Store categories" className="mt-8">
          <ul className="flex justify-center gap-2 overflow-x-auto scrollbar-thin pb-1">
            {categoriesPresent.map((c) => (
              <li key={c} className="shrink-0">
                <Link
                  href={`/shop/category/${c}`}
                  className="tap-press inline-flex min-h-[40px] items-center rounded-pill border border-paper/15 bg-paper/[0.03] px-4 font-sans text-detail font-medium text-paper/75 hover:border-paper/35 hover:text-paper"
                >
                  {CATEGORY_LABELS[c]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <ProductGrid title="Ready to Ship" products={ready} />
      <ProductGrid title="Special Order" products={special} />
      <ProductGrid title="Coming Soon" products={upcoming} />

      {/* How the store works — the honest operational story. */}
      <section aria-label="How it works" className="mt-14 rounded-lg border border-paper/10 bg-night-soft/60 p-6 md:p-8">
        <h2 className="font-display-serif text-title text-paper">
          How {store.public_name} works
        </h2>
        {store.operational_disclosure ? (
          <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
            {store.operational_disclosure}
          </p>
        ) : null}
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {store.shipping_policy_md ? (
            <div>
              <h3 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                Shipping
              </h3>
              <div className="mt-3">
                <PolicyText text={store.shipping_policy_md} />
              </div>
            </div>
          ) : null}
          {store.return_policy_md ? (
            <div>
              <h3 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                Returns
              </h3>
              <div className="mt-3">
                <PolicyText text={store.return_policy_md} />
              </div>
            </div>
          ) : null}
        </div>
        {store.support_email ? (
          <a
            href={`mailto:${store.support_email}`}
            className="tap-press mt-6 inline-flex min-h-[44px] items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper hover:border-paper/40"
          >
            Contact {store.public_name}
          </a>
        ) : null}
      </section>

      {/*
        Reviews: intentionally absent. This section appears only when
        verified reviews exist (Phase 4+); an empty star-row would be
        theatre.
      */}

      {/* Ownership disclosure */}
      <footer className="mt-10 border-t border-white/8 pt-6 pb-4">
        <p className="font-sans text-caption text-paper/60">
          {store.ownership_disclosure}
        </p>
      </footer>
    </div>
  );
}
