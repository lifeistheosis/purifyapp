import Link from "next/link";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Shipping & Returns | EIKON",
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
          <T k="shop.eikonShippingReturns" />
        </p>
        <h1 className="font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display">
          <T k="shop.howWeShipAndHow" />
        </h1>
        <p className="mt-6 font-serif text-body leading-[1.7] text-paper/65">
          <T k="shop.effectiveJuly172026This" />{" "}
          <Link href="/terms" className={A}>
            <T k="ui.termsOfServiceX" />
          </Link>{" "}
          <T k="shop.andAppliesToEveryEikon" />
        </p>

        <h2 className={H2}><T k="shop.howEikonFulfillsOrders" /></h2>
        <p className={P}>
          <T k="shop.eikonSelectsInspectsAndShips" />
        </p>

        <h2 className={H2}><T k="shop.shippingAndDispatch" /></h2>
        <p className={P}>
          <T k="shop.weShipWithinTheUnited" />
        </p>

        <h2 className={H2}><T k="shop.orderChangesAndCancellations" /></h2>
        <p className={P}>
          <T k="shop.tellUsAsSoonAs" />
        </p>

        <h2 className={H2}><T k="shop.returns" /></h2>
        <p className={P}>
          <T k="shop.standardStockedItemsMayBe" />{" "}
          <Link href="/support/contact" className={A}>
            <T k="shop.support" />
          </Link>
          .
        </p>

        <h2 className={H2}><T k="shop.refunds" /></h2>
        <p className={P}>
          <T k="shop.approvedRefundsAreIssuedTo" />
        </p>

        <h2 className={H2}><T k="shop.productDescriptionsAndNaturalVariation" /></h2>
        <p className={P}>
          <T k="shop.weDescribeItemsHonestlyAnd" />
        </p>

        <h2 className={H2}><T k="shop.productSafety" /></h2>
        <p className={P}>
          <T k="shop.someItemsAreCombustibleIncense" />
        </p>

        <h2 className={H2}><T k="shop.questions" /></h2>
        <p className={P}>
          <T k="shop.reachUsAnyTimeThrough" />{" "}
          <Link href="/support/contact" className={A}>
            <T k="shop.support" />
          </Link>{" "}
          <T k="shop.orAt" />{" "}
          <a href="mailto:support@purifyapp.net" className={A}>
            <T k="shop.supportPurifyappNet" />
          </a>
          .
        </p>
      </article>
    </section>
  );
}
