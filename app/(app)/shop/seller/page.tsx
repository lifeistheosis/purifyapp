import type { Metadata } from "next";
import Link from "next/link";

import { OpenStoreRequest } from "@/components/shop/seller/OpenStoreRequest";
import { SetupChecklist } from "@/components/shop/seller/SetupChecklist";
import { connectStatus } from "@/lib/shop/connect";
import { earningsSummary } from "@/lib/shop/earnings";
import { formatPrice } from "@/lib/shop/format";
import { refundIsActive } from "@/lib/shop/refunds";
import { getSellerContext } from "@/lib/shop/seller";
import { getOrderFees, getStorePayouts } from "@/lib/shop/payouts";
import {
  conversationUnreadForSeller,
  listSellerConversations,
  listSellerOrders,
  listSellerProducts,
  listSellerRefunds,
} from "@/lib/shop/sellerData";
import { sellerSetupSteps } from "@/lib/shop/sellerSetup";
import {
  needsSellerAction,
  fulfillmentPathFor,
  statusLabelsFor,
} from "@/lib/shop/sellerOrders";

export const metadata: Metadata = { title: "Overview" };

/**
 * The morning-coffee page: what needs me, how is the store doing. Four
 * stat cards, then the orders that actually need a hand. The store
 * setup notice appears while the store is still draft/paused so a new
 * seller always knows why buyers can't see them yet.
 */
export default async function SellerOverviewPage() {
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") return null; // layout already gated

  const [orders, conversations, refunds, products, payouts] = await Promise.all([
    listSellerOrders(ctx.seller.id),
    listSellerConversations(ctx.seller.id),
    listSellerRefunds(ctx.seller.id),
    listSellerProducts(ctx.seller.id),
    // Fails soft to null while 20260824_shop_connect.sql is unapplied, which
    // reads as "payouts not set up" rather than throwing.
    ctx.store ? getStorePayouts(ctx.store.id) : Promise.resolve(null),
  ]);

  // What is still between this seller and an open store. The order is not
  // obvious and is enforced by the API, so it lives in lib/shop/sellerSetup.ts
  // where it is tested rather than in the JSX.
  const setupSteps = sellerSetupSteps({
    store: ctx.store
      ? {
          status: ctx.store.status,
          tagline: ctx.store.tagline,
          description: ctx.store.description,
          shipping_origin: ctx.store.shipping_origin,
          return_policy_md: ctx.store.return_policy_md,
        }
      : null,
    connect: connectStatus(payouts),
    purifyOperated: ctx.seller.seller_type === "purify_owned",
    draftListings: products.filter((p) => p.status === "draft").length,
    publishedListings: products.filter((p) => p.status === "published").length,
  });

  const fees = await getOrderFees(orders.map((o) => o.id));
  const summary = earningsSummary(orders, fees);

  // EIKON's sourcing and inspection stages describe a warehouse an independent
  // seller has never seen; statusLabelsFor names the states for whoever is
  // actually shipping. See lib/shop/sellerOrders.ts.
  // Plain words, not a status enum. "charges_only" means nothing to a seller.
  const payoutsLabel =
    ctx.seller.seller_type === "purify_owned"
      ? "Purify"
      : connectStatus(payouts) === "ready"
        ? "Live"
        : connectStatus(payouts) === "charges_only"
          ? "Verifying"
          : connectStatus(payouts) === "onboarding"
            ? "In progress"
            : "Not set up";

  const statusLabels = statusLabelsFor(
    fulfillmentPathFor(ctx.seller.seller_type),
  );
  const actionable = orders.filter(
    (o) => o.payment_status === "paid" && needsSellerAction(o.fulfillment_status),
  );
  const unread = conversations.filter(conversationUnreadForSeller).length;
  const openRefunds = refunds.filter((r) => refundIsActive(r.status)).length;

  const cards = [
    {
      // payoutCents is null until every counted order carries a recorded fee.
      // Falling back to netCents is honest here because the Earnings page
      // labels which of the two it is showing; this card links straight to it.
      //
      // Never "paid out": nothing has ever paid a seller, and Stripe pays on
      // its own schedule. This is what they have earned.
      label: "Earned",
      value: formatPrice(summary.payoutCents ?? summary.netCents),
      href: "/shop/seller/earnings",
    },
    {
      label: "Orders to fulfill",
      value: String(actionable.length),
      href: "/shop/seller/orders",
    },
    {
      label: "Unread messages",
      value: String(unread),
      href: "/shop/seller/messages",
    },
    {
      label: "Open refund requests",
      value: String(openRefunds),
      href: "/shop/seller/orders#refunds",
    },
    // Listings and Payouts were reachable from the nav and from nowhere on
    // this page, which is the page a seller with zero orders actually looks
    // at. Four cards reading zero and no way forward is not a dashboard.
    {
      label: "Listings",
      value: `${products.filter((p) => p.status === "published").length}/${products.length}`,
      href: "/shop/seller/listings",
    },
    {
      label: "Payouts",
      value: payoutsLabel,
      href: "/shop/seller/payouts",
    },
  ];

  const openStep = setupSteps.find((s) => s.key === "open");
  const openStepReady = Boolean(openStep && !openStep.done && !openStep.blockedBy);

  return (
    <div className="pb-16">
      <h1 className="font-display-serif text-heading text-paper">
        Welcome back
        {ctx.store ? (
          <span className="text-paper/60">, {ctx.store.public_name}</span>
        ) : null}
      </h1>

      {/*
        The checklist replaced a panel that said "your store isn't live yet"
        and nothing else. True, and unactionable: it did not say what to do,
        in what order, or why publishing a listing was being refused. It also
        showed the go-live form to every seller from day one, including
        someone with an empty store, so the one button that summons a human
        was the easiest thing on the page to press by mistake.
      */}
      {ctx.store ? <SetupChecklist steps={setupSteps} /> : null}

      {/* The ask, only once the three things it depends on are actually done.
          openStep.blockedBy is set by sellerSetupSteps until then. */}
      {ctx.store && openStepReady ? (
        <div className="mt-4 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            Ready when you are.
          </p>
          <OpenStoreRequest />
        </div>
      ) : null}
      {!ctx.store ? (
        <div className="mt-5 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
          <p className="font-sans text-ui font-semibold text-paper">
            Your store is being prepared.
          </p>
          <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
            Your seller account is active but the storefront hasn&rsquo;t been
            created yet. The Purify team is on it.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link
              href={c.href}
              className="press-card block rounded-lg border border-paper/10 bg-night-soft/60 p-5"
            >
              <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
                {c.label}
              </p>
              <p className="mt-2 font-display-serif text-heading text-paper">
                {c.value}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-label="Orders that need you" className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display-serif text-title text-paper">
            Needs your attention
          </h2>
          <Link
            href="/shop/seller/orders"
            className="font-sans text-detail font-medium text-gold"
          >
            All orders →
          </Link>
        </div>

        {actionable.length === 0 ? (
          <p className="mt-4 font-serif text-body text-paper/65 leading-[1.65]">
            Nothing waiting on you. New paid orders appear here the moment they
            arrive.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {actionable.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/shop/seller/orders/${o.id}`}
                  className="press-card flex items-center justify-between gap-4 rounded-lg border border-paper/10 bg-night-soft/60 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sans text-ui font-semibold text-paper">
                      {o.items.map((i) => i.title).join(", ")}
                    </p>
                    <p className="mt-1 font-sans text-caption text-paper/60">
                      {statusLabels[o.fulfillment_status]} ·{" "}
                      {new Date(o.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 font-sans text-ui font-semibold text-paper">
                    {formatPrice(o.total_cents, o.currency)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
