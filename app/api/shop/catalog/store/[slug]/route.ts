import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { getStore, listProducts } from "@/lib/shop/catalog";
import { shopEnabled } from "@/lib/shop/flags";
import { getOwnStorePreview } from "@/lib/shop/storePreview";

/**
 * Storefront: the store record + its full published catalogue in one call.
 * Public + RLS-scoped (live stores, published products only).
 *
 * ── ?preview=1, and why it had to exist ─────────────────────────────────
 *
 * A new seller is told to fill in their store page, and then could never look
 * at it. This route 404s any store that is not live, for everyone, with no
 * exemption for the person who owns it, and the console had no preview
 * anywhere. So the first three steps of onboarding were done blind: write a
 * tagline, a description, two policies, upload a logo and a banner, and find
 * out whether any of it reads well only after asking a human to make it
 * public.
 *
 * With ?preview=1 the caller's seller session is resolved and, if the store is
 * theirs, it is read with the service role and returned with preview: true.
 * Somebody else's draft store still 404s. Nothing about the public path
 * changes: without the flag this is byte for byte the route it was.
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
    // Not live. The owner may still look at their own; nobody else may.
    const preview = new URL(req.url).searchParams.get("preview") === "1";
    if (preview) {
      const own = await getOwnStorePreview(slug);
      if (own) {
        return withCors(
          NextResponse.json(
            { store: own.store, products: own.products, preview: true },
            // Never cached, and never by a shared cache: this body is visible
            // to exactly one person and is a draft that changes as they edit.
            { headers: { "Cache-Control": "no-store" } },
          ),
          req,
        );
      }
    }
    return withCors(
      NextResponse.json({ error: "Store not found." }, { status: 404 }),
      req,
    );
  }

  const products = await listProducts({ storeSlug: slug, limit: 60 });

  return withCors(
    NextResponse.json(
      { store, products },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
