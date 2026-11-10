import { T } from "@/components/i18n/T";
import { ShopPoliciesText } from "@/components/legal/ShopPoliciesText";

export const metadata = {
  title: "Shipping & Returns | EIKON",
  description:
    "How EIKON ships, our dispatch windows, returns and refunds, cancellations, and product-safety guidance.",
};

export default function ShopPoliciesPage() {
  return (
    <section className="bg-night px-5 py-16 md:px-8 md:py-24">
      <article className="mx-auto w-full max-w-[760px]">
        <p className="mb-4 font-sans text-detail font-semibold text-paper/55">
          <T k="shop.eikonShippingReturns" />
        </p>
        <ShopPoliciesText />
      </article>
    </section>
  );
}
