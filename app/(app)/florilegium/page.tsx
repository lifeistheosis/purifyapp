import { FlorilegiumGate } from "@/components/florilegium/FlorilegiumGate";
import { FLOR_H1, FLOR_KICKER } from "@/components/florilegium/florStyle";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { Flower } from "@/components/ui/icons/Flower";

export const metadata = {
  title: "Florilegium",
  description:
    "Your own gatherings: collections of the verses and patristic lines that strike you, each with a note of your own. Kept on your device; synced with Purify Plus.",
};

/*
 * The Florilegium's first page (1.9, build 89 note 12, the owner: "I also
 * want the Florilegium, like entire design revamped. I just don't like
 * that"), redrawn as one piece with a gathering and a starter's page
 * (docs/1.9-build/notes/florilegium-fable.md).
 *
 * It opened on a small label over a giant sentence over a long paragraph.
 * The head is now the house's: the flower, lit, beside the page's name in
 * Lora with its one small line, then what a florilegium is, in a line. The
 * long paragraph, the same words, closes the page in small type, as the
 * councils' page and Theology's four close.
 *
 * On a phone it wears the bar every screen under You wears from 1.8 (it is
 * the first row of Saved): the way back, and the Florilegium's name once the
 * heading has gone up under it.
 *
 * A gathering is a page of its own, in the apps too (lib/florilegium/
 * href.ts), so opening one is a page switch and moves as one (build 89
 * note 4).
 */
export default function FlorilegiumPage() {
  return (
    <>
      <MobileTopBar titleKey="study.florilegium.title" back backFallback="/saved" revealTitleOn="florilegium-title" />
      <section data-florilegium-page="hub" className="bg-night px-5 pb-12 pt-6 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[640px]">
          <header data-florilegium-head="">
            <div className="flex items-center gap-3.5">
              <span aria-hidden className="theology-glyph shrink-0 text-paper">
                <Flower size={32} />
              </span>
              <div className="min-w-0">
                <h1 id="florilegium-title" className={FLOR_H1}>
                  <T k="study.florilegium.title" />
                </h1>
                <p className={FLOR_KICKER}>
                  <T k="study.florilegium.lead" />
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-[58ch] font-serif text-[15px] italic leading-[1.5] text-paper/70">
              <T k="study.florilegium.definition" />
            </p>
          </header>

          <FlorilegiumGate />

          <p data-florilegium-note="" className="mt-10 border-t border-paper/8 pt-5 font-sans text-detail leading-[1.6] text-paper/55">
            <T k="study.keepTheLinesThatStrike" />
          </p>
        </div>
      </section>
    </>
  );
}
