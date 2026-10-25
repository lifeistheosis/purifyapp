import Link from "next/link";

import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { STRUGGLES } from "@/lib/fathers/struggles";
import { STRUGGLE_BLURB, STRUGGLE_TITLE } from "@/lib/fathers/struggleWords";

export const metadata = {
  title: "The Fathers on everyday struggles",
  description:
    "Anxiety, anger, grief, temptation, loneliness, despondency, pride and forgiving others, in the Church Fathers' own words, each with where it stands.",
};

/** The Fathers on everyday struggles (1.8): each struggle a door to its passages. */
export default function StrugglesPage() {
  return (
    <>
      <MobileTopBar titleKey="struggles.title" back backFallback="/reading" revealTitleOn="struggles-title" />
      <section className="bg-night px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[820px]">
          <h1
            id="struggles-title"
            className="font-serif text-display-sm font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display"
          >
            <T k="struggles.title" />
          </h1>
          <p className="mt-5 max-w-[60ch] font-serif text-body leading-[1.75] text-paper/80">
            <T k="struggles.intro" />
          </p>
          <ul className="mt-8 divide-y divide-paper/[0.07]">
            {STRUGGLES.map((s) => (
              <li key={s}>
                <Link href={`/fathers-on/${s}`} className="group block py-5">
                  <span className="block font-serif text-title-sm font-semibold leading-tight text-paper group-hover:underline">
                    <T k={STRUGGLE_TITLE[s]} />
                  </span>
                  <span className="mt-1 block font-sans text-caption text-paper/55">
                    <T k={STRUGGLE_BLURB[s]} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
