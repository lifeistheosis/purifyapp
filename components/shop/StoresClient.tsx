"use client";

import { ShopError, ShopHomeSkeleton } from "@/components/shop/ShopStates";
import { StoreDoor } from "@/components/shop/StoreDoor";
import type { ShopProductFull } from "@/lib/shop/types";
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
  // Each store's own pieces, from the products the home payload already
  // carries: each piece once, the ones in hand first.
  const pieces = new Map<string, ShopProductFull>();
  for (const p of [...(data?.readyToShip ?? []), ...(data?.featured ?? []), ...(data?.recent ?? [])]) {
    if (!pieces.has(p.slug)) pieces.set(p.slug, p);
  }
  const piecesOf = (slug: string) => [...pieces.values()].filter((p) => p.store.slug === slug);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pb-16 md:px-8">
      <header className="pt-12 md:pt-16">
        <h1 className="text-display-sm tracking-[-0.015em] text-paper md:text-display">
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
        <ul className={stores.length > 1 ? "mt-10 grid gap-4 md:grid-cols-2" : "mt-10"}>
          {stores.map((s) => (
            <li key={s.id}>
              {/* The ownership line stays on every door here (`details`). */}
              <StoreDoor store={s} pieces={piecesOf(s.slug)} wide={stores.length === 1} details />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
