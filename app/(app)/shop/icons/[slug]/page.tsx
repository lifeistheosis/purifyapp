import type { Metadata } from "next";

import { ProductDetailClient } from "@/components/shop/ProductDetailClient";
import { getProduct, listPublishedProductSlugs } from "@/lib/shop/catalog";

type Params = { params: Promise<{ slug: string }> };

// Enumerate published slugs at build so output:export can emit a shell per
// product; the shell fetches live from /api/shop/catalog/product at runtime.
// A product added between AAB releases won't have a native page until the next
// build (the catalog changes at admin speed); the web build is unaffected.
/**
 * Static segments that live beside this one, and therefore win the route
 * match. A product slugged "detail" would be shadowed by
 * shop/icons/detail/page.tsx and unreachable at its own URL, on the website as
 * well as in the app, and nothing would say so. Failing the build is the only
 * moment anyone would find out.
 */
const RESERVED_SLUGS = new Set(["detail"]);

export async function generateStaticParams() {
  const slugs = await listPublishedProductSlugs();
  const clashes = slugs.filter((s) => RESERVED_SLUGS.has(s));
  if (clashes.length) {
    throw new Error(
      `Product slug collides with a route beside it: ${clashes.join(", ")}. ` +
        `Rename the product; a static segment always wins over [slug].`,
    );
  }
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Icon not found" };
  // No price in the baked title: this metadata renders at BUILD time (the
  // page body fetches live), so a price here would go stale the moment the
  // price changes in admin and stay wrong until the next deploy.
  return {
    title: `${product.title} | EIKON`,
    description: product.subtitle ?? undefined,
  };
}

// Server shell (metadata + generateStaticParams). The product renders and
// fetches client-side so it works in the native local-first export.
export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
