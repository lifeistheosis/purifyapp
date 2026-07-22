import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { listProducts } from "@/lib/shop/catalog";
import { shopEnabled } from "@/lib/shop/flags";
import type {
  ShopCategory,
  ShopInventoryStatus,
  ShopSubjectType,
} from "@/lib/shop/types";

/**
 * Query-driven catalog listing (category pages, store products, "see all",
 * filters). Public + RLS-scoped; the supplier-image rights gate and media
 * ordering run server-side in lib/shop/catalog. Cached briefly: the catalog
 * changes at admin speed, not user speed.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const url = new URL(req.url);
  const q = url.searchParams;
  const subjectSlug = q.get("subjectSlug");

  const products = await listProducts({
    category: (q.get("category") as ShopCategory | null) ?? undefined,
    inventory: (q.get("inventory") as ShopInventoryStatus | null) ?? undefined,
    storeSlug: q.get("storeSlug") ?? undefined,
    subjectSlug: subjectSlug ?? undefined,
    subjectType: subjectSlug
      ? ((q.get("subjectType") as ShopSubjectType | null) ?? "saint")
      : undefined,
    limit: Number(q.get("limit")) || undefined,
    offset: Number(q.get("offset")) || undefined,
  });

  return withCors(
    NextResponse.json(
      { products },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
