import { PlansClient } from "@/components/plans/PlansClient";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Reading plans",
  description:
    "The Psalter by kathisma, the four Gospels a chapter a day, Proverbs in a month: reading plans with your streak kept. A Purify Plus tool.",
};

/* Reading plans (lib/plans/plans.ts): a server shell and a client list that
   reads the reader's progress on the device. */
export default function PlansPage() {
  return (
    <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] px-5 py-12 md:px-8 md:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
        }}
      />
      <article className="relative mx-auto w-full max-w-[1120px]">
        <h1 className="text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm">
          <T k="plans.title" />
        </h1>
        <p className="mt-4 max-w-[620px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
          <T k="plans.lede" />
        </p>
        <PlansClient />
      </article>
    </section>
  );
}
