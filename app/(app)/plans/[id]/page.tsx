import { notFound } from "next/navigation";

import { PlanClient } from "@/components/plans/PlanClient";
import { T } from "@/components/i18n/T";
import { READING_PLANS, getPlan } from "@/lib/plans/plans";

type Params = Promise<{ id: string }>;

// Every plan is known at build time, so the native export has each page.
export const dynamicParams = false;

export function generateStaticParams() {
  return READING_PLANS.map((p) => ({ id: p.id }));
}

export const metadata = { title: "Reading plan" };

export default async function PlanPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!getPlan(id)) notFound();
  return (
    <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] px-5 py-12 md:px-8 md:py-16">
      <article className="relative mx-auto w-full max-w-[760px]">
        <h1 className="text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm">
          <T k={`plans.${id}.name`} />
        </h1>
        <p className="mt-4 max-w-[600px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
          <T k={`plans.${id}.body`} />
        </p>
        <PlanClient id={id} />
      </article>
    </section>
  );
}
