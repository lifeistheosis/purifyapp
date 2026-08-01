"use client";

import { useEffect, useState } from "react";

import { ReviewPhotos } from "@/components/shop/ReviewPhotos";
import { RatingStars } from "@/components/shop/RatingStars";
import { VerifiedBuyerBadge } from "@/components/shop/VerifiedBuyerBadge";
import { wearsVerifiedBadge } from "@/lib/shop/reviews";
import { WriteReviewForm } from "@/components/shop/WriteReviewForm";
import {
  fetchShopReviews,
  hasPurchasedProduct,
} from "@/lib/shop/catalogClient";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Reviews block on the product page: the aggregate, the verified-buyer write
 * form (only for a buyer whose order has arrived), and the list. Ratings alone
 * count as reviews, so a list entry may be stars + date with no body. Every
 * review carries a "Verified buyer" badge — the submit RPC requires a delivered
 * order, so the badge is always truthful.
 */
export function ReviewsSection({
  productId,
  productSlug,
  productTitle,
  onReviewed,
}: {
  productId: string;
  productSlug: string;
  productTitle?: string;
  onReviewed?: () => void;
}) {
  const { t } = useTranslate();
  const { data, loading, reload } = useAsyncData(
    () => fetchShopReviews(productSlug),
    [productSlug],
  );
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasPurchasedProduct(productId).then((v) => {
      if (!cancelled) setEligible(v);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleSubmitted = () => {
    reload();
    onReviewed?.();
  };

  return (
    <section id="reviews" aria-label={t("shop.reviews")} className="mt-10 scroll-mt-24">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display-serif text-title text-paper">{t("shop.reviews")}</h2>
        {data && data.reviewCount > 0 ? (
          <RatingStars avg={data.avgStars} count={data.reviewCount} />
        ) : null}
      </div>

      {eligible ? (
        <WriteReviewForm productId={productId} onSubmitted={handleSubmitted} />
      ) : null}

      {loading ? (
        <p className="mt-4 font-sans text-caption text-paper/45">
          {t("shop.loadingReviews")}
        </p>
      ) : null}

      {data && data.reviews.length > 0 ? (
        <ul className="mt-5 space-y-4">
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
              {/* Only a review tied to a real delivered order earns the badge.
                  This was unconditional, so operator-seeded rows (order_id
                  null) were shown to shoppers as verified purchases. */}
              {wearsVerifiedBadge(r) ? (
                <div className="mt-2">
                  <VerifiedBuyerBadge bought={productTitle} />
                </div>
              ) : null}
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
          {t("shop.noReviewsYet")}
          {eligible
            ? " Be the first to review it."
            : " Only verified buyers can leave a review."}
        </p>
      ) : null}
    </section>
  );
}
