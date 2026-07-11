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
