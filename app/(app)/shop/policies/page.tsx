import Link from "next/link";

export const metadata = {
  title: "Shipping & Returns — EIKON",
  description:
    "How EIKON ships, our dispatch windows, returns and refunds, cancellations, and product-safety guidance.",
};

const H2 =
  "mt-12 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]";
const P = "mt-4 font-serif text-body text-paper/85 leading-[1.7]";
const A =
  "text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper";

export default function ShopPoliciesPage() {
  return (
    <section className="bg-night px-5 py-16 md:px-8 md:py-24">
      <article className="mx-auto w-full max-w-[760px]">
        <p className="mb-4 font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
          EIKON · Shipping &amp; Returns
        </p>
        <h1 className="font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display">
          How we ship, and how returns work.
        </h1>
        <p className="mt-6 font-serif text-body leading-[1.7] text-paper/65">
          Effective July 7, 2026. This page is part of the{" "}
          <Link href="/terms" className={A}>
            Terms of Service
          </Link>{" "}
          and applies to every EIKON order.
        </p>

        <h2 className={H2}>How EIKON fulfills orders</h2>
        <p className={P}>
          EIKON selects, inspects, and ships every item it sells. Many items
          are obtained from selected suppliers, inspected, and repackaged by
          us before they ship, so please read the dispatch window on each
          listing.
        </p>

        <h2 className={H2}>Shipping and dispatch</h2>
        <p className={P}>
          We ship within the United States only. Standard shipping is
          charged at the flat rate shown at checkout, and is free on every
          order while you hold an active Purify Plus subscription. Each
          listing shows an estimated dispatch window; because most items are
          sourced and inspected before shipping, dispatch commonly takes one
          to three weeks, and delivery time after dispatch depends on the
          carrier. These are good-faith estimates, not guarantees. If we
          cannot dispatch within a materially longer time than estimated, we
          will email you and offer to wait or to cancel for a full refund.
          Risk of loss passes when we hand the package to the carrier.
        </p>

        <h2 className={H2}>Order changes and cancellations</h2>
        <p className={P}>
          Tell us as soon as possible if you need to change or cancel an
          order. We can usually cancel an item that has not yet been sourced
          or shipped and refund it in full. Special-order items may not be
          cancellable once we have placed the supplier order; the listing
          notes when an item is special order.
        </p>

        <h2 className={H2}>Returns</h2>
        <p className={P}>
          Standard stocked items may be returned within 30 days of delivery
          if unused and undamaged and in their original packaging. For
          change-of-mind returns, you pay return shipping. We cover return
          shipping, and replace or refund, when an item arrives incorrect,
          damaged, or materially different from its description. To start a
          return, contact us with your order or confirmation number through{" "}
          <Link href="/support/contact" className={A}>
            support
          </Link>
          .
        </p>

        <h2 className={H2}>Refunds</h2>
        <p className={P}>
          Approved refunds are issued to your original payment method. Once
          we approve a refund it is normally processed within a few business
          days; your bank may take additional time to post it. If an item is
          lost in transit or never arrives, contact us and we will make it
          right.
        </p>

        <h2 className={H2}>Product descriptions and natural variation</h2>
        <p className={P}>
          We describe items honestly and label how each is made. Photographs
          may be representative rather than the exact physical item, and
          natural materials such as wood, print, and resin vary in grain,
          tone, and finish. That variation is part of the object and is not a
          defect.
        </p>

        <h2 className={H2}>Product safety</h2>
        <p className={P}>
          Some items are combustible. Incense, resin, and charcoal produce an
          open flame, heat, embers, and smoke. Use them only on a
          heat-resistant, non-flammable surface with good ventilation; never
          leave them burning unattended; keep them, and all small parts, away
          from children and pets; and let ash and charcoal cool fully before
          disposal. You are responsible for using every product safely and as
          intended.
        </p>

        <h2 className={H2}>Questions</h2>
        <p className={P}>
          Reach us any time through{" "}
          <Link href="/support/contact" className={A}>
            support
          </Link>{" "}
          or at{" "}
          <a href="mailto:support@purifyapp.net" className={A}>
            support@purifyapp.net
          </a>
          .
        </p>
      </article>
    </section>
  );
}
