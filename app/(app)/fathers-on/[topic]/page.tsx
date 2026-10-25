import { notFound } from "next/navigation";

import { SourceLine } from "@/components/citations/SourceLine";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { STRUGGLES, isStruggle, strugglePassages } from "@/lib/fathers/struggles";
import { STRUGGLE_BLURB, STRUGGLE_TITLE } from "@/lib/fathers/struggleWords";

type Params = Promise<{ topic: string }>;

export function generateStaticParams() {
  return STRUGGLES.map((topic) => ({ topic }));
}

export const metadata = {
  title: "The Fathers on everyday struggles",
  description: "What the Church Fathers wrote on a struggle every Christian meets, in their own words, each with where it stands.",
};

/** One struggle (1.8): the Fathers' passages, each with the line that opens it where it stands. */
export default async function StrugglePage({ params }: { params: Params }) {
  const { topic } = await params;
  if (!isStruggle(topic)) notFound();
  const passages = strugglePassages(topic);
  return (
    <>
      <MobileTopBar titleKey={STRUGGLE_TITLE[topic]} back backFallback="/fathers-on" revealTitleOn="struggle-title" />
      <section className="bg-night px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[820px]">
          <h1
            id="struggle-title"
            className="font-serif text-display-sm font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display"
          >
            <T k={STRUGGLE_TITLE[topic]} />
          </h1>
          <p className="mt-4 font-sans text-ui text-paper/60">
            <T k={STRUGGLE_BLURB[topic]} />
          </p>
          <ol className="mt-8 divide-y divide-paper/[0.07]">
            {passages.map((p) => (
              <li key={p.shown.href} data-struggle-passage="" className="py-6">
                <blockquote lang="en" className="max-w-[62ch] font-serif text-body leading-[1.75] text-paper/90">
                  {p.text}
                </blockquote>
                <SourceLine cite={p.shown} className="mt-3" />
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-[60ch] font-sans text-caption leading-[1.6] text-paper/45">
            <T k="struggles.note" />
          </p>
        </div>
      </section>
    </>
  );
}
