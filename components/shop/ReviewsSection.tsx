"use client";

import { useEffect, useState } from "react";

import { RatingStars } from "@/components/shop/RatingStars";
import { WriteReviewForm } from "@/components/shop/WriteReviewForm";
import {
  fetchShopReviews,
  hasPurchasedProduct,
} from "@/lib/shop/catalogClient";
import { useAsyncData } from "@/lib/shop/useAsyncData";

/**
 * Reviews block on the product page: the aggregate, the verified-buyer write
 * form (only for a buyer), and the list. Ratings alone count as reviews, so a
 * list entry may be stars + date with no body.
 */
export function ReviewsSection({
  productId,
  productSlug,
  onReviewed,
}: {
  productId: string;
  productSlug: string;
  onReviewed?: () => void;
}) {
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
    <section aria-label="Reviews" className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display-serif text-title text-paper">Reviews</h2>
        {data && data.reviewCount > 0 ? (
          <RatingStars avg={data.avgStars} count={data.reviewCount} />
        ) : null}
      </div>

      {eligible ? (
        <WriteReviewForm productId={productId} onSubmitted={handleSubmitted} />
      ) : null}

      {loading ? (
        <p className="mt-4 font-sans text-caption text-paper/45">
          Loading reviews…
        </p>
      ) : null}

      {data && data.reviews.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {data.reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-paper/10 bg-night-soft/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <RatingStars avg={r.stars} count={1} showCount={false} />
                <span className="font-sans text-caption text-paper/50">
                  Verified buyer ·{" "}
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              {r.body ? (
                <p className="mt-2 whitespace-pre-wrap font-serif text-body text-paper/80 leading-[1.6]">
                  {r.body}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !loading && data && data.reviewCount === 0 ? (
        <p className="mt-4 font-serif text-body text-paper/60 leading-[1.6]">
          No reviews yet.
          {eligible
            ? " Be the first to review it."
            : " Only verified buyers can leave a review."}
        </p>
      ) : null}
    </section>
  );
}
