"use client";

import { useEffect, useState } from "react";

import { ReviewPhotos } from "@/components/shop/ReviewPhotos";
import { RatingStars } from "@/components/shop/RatingStars";
import { VerifiedBuyerBadge } from "@/components/shop/VerifiedBuyerBadge";
import { WriteStoreReviewForm } from "@/components/shop/WriteStoreReviewForm";
import {
  fetchShopStoreReviews,
  hasDeliveredOrderFromStore,
} from "@/lib/shop/catalogClient";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Store-level reviews block on the store page: reviews of the store itself
 * (EIKON), distinct from the ratings on its individual products. Same shape as
 * the product ReviewsSection — the aggregate, the verified-buyer write form
 * (only for a buyer whose order from this store has arrived), and the list.
 * Each review's badge reads "Bought {storeName}" since a store review proves a
 * delivered order from the store, not a specific product.
 */
export function StoreReviewsSection({
  storeId,
  storeSlug,
  storeName,
}: {
  storeId: string;
  storeSlug: string;
  storeName: string;
}) {
  const { t } = useTranslate();
  const { data, loading, reload } = useAsyncData(
    () => fetchShopStoreReviews(storeSlug),
    [storeSlug],
  );
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasDeliveredOrderFromStore(storeId).then((v) => {
      if (!cancelled) setEligible(v);
    });
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return (
    <section
      aria-label={`Reviews of ${storeName}`}
      className="mt-14 scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display-serif text-title md:text-heading text-paper">
          {t("shop.whatBuyersSayAbout")} {storeName}
        </h2>
        {data && data.reviewCount > 0 ? (
          <RatingStars avg={data.avgStars} count={data.reviewCount} />
        ) : null}
      </div>

      {eligible ? (
        <WriteStoreReviewForm
          storeId={storeId}
          storeName={storeName}
          onSubmitted={reload}
        />
      ) : null}

      {loading ? (
        <p className="mt-4 font-sans text-caption text-paper/45">
          {t("shop.loadingReviews")}
        </p>
      ) : null}

      {data && data.reviews.length > 0 ? (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {data.reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-paper/10 bg-night-soft/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <RatingStars avg={r.stars} count={1} showCount={false} />
                  <p className="mt-1.5 font-sans text-detail text-paper/80">
                    <span className="font-semibold text-paper">
                      {r.display_name || "Anonymous"}
                    </span>
                    {r.location || r.anonymous ? (
                      <span className="text-paper/50"> · {r.location || "?"}</span>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap font-sans text-caption text-paper/50">
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="mt-2">
                <VerifiedBuyerBadge bought={storeName} />
              </div>
              {r.body ? (
                <p className="mt-2.5 whitespace-pre-wrap font-serif text-body text-paper/80 leading-[1.6]">
                  {r.body}
                </p>
              ) : null}
              <ReviewPhotos urls={r.photo_urls} />
            </li>
          ))}
        </ul>
      ) : !loading && data && data.reviewCount === 0 ? (
        <p className="mt-4 font-serif text-body text-paper/60 leading-[1.6]">
          {t("shop.noReviewsOf")} {storeName} {t("shop.yet")}
          {eligible
            ? " Be the first to share your experience."
            : " Reviews come from buyers whose orders have arrived."}
        </p>
      ) : null}
    </section>
  );
}
