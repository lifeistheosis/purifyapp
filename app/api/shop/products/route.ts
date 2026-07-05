import { NextResponse } from "next/server";

import { listProducts } from "@/lib/shop/catalog";
import { shopEnabled } from "@/lib/shop/flags";
import type { ShopCategory, ShopSubjectType } from "@/lib/shop/types";

/**
 * Public catalog listing. Read-only, RLS-scoped (published products
 * only), used by the saint-page rail and future client filters. Cached
 * briefly: the catalog changes at admin speed, not user speed.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ products: [] }, { status: 404 });
  }

  const url = new URL(req.url);
  const saint = url.searchParams.get("saint");
  const subjectType = url.searchParams.get("subjectType");
  const category = url.searchParams.get("category");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 12, 24);

  const products = await listProducts({
    subjectSlug: saint ?? undefined,
    subjectType: saint
      ? ((subjectType as ShopSubjectType | null) ?? "saint")
      : undefined,
    category: (category as ShopCategory | null) ?? undefined,
    limit,
  });

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
