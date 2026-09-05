import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { eventBySlug } from "@/lib/history/events";
import { getSaint } from "@/lib/saints/saints";
import { blessingOffered, getBlessingConfig } from "@/lib/shop/blessing";
import { getProduct, getStore, relatedProducts } from "@/lib/shop/catalog";
import { shopEnabled } from "@/lib/shop/flags";
import type {
  ShopProductSubject,
  ShopSaintCard,
  ShopSubjectChip,
} from "@/lib/shop/types";

/** Subject chip resolved into Purify's own content, server-side, so the shop
 *  client never has to bundle the saints/history registries. */
function subjectChip(s: ShopProductSubject): ShopSubjectChip {
  if (s.subject_type === "saint") {
    const saint = getSaint(s.subject_slug);
    if (saint) return { label: saint.name, href: `/saints/${saint.slug}` };
  }
  if (s.subject_type === "event") {
    const event = eventBySlug(s.subject_slug);
    if (event)
      return {
        label: event.shortTitle ?? event.title,
        href: `/history/${event.slug}`,
      };
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

/**
 * Product detail + related icons + resolved subject chips + saint card, in one
 * call. Public + RLS-scoped; a listing still on a supplier's image returns 404
 * (the rights gate in getProduct).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return withCors(
      NextResponse.json({ error: "Icon not found." }, { status: 404 }),
      req,
    );
  }
  const [related, store, blessingConfig] = await Promise.all([
    relatedProducts(product),
    getStore(product.store.slug),
    getBlessingConfig(),
  ]);
  // Null unless the product carries the flag AND the owner has enabled the
  // config; the page has one thing to check. The config's own policy hides a
  // disabled row from this anon read, so absent, disabled and unapplied all
  // arrive here the same way.
  const blessing = blessingOffered(product, blessingConfig)
    ? {
        parishName: blessingConfig.parishName,
        copyMd: blessingConfig.copyMd,
        handlingCents: blessingConfig.handlingCents,
      }
    : null;
  const chips = product.subjects.map(subjectChip);

  const saintSubject = product.subjects.find((s) => s.subject_type === "saint");
  const resolvedSaint = saintSubject ? getSaint(saintSubject.subject_slug) : null;
  const saint: ShopSaintCard = resolvedSaint
    ? {
        name: resolvedSaint.name,
        slug: resolvedSaint.slug,
        shortBio: resolvedSaint.shortBio,
      }
    : null;

  return withCors(
    NextResponse.json(
      {
        product,
        related,
        chips,
        saint,
        storeShippingMd: store?.shipping_policy_md ?? null,
        storeReturnMd: store?.return_policy_md ?? null,
        blessing,
      },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
