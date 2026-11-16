import { notFound } from "next/navigation";

import { PlanClient } from "@/components/plans/PlanClient";
import { PlanHead } from "@/components/plans/PlanHead";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { dayMinutes } from "@/lib/plans/minutes";
import { READING_PLANS, getPlan } from "@/lib/plans/plans";
import { planWords } from "@/lib/plans/words";

type Params = Promise<{ id: string }>;

// Every plan is known at build time, so the native export has each page.
export const dynamicParams = false;

export function generateStaticParams() {
  return READING_PLANS.map((p) => ({ id: p.id }));
}

export const metadata = { title: "Reading plan" };

/* One reading plan (1.7, the owner's note 22): the phone's bar, which goes up
   to the plans, then the plan's picture with its name over its foot
   (components/plans/PlanHead.tsx; 1.9, build 97 note 7, the fifteen screens'
   round 3), under the bar, which starts clear over it, then the client's
   line of what the plan is, day card, finish and path
   (components/plans/PlanClient.tsx). Each day's minutes are
   counted here at build (lib/plans/minutes.ts) and handed over as numbers,
   and the plan's own words go with them (lib/plans/words.ts), so the day's
   card is whole in the page's first frame (the owner's note 42 of build 80). */
export default async function PlanPage({ params }: { params: Params }) {
  const { id } = await params;
  const plan = getPlan(id);
  if (!plan) notFound();
  return (
    <>
      <MobileTopBar titleKey={`plans.${id}.name`} back backFallback="/plans" revealTitleOn="plan-title" overlay />
      <section className="min-h-screen bg-night px-5 md:px-8 md:pt-14" aria-labelledby="plan-title">
        <div className="mx-auto w-full max-w-[760px]">
          <PlanHead id={id} />
          <PlanClient id={id} minutes={dayMinutes(plan)} words={planWords(id)} />
        </div>
      </section>
    </>
  );
}
