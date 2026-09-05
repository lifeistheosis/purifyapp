"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAdminFetch } from "@/components/admin/adminFetch";
import { Pill, SearchInput, Skeleton } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/shop/format";
import { hasSupplierImage, orderedMedia } from "@/lib/shop/imageRights";

import { stockLabel, type AdminProductRow } from "./productRow";
import { VisibleToggle } from "./VisibleToggle";

/**
 * The plain list at /admin/shop: thumbnail, name, price, stock, the Visible
 * switch, and the row itself is the link to the edit page. Search by name,
 * slug or maker. Nothing else: the sourcing table, margins and engagement
 * stay on the Catalog tab of the panel for the days they are wanted.
 *
 * Thumbnails prefer thumb_url, the 400px copy the media route writes, and
 * fall back to the full image for rows uploaded before it existed.
 * Unoptimized because supplier URLs are not in next/image's remotePatterns
 * and a 44px thumb gains nothing from the optimizer anyway.
 */
export function ProductList() {
  const { data, error, reload } = useAdminFetch<{ products: AdminProductRow[] }>(
    "/api/admin/shop/products",
  );
  const [query, setQuery] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);
  // Optimistic status per row, so the switch moves under the thumb and the
  // list does not wait for a refetch to agree with it.
  const [overrides, setOverrides] = useState<Record<string, "published" | "draft">>({});

  const products = data?.products ?? null;
  const q = query.trim().toLowerCase();
  const visible = (products ?? []).filter((p) =>
    !q ? true : [p.title, p.slug, p.maker_name ?? ""].join(" ").toLowerCase().includes(q),
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search products" className="min-w-[200px] flex-1" />
        {products ? (
          <span className="font-sans text-[12.5px] tabular-nums" style={{ color: "var(--adm-ink-3)" }}>
            {q ? `${visible.length} of ${products.length}` : `${products.length} products`}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="font-sans text-[13px]" style={{ color: "var(--adm-critical)" }}>
          {error}{" "}
          <button type="button" onClick={reload} className="underline">
            Try again
          </button>
        </p>
      ) : null}
      {rowError ? (
        <p role="alert" className="font-sans text-[13px]" style={{ color: "var(--adm-critical)" }}>
          {rowError}
        </p>
      ) : null}

      {!products && !error ? (
        <ul className="space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-[var(--adm-radius)] border p-3" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}>
              <Skeleton h={44} />
            </li>
          ))}
        </ul>
      ) : null}

      {products && products.length === 0 ? (
        <p className="rounded-[var(--adm-radius)] border p-4 font-sans text-[13px]" style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)", color: "var(--adm-ink-2)" }}>
          No products yet. New product, above, is the whole path.
        </p>
      ) : null}
      {products && products.length > 0 && visible.length === 0 ? (
        <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
          Nothing matches that search.
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="space-y-2">
          {visible.map((p) => {
            const status = overrides[p.id] ?? p.status;
            const cover = orderedMedia(p.media)[0] ?? null;
            const gated = status === "published" && hasSupplierImage(p.media);
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-[var(--adm-radius)] border p-2.5 md:p-3"
                style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)", boxShadow: "var(--adm-shadow-card)" }}
              >
                <Link
                  href={`/admin/shop/${p.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                  aria-label={`Edit ${p.title}`}
                >
                  <span
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--adm-radius-sm)] border"
                    style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
                  >
                    {cover ? (
                      <Image
                        src={cover.thumb_url || cover.media_url}
                        alt=""
                        fill
                        sizes="48px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[14px] font-semibold" style={{ color: "var(--adm-ink)" }}>
                      {p.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-[12.5px] tabular-nums" style={{ color: "var(--adm-ink-2)" }}>
                      <span>{formatPrice(p.price_cents, p.currency ?? "usd")}</span>
                      <span aria-hidden style={{ color: "var(--adm-ink-3)" }}>
                        ·
                      </span>
                      <span>Stock {stockLabel(p)}</span>
                      {gated ? <Pill tone="gold">Supplier photo, hidden</Pill> : null}
                    </span>
                  </span>
                </Link>
                <VisibleToggle
                  id={p.id}
                  status={status}
                  name={p.title}
                  onChanged={(next) => setOverrides((o) => ({ ...o, [p.id]: next }))}
                  onError={setRowError}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
