import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { ShopIconRequest } from "@/lib/shop/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your icon requests" };

/** Buyer-facing wording for request workflow states. */
const REQUEST_STATUS_LABELS: Record<ShopIconRequest["status"], string> = {
  new: "Received",
  reviewing: "Being reviewed",
  sourced: "Icon found",
  contacted: "We wrote to you",
  closed: "Closed",
};

export default async function MyRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[680px] px-5 pt-10 md:px-8 md:pt-14">
        <h1 className="font-display-serif text-heading text-paper">
          Your icon requests
        </h1>
        <p className="mt-4 font-serif text-body text-paper/70 leading-[1.65]">
          Sign in to see requests tied to your account. Requests sent with an
          email address only are answered by email.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/signin?next=/shop/requests"
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
          >
            Sign in
          </Link>
          <Link
            href="/shop/request"
            className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/20 px-6 font-sans text-ui font-semibold text-paper"
          >
            New request
          </Link>
        </div>
      </div>
    );
  }

  // RLS self-select: this query can only ever return the caller's rows.
  const { data } = await supabase
    .from("shop_icon_requests")
    .select(
      "id, subject, saint_slug, request_type, preferred_size, product_preference, budget_band, desired_date, notes, notify_when_available, status, created_at",
    )
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as ShopIconRequest[];

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 md:px-8">
      <header className="flex items-end justify-between gap-4 pt-10 md:pt-14">
        <div>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
            Purify Shop
          </p>
          <h1 className="mt-2 font-display-serif text-heading text-paper">
            Your icon requests
          </h1>
        </div>
        <Link
          href="/shop/request"
          className="tap-press inline-flex min-h-[44px] shrink-0 items-center rounded-pill border border-paper/20 px-5 font-sans text-detail font-semibold text-paper hover:border-paper/40"
        >
          New request
        </Link>
      </header>

      {requests.length === 0 ? (
        <p className="mt-8 font-serif text-body text-paper/65 leading-[1.65]">
          No requests yet. When you ask for an icon, it appears here with its
          status.
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
              <p className="mt-1 font-sans text-caption text-paper/50">
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
