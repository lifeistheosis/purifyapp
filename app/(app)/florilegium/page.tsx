import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";
import { T } from "@/components/i18n/T";
import { Eyebrow } from "@/components/ui/Graphite";

export const metadata = {
  title: "Florilegium",
  description:
    "Your own gatherings: collections of the verses and patristic lines that strike you, each with a note of your own. Kept on your device; synced with Purify Plus.",
};

/*
 * Redrawn 2026-09-28 at the owner's request, in the language of the Prayer
 * and Discover redesign: the front page's candle glow behind a left-aligned
 * hero, then the gatherings as graphite cards (FlorilegiaHub).
 */
export default function FlorilegiumPage() {
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
        <Eyebrow>
          <T k="study.florilegium.title" />
        </Eyebrow>
        <h1 className="mt-4 text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm lg:text-display">
          <T k="study.florilegium.lead" />
        </h1>
        <p className="mt-5 max-w-[620px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
          <T k="study.keepTheLinesThatStrike" />
        </p>

        <FlorilegiumGate />
      </article>
    </section>
  );
}
