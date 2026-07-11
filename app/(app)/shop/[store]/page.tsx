import type { Metadata } from "next";

import { StoreClient } from "@/components/shop/StoreClient";
import { getStore, listLiveStoreSlugs } from "@/lib/shop/catalog";

type Params = { params: Promise<{ store: string }> };

// Enumerate live store slugs at build for output:export; the storefront renders
// and fetches client-side at runtime.
export async function generateStaticParams() {
  const slugs = await listLiveStoreSlugs();
  return slugs.map((store) => ({ store }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { store: slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Store not found" };
  return {
    title: `${store.public_name} | ${store.tagline ?? "Curated Orthodox icons"}`,
    description: store.description ?? undefined,
  };
}

// Server shell (metadata + generateStaticParams); the storefront is a client
// component so it works in the native local-first export.
export default async function StorePage({ params }: Params) {
  const { store: slug } = await params;
  return <StoreClient slug={slug} />;
}
