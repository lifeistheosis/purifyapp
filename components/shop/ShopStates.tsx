"use client";

import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

// Shared loading / error / sign-in states for the client shop pages. The shop
// is online-only inside the native shell, so a dropped connection lands on
// ShopError with a retry rather than a blank screen.

/**
 * The wait on a shop page that is a list (orders, messages, requests, an
 * application). Was a single centred line of text, which reads as an empty
 * screen rather than a loading one. The label survives as the accessible
 * name, so a screen reader still hears what is being fetched.
 */
export function ShopLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div aria-busy aria-label={label} className="py-8">
      <SkeletonList rows={3} />
    </div>
  );
}

/**
 * Shimmer building block. A thin wrapper over the shared `Skeleton` rather
 * than a second implementation of it: the shop's bones carry a hairline
 * border and the app's do not, and that is the only difference worth
 * keeping.
 */
function Bone({ className }: { className?: string }) {
  return (
    <Skeleton
      weight="faint"
      rounded="rounded-lg"
      // bg kept at the shop's exact shade rather than the shared weights,
      // so consolidating the primitive changes no pixels.
      className={cn("border border-paper/8 bg-paper/[0.04]", className)}
    />
  );
}

/** Skeleton product card, in the real card's proportions: the vitrine, two
 *  title lines, the availability line and the price. */
function CardBone() {
  return (
    <div>
      <Bone className="aspect-[4/5] w-full rounded-2xl" />
      <Bone className="mt-3 h-4 w-11/12" />
      <Bone className="mt-1.5 h-4 w-2/3" />
      <Bone className="mt-2.5 h-3 w-1/2" />
      <Bone className="mt-4 h-5 w-1/3" />
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

/** Skeleton for the shop home under its masthead: the collection's heading,
 *  its category chips and the first row of its grid. */
export function ShopHomeSkeleton() {
  return (
    <div className="mt-12 px-5 md:mt-20 md:px-0" aria-hidden>
      <Bone className="h-7 w-44" />
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-11 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardBone key={i} />
        ))}
      </div>
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
  const { t } = useTranslate();
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
          {t("error.tryAgain")}
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
  const { t } = useTranslate();
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pt-10 md:px-8 md:pt-14">
      <h1 className="text-heading text-paper">{title}</h1>
      <p className="mt-4 font-serif text-body text-paper/70 leading-[1.65]">
        {body}
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href={`/signin?next=${encodeURIComponent(next)}`}
          className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
        >
          {t("common.signIn")}
        </Link>
        {extra}
      </div>
    </div>
  );
}
