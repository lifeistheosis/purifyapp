"use client";

import Link from "next/link";

import {
  ShopError,
  ShopLoading,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import type { ShopIconRequest } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_UNRESOLVED_MESSAGE,
  resolveUser,
} from "@/lib/supabase/resolveUser";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const REQUEST_STATUS_LABELS: Record<ShopIconRequest["status"], string> = {
  new: "Received",
  reviewing: "Being reviewed",
  sourced: "Icon found",
  contacted: "We wrote to you",
  closed: "Closed",
};

type Result = { signedIn: false } | { signedIn: true; requests: ShopIconRequest[] };

async function load(): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();
  const { data } = await supabase
    .from("shop_icon_requests")
    .select(
      "id, subject, saint_slug, request_type, preferred_size, product_preference, budget_band, desired_date, notes, notify_when_available, status, created_at",
    )
    .order("created_at", { ascending: false });
  return { signedIn: true, requests: (data ?? []) as ShopIconRequest[] };
}

export function RequestsClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(load, []);

  if (loading) return <ShopLoading label={t("shop.loadingYourRequests")} />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.yourIconRequests")}
        body="Sign in to see requests tied to your account. Requests sent with an email address only are answered by email."
        next="/shop/requests"
        extra={
          <Link
            href="/shop/request"
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/20 px-6 font-sans text-ui font-semibold text-paper"
          >
            {t("shop.newRequest")}
          </Link>
        }
      />
    );
  }

  const requests = data && data.signedIn ? data.requests : [];

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 md:px-8">
      <header className="flex items-end justify-between gap-4 pt-10 md:pt-14">
        <div>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
            {t("shop.purifyShop")}
          </p>
          <h1 className="mt-2 font-display-serif text-heading text-paper">
            {t("shop.yourIconRequests")}
          </h1>
        </div>
        <Link
          href="/shop/request"
          className="tap-press inline-flex min-h-[44px] shrink-0 items-center rounded-pill border border-paper/20 px-5 font-sans text-detail font-semibold text-paper hover:border-paper/40"
        >
          {t("shop.newRequest")}
        </Link>
      </header>

      {requests.length === 0 ? (
        <p className="mt-8 font-serif text-body text-paper/65 leading-[1.65]">
          {t("shop.noRequestsYetWhenYou")}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-paper/8 rounded-md border border-paper/12">
          {requests.map((r) => (
            <li key={r.id} className="bg-paper/[0.02] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-sans text-ui font-semibold text-paper">
                  {r.subject}
                </p>
                <span className="shrink-0 rounded-pill border border-paper/15 px-3 py-1 font-sans text-caption font-semibold text-paper/70">
                  {REQUEST_STATUS_LABELS[r.status]}
                </span>
              </div>
              <p className="mt-1 font-sans text-caption text-paper/60">
                {new Date(r.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {r.preferred_size ? ` · ${r.preferred_size}` : ""}
                {r.notify_when_available ? " · You'll be notified" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
