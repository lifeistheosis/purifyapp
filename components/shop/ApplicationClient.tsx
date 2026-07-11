"use client";

import Link from "next/link";

import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import type {
  ShopApplicationStatus,
  ShopMerchantApplication,
} from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_UNRESOLVED_MESSAGE,
  resolveUser,
} from "@/lib/supabase/resolveUser";

const STATUS_COPY: Record<ShopApplicationStatus, { label: string; body: string }> = {
  draft: { label: "Draft", body: "Your application hasn't been submitted yet." },
  submitted: {
    label: "Submitted",
    body: "Your application is in the queue. A person will read it, usually within a couple of weeks.",
  },
  under_review: { label: "Under review", body: "We're reading your application now." },
  more_info_required: {
    label: "More information needed",
    body: "We've written to your application email with questions. Reply there and review continues.",
  },
  approved: {
    label: "Approved",
    body: "Welcome. We'll contact you to begin store setup; nothing goes live until it's ready.",
  },
  store_setup: {
    label: "Store setup",
    body: "We're building your storefront together. You'll approve everything before it opens.",
  },
  live: { label: "Live", body: "Your store is open on the Purify marketplace." },
  declined: {
    label: "Declined",
    body: "We couldn't approve this application. The email we sent explains why, and you're welcome to apply again.",
  },
  suspended: {
    label: "Suspended",
    body: "Your store is paused. Check the email we sent for details.",
  },
};

type Result =
  | { signedIn: false }
  | { signedIn: true; app: ShopMerchantApplication | null };

async function load(): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();
  const { data } = await supabase
    .from("shop_merchant_applications")
    .select(
      "id, proposed_store_name, seller_type, legal_name, email, phone, country, shipping_origin, portfolio_url, product_methods, fulfillment_offerings, processing_time, countries_served, return_policy, rights_declaration, seller_description, agreed_standards, status, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { signedIn: true, app: (data as ShopMerchantApplication | null) ?? null };
}

export function ApplicationClient() {
  const { data, error, loading, reload } = useAsyncData(load, []);

  if (loading) return <ShopLoading label="Loading your application…" />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title="Your merchant application"
        body="Sign in to see your application status."
        next="/shop/sell/application"
      />
    );
  }

  const app = data && data.signedIn ? data.app : null;

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Sell on Purify
        </p>
        <h1 className="mt-2 font-display-serif text-heading text-paper">
          Your merchant application
        </h1>
      </header>

      {!app ? (
        <div className="mt-8">
          <p className="font-serif text-body text-paper/70 leading-[1.65]">
            You haven&rsquo;t applied yet.
          </p>
          <Link
            href="/shop/sell"
            className="tap-press mt-5 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
          >
            Start an application
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="font-display-serif text-title text-paper">
                {app.proposed_store_name}
              </p>
              <span className="shrink-0 rounded-pill border border-gold/40 bg-gold/10 px-3 py-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-gold">
                {STATUS_COPY[app.status].label}
              </span>
            </div>
            <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
              {STATUS_COPY[app.status].body}
            </p>
            <p className="mt-3 font-sans text-caption text-paper/60">
              Submitted{" "}
              {new Date(app.created_at).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {" · "}applications are reviewed by hand; approval is not
              automatic.
            </p>
          </div>

          <dl className="rounded-lg border border-paper/10 bg-night-soft/60 p-6 font-sans text-detail">
            <div className="flex justify-between gap-6 border-b border-white/6 py-2">
              <dt className="text-paper/60">Seller type</dt>
              <dd className="text-paper/85">{app.seller_type.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-white/6 py-2">
              <dt className="text-paper/60">Country</dt>
              <dd className="text-paper/85">{app.country}</dd>
            </div>
            <div className="flex justify-between gap-6 py-2">
              <dt className="text-paper/60">Contact email</dt>
              <dd className="text-paper/85">{app.email}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
