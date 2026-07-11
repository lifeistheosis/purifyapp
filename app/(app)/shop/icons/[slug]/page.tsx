import type { Metadata } from "next";

import { ProductDetailClient } from "@/components/shop/ProductDetailClient";
import { getProduct, listPublishedProductSlugs } from "@/lib/shop/catalog";
import { formatPrice } from "@/lib/shop/format";

type Params = { params: Promise<{ slug: string }> };

// Enumerate published slugs at build so output:export can emit a shell per
// product; the shell fetches live from /api/shop/catalog/product at runtime.
// A product added between AAB releases won't have a native page until the next
// build (the catalog changes at admin speed); the web build is unaffected.
export async function generateStaticParams() {
  const slugs = await listPublishedProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Icon not found" };
  return {
    title: `${product.title} — ${formatPrice(product.price_cents, product.currency)}`,
    description: product.subtitle ?? undefined,
  };
}

// Server shell (metadata + generateStaticParams). The product renders and
// fetches client-side so it works in the native local-first export.
export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
