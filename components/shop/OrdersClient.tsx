"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ShopError,
  ShopListSkeleton,
  ShopSignInPrompt,
} from "@/components/shop/ShopStates";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/shop/format";
import { isHiddenOrder, isUnfinishedCheckout } from "@/lib/shop/orders";
import {
  BUYER_ORDER_STEPS,
  buyerOrderStatus,
  buyerStepIndex,
} from "@/lib/shop/status";
import type { ShopOrder } from "@/lib/shop/types";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_UNRESOLVED_MESSAGE,
  resolveUser,
} from "@/lib/supabase/resolveUser";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type Result = { signedIn: false } | { signedIn: true; orders: ShopOrder[] };

async function load(): Promise<Result> {
  // Auth-required page: an unresolved check (auth lock, network) must land
  // on the retry state, never on the sign-in prompt (F-13).
  const auth = await resolveUser();
  if (auth.state === "unresolved") throw new Error(AUTH_UNRESOLVED_MESSAGE);
  if (auth.state === "signed-out") return { signedIn: false };
  const supabase = createClient();
  // RLS self-select: only the caller's orders can come back.
  const { data } = await supabase
    .from("shop_orders")
    .select(
      "id, items_total_cents, shipping_cents, tax_cents, total_cents, currency, payment_status, fulfillment_status, outbound_tracking, created_at, items:shop_order_items(title, unit_price_cents, quantity)",
    )
    .order("created_at", { ascending: false });
  return { signedIn: true, orders: (data ?? []) as unknown as ShopOrder[] };
}

/** Quiet row for a checkout that was started but never paid. */
function UnfinishedRow({
  order,
  onRemoved,
}: {
  order: ShopOrder;
  onRemoved: () => void;
}) {
  const { t } = useTranslate();
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await apiFetch("/api/shop/checkout/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
    } catch {
      /* the reload shows the truth either way */
    }
    onRemoved();
  }
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-paper/8 bg-paper/[0.02] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-sans text-detail font-medium text-paper/75">
          {order.items.map((i) => i.title).join(", ")}
        </p>
        <p className="mt-0.5 font-sans text-caption text-paper/50">
          {t("shop.youLeftCheckoutBeforePaying")}
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        className="tap-press shrink-0 rounded-pill border border-paper/20 px-4 py-1.5 font-sans text-caption font-semibold text-paper/70 hover:border-paper/40 hover:text-paper disabled:opacity-60"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
    </li>
  );
}

export function OrdersClient() {
  const { t } = useTranslate();
  const { data, error, loading, reload } = useAsyncData(load, []);

  if (loading) return <ShopListSkeleton />;
  if (error) return <ShopError message={error} onRetry={reload} />;
  if (data && !data.signedIn) {
    return (
      <ShopSignInPrompt
        title={t("shop.yourOrders")}
        body="Sign in to see orders placed with your account. Guest orders are tracked through the email receipt."
        next="/shop/orders"
      />
    );
  }

  const all = data && data.signedIn ? data.orders : [];
  const visible = all.filter((o) => !isHiddenOrder(o));
  const unfinished = visible.filter(isUnfinishedCheckout);
  const orders = visible.filter((o) => !isUnfinishedCheckout(o));

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-8 md:px-8">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          {t("shop.purifyShop")}
        </p>
        <h1 className="mt-2 font-display-serif text-heading text-paper">{t("shop.yourOrders")}</h1>
      </header>

      {unfinished.length > 0 ? (
        <section aria-label={t("shop.unfinishedCheckout")} className="mt-6">
          <ul className="space-y-2">
            {unfinished.map((o) => (
              <UnfinishedRow key={o.id} order={o} onRemoved={reload} />
            ))}
          </ul>
        </section>
      ) : null}

      {orders.length === 0 ? (
        <p className="mt-8 font-serif text-body text-paper/65 leading-[1.65]">
          {t("shop.noOrdersYetWhenYou")}
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {orders.map((o) => {
            const status = buyerOrderStatus(o);
            const step = buyerStepIndex(status);
            return (
              <li key={o.id} className="press-card relative rounded-lg border border-paper/10 bg-night-soft/60 p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-sans text-ui font-semibold text-paper">
                    <Link href={`/shop/orders/detail?id=${o.id}`} className="after:absolute after:inset-0">
                      {o.items.map((i) => i.title).join(", ")}
                    </Link>
                  </p>
                  <p className="shrink-0 font-sans text-ui font-semibold text-paper">
                    {formatPrice(o.total_cents, o.currency)}
                  </p>
                </div>
                <p className="mt-1 font-sans text-caption text-paper/60">
                  {t("shop.placed")}{" "}
                  {new Date(o.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>

                {step >= 0 ? (
                  <ol className="mt-4 flex items-center gap-1" aria-label={t("shop.orderProgress")}>
                    {BUYER_ORDER_STEPS.map((s, i) => (
                      <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
                        <span
                          aria-hidden
                          className={cn(
                            "h-1.5 w-full rounded-full",
                            i <= step ? "bg-gold" : "bg-paper/10",
                          )}
                        />
                        <span
                          className={cn(
                            "text-center font-sans text-[10px] leading-tight",
                            i === step ? "font-semibold text-paper" : "text-paper/60",
                          )}
                          aria-current={i === step ? "step" : undefined}
                        >
                          {s}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 inline-flex rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption font-semibold text-paper/70">
                    {status}
                  </p>
                )}

                {o.outbound_tracking ? (
                  <p className="mt-3 font-sans text-detail text-paper/65">
                    {t("shop.tracking")} <span className="text-paper">{o.outbound_tracking}</span>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
