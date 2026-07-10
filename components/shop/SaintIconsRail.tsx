"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { isNativeClient } from "@/lib/platform/native";
import type { ShopProductFull } from "@/lib/shop/types";

/**
 * "Icons of This Saint", the shop's one appearance on a saint page.
 * Client-fetched so saint pages stay static-exportable for Android:
 * offline or in the native shell this renders nothing at all, and it
 * renders nothing when the shop is dark or has no icons for the saint.
 * Deliberately placed below every religious and educational section:
 * commerce never outranks the life of the saint.
 */
export function SaintIconsRail({
  saintSlug,
  saintName,
}: {
  saintSlug: string;
  saintName: string;
}) {
  const [products, setProducts] = useState<ShopProductFull[] | null>(null);

  useEffect(() => {
    // The marketplace is web-only in Phase 1; the native shell has no
    // /shop routes in its bundle, so don't dangle links it can't open.
    if (isNativeClient()) return;
    let alive = true;
    fetch(`/api/shop/products?saint=${encodeURIComponent(saintSlug)}&limit=6`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unavailable"))))
      .then((data: { products?: ShopProductFull[] }) => {
        if (alive) setProducts(data.products ?? []);
      })
      .catch(() => {
        /* offline or shop dark: render nothing */
      });
    return () => {
      alive = false;
    };
  }, [saintSlug]);

  if (!products || products.length === 0) return null;

  return (
    <section aria-label={`Icons of ${saintName}`} className="mt-12 border-t border-white/8 pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display-serif text-title text-paper">
          Icons of this saint
        </h2>
        <Link
          href="/shop/eikon"
          className="shrink-0 font-sans text-detail text-paper/60 hover:text-paper"
        >
          Explore EIKON
        </Link>
      </div>
      <ul className="mt-4 flex gap-4 overflow-x-auto scrollbar-thin pb-2">
        {products.map((p) => {
          const img = p.media[0];
          return (
            <li key={p.id} className="w-[150px] shrink-0">
              <Link
                href={`/shop/icons/${p.slug}`}
                className="group block overflow-hidden rounded-lg border border-paper/10 bg-night-soft/60"
              >
                <div className="relative aspect-square bg-paper/[0.04]">
                  {img ? (
                    <Image
                      src={img.media_url}
                      alt={img.alt_text}
                      fill
                      sizes="150px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <p className="truncate px-3 pt-2 font-sans text-detail text-paper group-hover:text-gold">
                  {p.title}
                </p>
                <p className="px-3 pb-3 pt-0.5 font-sans text-caption text-paper/60">
                  {p.store.public_name}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 font-sans text-caption text-paper/60">
        Sold through the Purify Shop.{" "}
        <Link
          href={`/shop/request?subject=${encodeURIComponent(saintName)}`}
          className="underline underline-offset-4 hover:text-paper/70"
        >
          Request a different icon of {saintName}
        </Link>
        .
      </p>
    </section>
  );
}
