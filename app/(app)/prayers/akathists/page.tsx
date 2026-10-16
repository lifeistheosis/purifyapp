import Link from "next/link";

import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ArtPlate } from "@/components/prayers/ArtPlate";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { akathistTitleKey, listAkathists } from "@/lib/prayers/akathists";

export const metadata = {
  title: "Akathists",
  description:
    "The Akathists, long-form hymns of praise that stand in their own genre. The Akathist to the Theotokos is the original; others follow.",
};

// The Akathists (1.7): a calm phone page, each akathist a row with its icon
// on the dark plate, its name in the reader's language and its length. Its
// own bar takes the name once the heading has scrolled away.
export default function AkathistsPage() {
  const items = listAkathists();
  return (
    <>
      <MobileTopBar titleKey="prayers.akathists" back backFallback="/prayers" revealTitleOn="akathists-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="akathists-title">
        <div className="mx-auto w-full max-w-[640px]">
          <header>
            <h1 id="akathists-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
              <T k="prayers.akathists" />
            </h1>
            <p className="mt-4 max-w-[60ch] font-sans text-ui leading-[1.65] text-paper/70">
              <T k="prayers.akathists.intro" />
            </p>
          </header>

          <ul className="mt-8 divide-y divide-paper/10 border-y border-paper/10">
            {items.map((a) => (
              <li key={a.slug}>
                <Link href={`/prayers/akathists/${a.slug}`} className="press-card flex items-center gap-4 py-4">
                  <ArtPlate id={`akathist-${a.slug}`} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-serif text-lede font-semibold leading-tight text-paper">
                      <T k={akathistTitleKey(a.slug)} />
                    </span>
                    <span className="mt-1 font-sans text-caption text-paper/55">
                      <T k="prayers.reader.aboutMin" replacements={{ min: a.estimatedMinutes }} />
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-paper/35 rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-10 font-sans text-caption leading-[1.7] text-paper/50">
            <T k="prayers.akathists.note" />
          </p>
        </div>
      </section>
    </>
  );
}
