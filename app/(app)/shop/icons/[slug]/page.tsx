import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyBar } from "@/components/shop/BuyBar";
import { FavoriteButton } from "@/components/shop/FavoriteButton";
import { PolicyText } from "@/components/shop/PolicyText";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductRail } from "@/components/shop/ProductRail";
import { getProduct, getStore, relatedProducts } from "@/lib/shop/catalog";
import { flatShippingCents, hasActivePlus } from "@/lib/shop/checkout";
import { checkoutEnabled } from "@/lib/shop/flags";
import { createClient } from "@/lib/supabase/server";
import {
  CLASSIFICATION_LABELS,
  dispatchWindowLabel,
  formatPrice,
  INVENTORY_LABELS,
  purchasable,
} from "@/lib/shop/format";
import type { ShopProductSubject } from "@/lib/shop/types";
import { getSaint } from "@/lib/saints/saints";
import { eventBySlug } from "@/lib/history/events";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Icon not found" };
  return {
    title: `${product.title} — ${formatPrice(product.price_cents, product.currency)}`,
    description: product.subtitle ?? undefined,
  };
}

/** Subject chip: links into Purify's own content when the slug resolves. */
function subjectChip(s: ShopProductSubject): { label: string; href: string | null } {
  if (s.subject_type === "saint") {
    const saint = getSaint(s.subject_slug);
    if (saint) return { label: saint.name, href: `/saints/${saint.slug}` };
  }
  if (s.subject_type === "event") {
    const event = eventBySlug(s.subject_slug);
    if (event) return { label: event.shortTitle ?? event.title, href: `/history/${event.slug}` };
  }
  const fallback: Record<ShopProductSubject["subject_type"], string> = {
    saint: s.subject_slug.replace(/-/g, " "),
    christ: "Christ",
    theotokos: "The Theotokos",
    feast: s.subject_slug.replace(/-/g, " "),
    event: s.subject_slug.replace(/-/g, " "),
    council: s.subject_slug.replace(/-/g, " "),
  };
  return { label: fallback[s.subject_type], href: null };
}

