import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { getStore, listProducts } from "@/lib/shop/catalog";
import { shopEnabled } from "@/lib/shop/flags";

/**
 * Storefront: the store record + its full published catalogue in one call.
 * Public + RLS-scoped (live stores, published products only).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const { slug } = await params;
  const store = await getStore(slug);
  if (!store || store.status !== "live") {
    return withCors(
      NextResponse.json({ error: "Store not found." }, { status: 404 }),
      req,
    );
  }
  const products = await listProducts({ storeSlug: slug, limit: 60 });

  return withCors(
    NextResponse.json(
      { store, products },
      { headers: { "Cache-Control": "public, max-age=120" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
