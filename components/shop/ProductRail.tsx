import Link from "next/link";

import type { ShopProductFull } from "@/lib/shop/types";
import { ProductCard } from "./ProductCard";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { T } from "@/components/i18n/T";

/**
 * Horizontal product rail: an edge-to-edge scroller on phones, where a
 * little of the third card shows so the row reads as one that scrolls.
 * Renders nothing when empty: no hollow sections, no placeholder cards.
 */
export function ProductRail({
  title,
  products,
  seeAllHref,
}: {
  title: string;
  products: ShopProductFull[];
  seeAllHref?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section aria-label={title} className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-4 px-5 md:px-0">
        <h2 className="font-heading text-title-sm text-paper md:text-title">{title}</h2>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="inline-flex min-h-11 items-center font-sans text-detail font-medium text-paper/60 hover:text-paper"
          >
            <T k="common.seeAll" />
          </Link>
        ) : null}
      </div>
      <ScrollRail as="ul" snap trackClassName="scroll-px-5 gap-3.5 px-5 pb-2 md:scroll-px-0 md:gap-5 md:px-0">
        {products.map((p) => (
          <li key={p.id} className="w-[42vw] sm:w-[30vw] lg:w-[220px]">
            <ProductCard product={p} sizes="(min-width: 1024px) 220px, 42vw" />
          </li>
        ))}
      </ScrollRail>
    </section>
  );
}
