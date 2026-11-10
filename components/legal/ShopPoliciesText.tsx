import Link from "next/link";

import { T } from "@/components/i18n/T";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";
import { websiteHref } from "@/lib/nav/websiteHref";

// EIKON's shipping and returns policy, from its heading to its end: one text,
// drawn by the page (app/(app)/shop/policies/page.tsx) and by the sheet the
// checkout opens where it says you agree to it (components/legal/
// LegalSheet.tsx; build 90 note 1, his yes of 2026-11-10). Moved here word for
// word from the page, so the two can never say different things.

const H2 =
  "mt-12 font-sans text-title-sm md:text-title font-bold text-paper leading-[1.15]";
const P = "mt-4 font-serif text-body text-paper/85 leading-[1.7]";
const A =
  "text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper";


export function ShopPoliciesText() {
  return (
    <>
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

        {/* An order's Returns tile lands here (components/shop/OrderDetailClient.tsx). */}
        <h2 id="returns" className={`${H2} scroll-mt-28`}><T k="shop.returns" /></h2>
        <p className={P}>
          <T k="shop.standardStockedItemsMayBe" />{" "}
          <Link href={websiteHref("/support/contact")} className={A}>
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
          <Link href={websiteHref("/support/contact")} className={A}>
            <T k="shop.support" />
          </Link>{" "}
          <T k="shop.orAt" />{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={A}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
    </>
  );
}
