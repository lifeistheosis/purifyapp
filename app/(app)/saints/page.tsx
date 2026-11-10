import { SaintsBrowser } from "@/components/saints/SaintsBrowser";
import { SaintSearch } from "@/components/saints/SaintSearch";
import { Cross } from "@/components/ui/icons/Cross";
import { SaintsGreekLine } from "@/components/saints/SaintsGreekLine";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Saints",
  description:
    "Lives and writings of the Eastern Orthodox saints.",
};

export default function SaintsPage() {
  return (
    // Mobile spent 64px of a 812px screen on empty padding above the
    // eyebrow, so the masthead alone filled the fold and the first saint sat
    // below it. Desktop is unchanged.
    <section className="bg-night px-5 md:px-8 pt-8 pb-12 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full cascade">
        <header className="border-b border-paper/8 pb-7 md:pb-10">
          <div className="mb-5 flex items-center gap-2.5 text-gold">
            <Cross size={18} aria-hidden />
            <p className="font-sans text-detail font-semibold text-paper/55">
              <T k="saints.eyebrow" />
            </p>
          </div>
          {/* 48px was a desktop hero size wearing a phone's clothes. The
              step to `sm` keeps the large treatment everywhere it fits. */}
          <h1 className="font-display-serif text-heading sm:text-display md:text-display-lg text-paper leading-[0.98] tracking-[-0.01em]">
            <T k="saints.h1" />
          </h1>
          {/* The Greek line, for every reader but a Greek one: chosen on the device. */}
          <SaintsGreekLine />
          <p className="mt-5 md:mt-6 max-w-[620px] font-sans text-ui md:text-body text-paper/75 leading-relaxed">
            <T k="saints.indexLead" />
          </p>
        </header>

        <SaintSearch className="mt-8 max-w-[640px]" />

        <SaintsBrowser />
      </div>
    </section>
  );
}
