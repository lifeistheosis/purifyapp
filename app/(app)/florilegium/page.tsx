import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Florilegium",
  description:
    "Your own gatherings: collections of the verses and patristic lines that strike you, each with a note of your own. Kept on your device; synced with Purify Plus.",
};

export default function FlorilegiumPage() {
  return (
    <section className="px-5 md:px-8 py-16 md:py-24 bg-night min-h-[calc(100dvh-72px)]">
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          <T k="study.florilegium.title" />
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          <T k="study.florilegium.lead" />
        </h1>
        <p className="mt-6 font-serif text-lede text-paper/80 leading-[1.7] max-w-[620px]">
          <T k="study.keepTheLinesThatStrike" />
        </p>

        <FlorilegiumGate />
      </article>
    </section>
  );
}
