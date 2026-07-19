import Link from "next/link";

import type { ShopProductFull } from "@/lib/shop/types";
import { ProductCard } from "./ProductCard";
import { T } from "@/components/i18n/T";

/**
 * Horizontal product rail: an edge-to-edge scroller on phones, the
 * primary browsing surface of the shop home. Renders nothing when
 * empty — no hollow sections, no placeholder cards.
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
      <div className="mb-4 flex items-baseline justify-between px-5 md:px-0">
        <h2 className="font-display-serif text-title md:text-heading text-paper">
          {title}
        </h2>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
          >
            <T k="common.seeAll" />
          </Link>
        ) : null}
      </div>
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-thin px-5 pb-2 md:px-0">
        {products.map((p) => (
          <li key={p.id} className="w-[54vw] shrink-0 snap-start sm:w-[36vw] lg:w-[240px]">
            <ProductCard product={p} sizes="(min-width: 1024px) 240px, 54vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
