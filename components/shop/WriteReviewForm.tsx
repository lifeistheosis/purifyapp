"use client";

import { useState } from "react";

import { Star } from "@/components/ui/icons/Star";
import { cn } from "@/lib/cn";
import { submitReview } from "@/lib/shop/catalogClient";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

/** The verified-buyer write form: a star picker and an optional note. */
export function WriteReviewForm({
  productId,
  onSubmitted,
}: {
  productId: string;
  onSubmitted: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stars < 1) {
      setError("Choose a star rating.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitReview({ productId, stars, body: body.trim() || null });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your review.");
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || stars;

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-lg border border-paper/10 bg-night-soft/60 p-5"
    >
      <p className="font-sans text-ui font-semibold text-paper">
        Write a review
      </p>
      <p className="mt-1 font-sans text-caption text-paper/55">
        You bought this icon, so your review is marked as a verified purchase.
      </p>

      <div
        className="mt-3 flex items-center gap-1"
        role="group"
        aria-label="Your rating"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={stars === i}
            aria-label={`${i} ${i === 1 ? "star" : "stars"}`}
            onClick={() => setStars(i)}
            onMouseEnter={() => setHover(i)}
            className={cn(
              "tap-press leading-none transition-colors",
              i <= shown ? "text-gold" : "text-paper/30 hover:text-paper/50",
            )}
          >
            <Star size={26} filled={i <= shown} />
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Your review</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="What did you think of the icon? (optional)"
          className={field}
        />
      </label>

      {error ? (
        <p role="alert" className="mt-2 font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="tap-press mt-3 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Post review"}
      </button>
    </form>
  );
}
