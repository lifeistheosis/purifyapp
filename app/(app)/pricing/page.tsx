import { PricingTable } from "@/components/marketing/PricingTable";

export const metadata = { title: "Pricing - Purify" };

export default function PricingPage() {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1100px] w-full">
        <div className="text-center mb-12">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
            Pricing
          </p>
          <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
            Free, forever. Paid, optional.
          </h1>
          <p className="font-sans text-[17px] text-paper/70 mt-5 max-w-[640px] mx-auto">
            Almost everything is free. Paid tier removes ads and unlocks personal plans + marketplace tools.
          </p>
        </div>
        <PricingTable />
      </div>
    </section>
  );
}
