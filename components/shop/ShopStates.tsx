"use client";

import Link from "next/link";

// Shared loading / error / sign-in states for the client shop pages. The shop
// is online-only inside the native shell, so a dropped connection lands on
// ShopError with a retry rather than a blank screen.

export function ShopLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="py-16 text-center font-sans text-caption text-paper/45">
      {label}
    </p>
  );
}

/** Shimmer building block. */
function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg border border-paper/8 bg-paper/[0.04] ${className ?? ""}`}
    />
  );
}

/** Skeleton product card: image-led, like the real card's proportions. */
function CardBone() {
  return (
    <div>
      <Bone className="aspect-[4/5] w-full rounded-xl" />
      <Bone className="mt-3 h-4 w-3/4" />
      <Bone className="mt-2 h-4 w-1/3" />
    </div>
  );
}

/** Skeleton for card grids (category, store, home sections). */
export function ShopGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <CardBone />
        </li>
      ))}
    </ul>
  );
}

/** Skeleton for the shop home: a rail of cards and a wide banner. */
export function ShopHomeSkeleton() {
  return (
    <div className="px-5 md:px-0" aria-hidden>
      <div className="mt-10 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-[62vw] shrink-0 sm:w-[38vw] lg:w-[240px]">
            <CardBone />
          </div>
        ))}
      </div>
      <Bone className="mt-12 h-40 w-full rounded-xl" />
    </div>
  );
}

/** Skeleton for the product detail page. */
export function ShopDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pt-6 md:px-8" aria-hidden>
      <Bone className="h-4 w-40" />
      <div className="mt-4 gap-10 md:grid md:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Bone className="aspect-square w-full rounded-xl" />
          <Bone className="mt-6 h-8 w-2/3" />
          <Bone className="mt-3 h-4 w-1/2" />
          <Bone className="mt-6 h-24 w-full" />
        </div>
        <div className="hidden md:block">
          <Bone className="h-56 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for list pages (orders, messages). */
export function ShopListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 md:px-8" aria-hidden>
      <Bone className="mt-12 h-8 w-44" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <Bone key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ShopError({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-[520px] px-5 py-16 text-center">
      <p className="font-serif text-body text-paper/70 leading-[1.6]">
        {message ?? "We couldn't reach the shop. Check your connection and try again."}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="tap-press mt-5 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** Signed-out state for the shop's account-scoped pages (orders, messages,
 *  requests). Bounces through /signin with a `next` back to the same page. */
export function ShopSignInPrompt({
  title,
  body,
  next,
  extra,
}: {
  title: string;
  body: string;
  next: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pt-10 md:px-8 md:pt-14">
      <h1 className="font-display-serif text-heading text-paper">{title}</h1>
      <p className="mt-4 font-serif text-body text-paper/70 leading-[1.65]">
        {body}
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href={`/signin?next=${encodeURIComponent(next)}`}
          className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
        >
          Sign in
        </Link>
        {extra}
      </div>
    </div>
  );
}
