import { PlansClient } from "@/components/plans/PlansClient";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { usualMinutes } from "@/lib/plans/minutes";
import { READING_PLANS } from "@/lib/plans/plans";

export const metadata = {
  title: "Reading plans",
  description:
    "The Psalter by kathisma, the four Gospels a chapter a day, Proverbs in a month: reading plans with your streak kept. A Purify Plus tool.",
};

/* Reading plans (lib/plans/plans.ts): a server shell with the phone's bar and
   each plan's usual minutes a day, counted at build (lib/plans/minutes.ts),
   and a client list that reads the reader's progress on the device. 1.7, the
   owner's note 22: rows, the plans begun first, no gold. */
export default function PlansPage() {
  const minutes = Object.fromEntries(READING_PLANS.map((p) => [p.id, usualMinutes(p)]));
  return (
    <>
      <MobileTopBar titleKey="plans.title" back backFallback="/bible" revealTitleOn="plans-title" />
      <section className="min-h-screen bg-night px-5 pt-8 md:px-8 md:pt-14" aria-labelledby="plans-title">
        <div className="mx-auto w-full max-w-[760px]">
          <header>
            <h1 id="plans-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
              <T k="plans.title" />
            </h1>
            <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.6] text-paper/55">
              <T k="plans.lede" />
            </p>
          </header>
          <PlansClient minutes={minutes} />
        </div>
      </section>
    </>
  );
}
