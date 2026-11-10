import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { CC_LICENCES, photoCredits } from "@/lib/credits/photos";

export const metadata = {
  title: "Photo credits",
  description:
    "The photographers whose Creative Commons photographs some of Purify's pictures are made from, each named with the licence and the photograph's page.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";
const LINK = "hit-44 underline underline-offset-2 decoration-paper/30 hover:text-paper hover:decoration-paper";

/**
 * Photo credits (1.9, the owner's yes to his page's 99: "CC BY and CC BY-SA
 * photographs are now allowed, each photographer named on a credits page").
 * Every picture made from such a photograph is a row, read from the pictures'
 * own registries (lib/credits/photos.ts): the work photographed, the
 * photographer as the file's page names them, the licence with its deed, the
 * photograph's page, and what Purify changed. The
 * page's own words follow the reader's language (components/i18n/T.tsx); a
 * row is in the words of the file's page. Static, with nothing read on the
 * server, so the apps carry it whole. The About page leads here once there is
 * a row to show.
 */
export default function CreditsPage() {
  const credits = photoCredits();
  return (
    <>
      <MobileTopBar titleKey="credits.title" back />
      <section className={`${SECTION} bg-night`}>
        <article className="mx-auto w-full max-w-[760px]">
          <h1 className="font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display">
            <T k="credits.title" />
          </h1>
          <p className="mt-6 font-serif text-body leading-[1.7] text-paper/75">
            <T k="credits.intro" />
          </p>
          {credits.length === 0 ? (
            <p className="mt-10 font-sans text-ui text-paper/70">
              <T k="credits.none" />
            </p>
          ) : (
            <ul className="mt-10 space-y-8">
              {credits.map((c) => (
                <li key={c.file} data-credit={c.file}>
                  <p lang="en" dir="ltr" className="font-serif text-body leading-[1.6] text-paper">
                    {c.work}
                  </p>
                  <p className="mt-1.5 font-sans text-ui text-paper/80">
                    <T k="credits.by" replacements={{ name: c.photographer }} />
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-detail text-paper/70">
                    <a href={CC_LICENCES[c.licence]} target="_blank" rel="noopener noreferrer license" className={LINK}>
                      {c.licence}
                    </a>
                    <a href={c.source} target="_blank" rel="noopener noreferrer" className={LINK}>
                      <T k="credits.source" />
                    </a>
                    <span>
                      <T k="credits.cropped" />
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