function Fact({ term, value }: { term: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-6 border-b border-white/6 py-2.5 last:border-b-0">
      <dt className="shrink-0 font-sans text-detail text-paper/60">{term}</dt>
      <dd className="text-right font-sans text-detail text-paper/85">{value}</dd>
    </div>
  );
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [store, related, plusShipping] = await Promise.all([
    getStore(product.store.slug),
    relatedProducts(product),
    hasActivePlus(user?.id ?? null),
  ]);

  const priceLabel = formatPrice(product.price_cents, product.currency);
  const shippingLabel = plusShipping
    ? "Free shipping with Purify Plus"
    : `+ ${formatPrice(flatShippingCents(), product.currency)} standard shipping · free with Purify Plus`;
  const dispatchLabel = dispatchWindowLabel(
    product.dispatch_min_days,
    product.dispatch_max_days,
  );
  const chips = product.subjects.map(subjectChip);
  const saintSubject = product.subjects.find((s) => s.subject_type === "saint");
  const saint = saintSubject ? getSaint(saintSubject.subject_slug) : null;
  const primaryImage = product.media[0];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-28 md:px-8 md:pb-8">
      <nav aria-label="Breadcrumb" className="pt-6 font-sans text-caption text-paper/60">
        <Link href="/shop" className="hover:text-paper/75">
          Shop
        </Link>
        {" / "}
        <Link href={`/shop/${product.store.slug}`} className="hover:text-paper/75">
          {product.store.public_name}
        </Link>
      </nav>

      <div className="mt-4 gap-10 md:grid md:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <ProductGallery
            media={product.media}
            representative={product.image_is_representative}
          />

          {/* Title block (mobile order: gallery, then identity). */}
          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-pill border border-paper/20 bg-paper/[0.05] px-3 py-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/75">
                {CLASSIFICATION_LABELS[product.classification]}
              </span>
              <span className="rounded-pill border border-paper/15 px-3 py-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/60">
                {INVENTORY_LABELS[product.inventory_status]}
              </span>
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="font-display-serif text-heading md:text-display-sm leading-[1.1] text-paper">
                {product.title}
              </h1>
              <FavoriteButton
                productSlug={product.slug}
                title={product.title}
                storeName={product.store.public_name}
                priceLabel={priceLabel}
                imageUrl={primaryImage?.media_url}
                imageAlt={primaryImage?.alt_text}
                className="mt-1 shrink-0"
              />
            </div>
            {product.subtitle ? (
              <p className="mt-2 font-serif text-lede text-paper/70">{product.subtitle}</p>
            ) : null}
            <p className="mt-2 font-sans text-detail text-paper/60">
              Sold by{" "}
              <Link
                href={`/shop/${product.store.slug}`}
                className="text-paper/80 underline underline-offset-4 hover:text-paper"
              >
                {product.store.public_name}
              </Link>
            </p>
            {chips.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {chips.map((c) =>
                  c.href ? (
                    <li key={c.label}>
                      <Link
                        href={c.href}
                        className="tap-press inline-flex min-h-[36px] items-center rounded-pill border border-gold/30 bg-gold/[0.06] px-3.5 font-sans text-detail text-gold hover:border-gold/50"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={c.label}
                      className="inline-flex min-h-[36px] items-center rounded-pill border border-paper/15 px-3.5 font-sans text-detail text-paper/70"
                    >
                      {c.label}
                    </li>
                  ),
                )}
              </ul>
            ) : null}
          </header>

          {/* Description */}
          {product.description_md ? (
            <section aria-label="Description" className="mt-8">
              <PolicyText text={product.description_md} />
            </section>
          ) : null}

          {/* Details */}
          <section aria-label="Details" className="mt-8 rounded-lg border border-paper/10 bg-night-soft/60 p-5">
            <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
              Details
            </h2>
            <dl className="mt-3">
              <Fact term="Classification" value={CLASSIFICATION_LABELS[product.classification]} />
              <Fact term="Dimensions" value={product.dimensions} />
              <Fact term="Materials" value={product.materials} />
              <Fact term="Production method" value={product.production_method} />
              <Fact term="Made by" value={product.maker_name} />
              <Fact term="Country of origin" value={product.country_of_origin} />
              <Fact term="Availability" value={INVENTORY_LABELS[product.inventory_status]} />
              <Fact term="Estimated dispatch" value={dispatchLabel} />
            </dl>
          </section>

          {/* Shipping and returns */}
          {store ? (
            <section aria-label="Shipping and returns" className="mt-6 rounded-lg border border-paper/10 bg-night-soft/60 p-5">
              <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                Shipping &amp; returns
              </h2>
              {store.shipping_policy_md ? (
                <div className="mt-3">
                  <PolicyText text={store.shipping_policy_md} />
                </div>
              ) : null}
              {store.return_policy_md ? (
                <div className="mt-4 border-t border-white/6 pt-4">
                  <PolicyText text={store.return_policy_md} />
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Learn about the saint (educational link back into Purify). */}
          {saint ? (
            <section aria-label="About this saint" className="mt-6">
              <Link
                href={`/saints/${saint.slug}`}
                className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-5"
              >
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
                  From the Purify library
                </p>
                <p className="mt-2 font-display-serif text-title-sm text-paper">
                  {saint.name}
                </p>
                <p className="mt-1 font-serif text-detail text-paper/65 leading-[1.6] line-clamp-2">
                  {saint.shortBio}
                </p>
                <p className="mt-2 font-sans text-detail font-medium text-gold">
                  Read the life →
                </p>
              </Link>
            </section>
          ) : null}

          {/* Ownership disclosure */}
          <p className="mt-8 font-sans text-caption text-paper/60">
            {product.store.ownership_disclosure}
          </p>
        </div>

        {/* Purchase column (sticky bar on phones, sidebar card on md+). */}
        <aside className="md:pt-1">
          <BuyBar
            productSlug={product.slug}
            priceLabel={priceLabel}
            shippingLabel={shippingLabel}
            dispatchLabel={dispatchLabel}
            inventoryLabel={INVENTORY_LABELS[product.inventory_status]}
            purchasable={purchasable(product.inventory_status)}
            checkoutOn={checkoutEnabled()}
            subjectForRequest={product.title}
          />
        </aside>
      </div>

      {/* Related icons */}
      <div className="mt-4 md:mt-10 -mx-5 md:mx-0">
        <ProductRail title="Related icons" products={related} />
      </div>
    </div>
  );
}
