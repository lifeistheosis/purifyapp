import { notFound } from "next/navigation";

import { PlanClient } from "@/components/plans/PlanClient";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { dayMinutes } from "@/lib/plans/minutes";
import { READING_PLANS, getPlan } from "@/lib/plans/plans";

type Params = Promise<{ id: string }>;

// Every plan is known at build time, so the native export has each page.
export const dynamicParams = false;

export function generateStaticParams() {
  return READING_PLANS.map((p) => ({ id: p.id }));
}

export const metadata = { title: "Reading plan" };

/* One reading plan (1.7, the owner's note 22): the phone's bar, which goes up
   to the plans, the plan's name and what it is, then the client's day card,
   finish and path (components/plans/PlanClient.tsx). Each day's minutes are
   counted here at build (lib/plans/minutes.ts) and handed over as numbers. */
export default async function PlanPage({ params }: { params: Params }) {
  const { id } = await params;
  const plan = getPlan(id);
  if (!plan) notFound();
  return (
    <>
      <MobileTopBar titleKey={`plans.${id}.name`} back="/plans" revealTitleOn="plan-title" />
      <section className="min-h-screen bg-night px-5 pt-8 md:px-8 md:pt-14" aria-labelledby="plan-title">
        <div className="mx-auto w-full max-w-[760px]">
          <header>
            <h1 id="plan-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
              <T k={`plans.${id}.name`} />
            </h1>
            <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.6] text-paper/55">
              <T k={`plans.${id}.body`} />
            </p>
          </header>
          <PlanClient id={id} minutes={dayMinutes(plan)} />
        </div>
      </section>
    </>
  );
}
