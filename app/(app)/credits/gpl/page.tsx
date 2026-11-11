import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ALMEIDA_COPY, gplParagraphs } from "@/lib/credits/gpl";

export const metadata = {
  title: "The GNU General Public License",
  description:
    "The licence of the transcription Purify's Portuguese Bible (Almeida, 1911) is read from, in full, and where Purify's converted copy can be had.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";
const LINK = "inline-flex min-h-11 items-center break-all underline underline-offset-2 decoration-paper/30 hover:text-paper hover:decoration-paper";

/**
 * The GNU General Public License, version 3, in its own words, and where
 * Purify's converted copy of the Almeida and its scripts are (lib/credits/
 * gpl.ts). Linked from the Almeida's line under each chapter
 * (components/bible/ChapterScreen.tsx). Static, with nothing read on the
 * server at request time, so the apps carry it whole and it reads with no
 * signal. The page's own words follow the reader's language; the licence is
 * in English, the only text of it the Free Software Foundation makes
 * official.
 */
export default function GplPage() {
  const paragraphs = gplParagraphs();
  return (
    <>
      <MobileTopBar titleKey="credits.gpl.title" back />
      <section className={`${SECTION} bg-night`}>
        <article className="mx-auto w-full max-w-[760px]">
          <h1 className="font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display">
            <T k="credits.gpl.title" />
          </h1>
          <p className="mt-6 font-serif text-body leading-[1.7] text-paper/75">
            <T k="credits.gpl.intro" />
          </p>
          <p className="mt-4 font-serif text-body leading-[1.7] text-paper/75">
            <T k="credits.gpl.copy" />
          </p>
          <ul className="mt-2 space-y-1 font-sans text-detail text-paper/75" lang="en" dir="ltr">
            <li>
              <a href={ALMEIDA_COPY.files} target="_blank" rel="noopener noreferrer" className={LINK} data-gpl-copy="files">
                {ALMEIDA_COPY.files.replace("https://", "")}
              </a>
            </li>
            <li>
              <a href={ALMEIDA_COPY.scripts} target="_blank" rel="noopener noreferrer" className={LINK} data-gpl-copy="scripts">
                {ALMEIDA_COPY.scripts.replace("https://", "")}
              </a>
            </li>
          </ul>
          <div lang="en" dir="ltr" data-gpl-text="" className="mt-12 space-y-4 font-serif text-detail leading-[1.7] text-paper/80">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
