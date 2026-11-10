import { LegalPage } from "@/components/legal/LegalPage";
import { ShopPoliciesText } from "@/components/legal/ShopPoliciesText";

export const metadata = {
  title: "Shipping & Returns | EIKON",
  description:
    "How EIKON ships, our dispatch windows, returns and refunds, cancellations, and product-safety guidance.",
};

/**
 * EIKON's shipping and returns: the text (components/legal/
 * ShopPoliciesText.tsx, which the checkout's sheet draws too) in the frame
 * the three legal pages share (components/legal/LegalPage.tsx; 1.9). It
 * stands under the shop's own tabs, so it takes no bar of its own.
 */
export default function ShopPoliciesPage() {
  return (
    <LegalPage doc="shop-policies">
      <ShopPoliciesText />
    </LegalPage>
  );
}
