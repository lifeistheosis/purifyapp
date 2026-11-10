import Link from "next/link";

import { T } from "@/components/i18n/T";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";
import { websiteHref } from "@/lib/nav/websiteHref";

import { LegalContents } from "./LegalContents";
import { LEGAL_A, LEGAL_H1, LEGAL_H2, LEGAL_LEAD, LEGAL_P } from "./legalStyle";

// EIKON's shipping and returns policy, from its heading to its end: one text,
// drawn by the page (app/(app)/shop/policies/page.tsx) and by the sheet the
// checkout opens where it says you agree to it (components/legal/
// LegalSheet.tsx; build 90 note 1, his yes of 2026-11-10). Moved here word for
// word from the page, so the two can never say different things.

// The look is the three legal texts' shared one (./legalStyle.ts, 1.9).
const H2 = LEGAL_H2;
const P = LEGAL_P;
const A = LEGAL_A;


export function ShopPoliciesText() {
  return (
    <>
        <h1 className={LEGAL_H1}>
          <T k="shop.howWeShipAndHow" />
        </h1>
        <p className={LEGAL_LEAD}>
          <T k="shop.effectiveJuly172026This" />{" "}
          <Link href="/terms" className={A}>
            <T k="ui.termsOfServiceX" />
          </Link>{" "}
          <T k="shop.andAppliesToEveryEikon" />
        </p>
        {/* The text's own headings, folded, as a way through it (./LegalContents.tsx). */}
        <LegalContents />

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
