"use client";

import Link from "next/link";

import { ShopError, ShopHomeSkeleton } from "@/components/shop/ShopStates";
import { fetchShopHome } from "@/lib/shop/catalogClient";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The store directory.
 *
 * There was none, and no store index of any kind. A second store could be
 * created, provisioned, stocked and made live, and the only way to reach it
 * was to type its URL: /shop hardcoded a link to /shop/eikon and the home API
 * called getStore("eikon") by literal.
 *
 * It reads /api/shop/catalog/home rather than a new endpoint. That call
 * already returns every live store, it is already cached, and the native shell
 * is already making it, so a directory costs no extra round-trip. Add a
 * dedicated endpoint when this page needs something the home does not carry.
 */
export function StoresClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(fetchShopHome, []);
  const stores = data?.stores ?? [];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pb-16 md:px-8">
      <header className="pt-12 md:pt-16">
        <h1 className="font-display-serif text-display-sm md:text-display text-paper">
          {t("shop.theStores")}
        </h1>
        <p className="mt-4 max-w-[560px] font-serif text-body text-paper/70 leading-[1.65]">
          {t("shop.storesIntro")}
        </p>
      </header>

      {loading ? <ShopHomeSkeleton /> : null}
      {error ? <ShopError message={error} onRetry={reload} /> : null}

      {data && stores.length === 0 ? (
        <p className="mt-10 font-serif text-body text-paper/65 leading-[1.65]">
          {t("shop.noStoresYet")}
        </p>
      ) : null}

      {stores.length > 0 ? (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {stores.map((s) => (
            <li key={s.id}>
              <Link
                href={`/shop/${s.slug}`}
                className="press-card block h-full rounded-lg border border-paper/12 bg-night-soft/60 p-6 md:p-8"
              >
                <p className="font-display-serif text-title tracking-[0.08em] text-paper">
                  {s.public_name}
                </p>
                {s.tagline ? (
                  <p className="mt-2 font-serif text-body italic text-paper/65 leading-[1.5]">
                    {s.tagline}
                  </p>
                ) : null}
                {s.description ? (
                  <p className="mt-3 line-clamp-4 font-serif text-body text-paper/70 leading-[1.6]">
                    {s.description}
                  </p>
                ) : null}
                {s.shipping_origin ? (
                  <p className="mt-4 font-sans text-caption text-paper/55">
                    {t("shop.shipsFrom")} {s.shipping_origin}
                  </p>
                ) : null}
                {/* The ownership line, on the card. A directory that lists
                    stores without saying who runs each one is the surface
                    where "sold by Purify" quietly becomes the assumption. */}
                <p className="mt-3 font-sans text-caption text-paper/50 leading-[1.5]">
                  {s.ownership_disclosure}
                </p>
                <p className="mt-4 font-sans text-detail font-medium text-paper/70">
                  {t("shop.visitTheStore")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
