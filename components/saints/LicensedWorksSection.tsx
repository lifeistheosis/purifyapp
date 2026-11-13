import type { LicensedWork } from "@/lib/saints/licensedWorks";
import { buildAmazonUrl, HAS_AMAZON_TAG } from "@/lib/affiliate/amazon";
import { authorIcon } from "@/lib/saints/icons";
import { CoverListRow } from "@/components/covers/CoverListRow";
import { WorkCover } from "@/components/covers/WorkCover";
import { T } from "@/components/i18n/T";

const ROLE_LABEL_KEY: Record<NonNullable<LicensedWork["authorRole"]>, string> = {
  by: "saints.workRoleBy",
  about: "saints.workRoleAbout",
  edited: "saints.workRoleEdited",
  translated: "saints.workRoleTranslated",
};

/**
 * Books in print: the saint's works and books about him that are under
 * copyright, so Purify cannot host them, with a way to buy each (1.7: the
 * same cover rows as his works, components/covers/). A book's cover is its
 * own only where we hold one (`coverImageUrl`, a path on our own site);
 * everywhere else it is the plate, with the author's icon where the app has
 * one. Never Amazon's: a picture from Amazon made a reader's device call
 * Amazon as the page opened (143, lib/affiliate/amazon.ts). Amazon is reached
 * only when a reader taps the link to buy.
 */
/** The publisher and the year, as the record writes them, in English. */
function publishedBy(w: { publisher: string; year?: number | string | null }): string {
  return `${w.publisher}${w.year ? `, ${w.year}` : ""}`;
}

export function LicensedWorksSection({ works }: { works: LicensedWork[] }) {
  if (works.length === 0) return null;

  return (
    <section aria-labelledby="saint-books-in-print">
      <h2 id="saint-books-in-print" className="text-title-sm leading-tight text-paper">
        <T k="saints.booksInPrint" />
      </h2>
      {/* The earnings sentence is an affirmative claim, so it renders only
          where it is true: a build with an associate tag, which is the
          website and never a store binary. */}
      <p className="mt-2 max-w-[640px] font-sans text-detail leading-relaxed text-paper/55">
        <T k="saints.affiliateDisclosure" />
        {HAS_AMAZON_TAG ? (
          <>
            {" "}
            <T k="saints.affiliateEarnings" />
          </>
        ) : null}
      </p>

      <ul className="mt-2 divide-y divide-paper/8">
        {works.map((w) => (
          <CoverListRow
            key={w.slug}
            cover={
              <WorkCover
                title={w.title}
                author={w.author}
                // A book names a Father as the record does ("John Chrysostom"),
                // the icons as the commentary does ("St. John Chrysostom").
                iconUrl={authorIcon(w.author) ?? authorIcon(`St. ${w.author}`)}
                imageUrl={w.coverImageUrl}
                size="sm"
              />
            }
            // The book's title, its publisher and its blurb are English; the
            // role before the author is the reader's (build 90 note 4).
            title={
              <>
                <span lang="en" dir="ltr">{w.title}</span>
                {/* Another title it is known by, in its own English (1.9, note 29). */}
                {w.alsoKnownAs ? (
                  <span data-also-known-as="" className="mt-0.5 block font-sans text-detail font-normal text-paper/70">
                    <T k="saints.alsoKnownAs" replacements={{ title: w.alsoKnownAs }} />
                  </span>
                ) : null}
              </>
            }
            meta={
              <>
                <T k={w.authorRole ? ROLE_LABEL_KEY[w.authorRole] : "saints.workRoleBy"} replacements={{ author: w.author }} />
                {" · "}
                <span lang="en" dir="ltr">{publishedBy(w)}</span>
              </>
            }
            blurb={w.blurb ? <span lang="en" dir="ltr">{w.blurb}</span> : undefined}
            footer={
              <>
                {/* Amazon only where the record names the book there; a book
                    listed for study has its publisher's page alone (1.9,
                    build 95 note 29). */}
                {w.amazonAsin ? (
                  <a
                    href={buildAmazonUrl(w.amazonAsin)}
                    target="_blank"
                    rel="noopener nofollow sponsored"
                    className="hit-44 font-sans text-detail font-semibold text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
                  >
                    <T k="saints.buyOnAmazon" />
                  </a>
                ) : null}
                {w.directPublisherUrl ? (
                  <a
                    href={w.directPublisherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      w.amazonAsin
                        ? "hit-44 font-sans text-detail text-paper/60 underline decoration-paper/20 underline-offset-4 hover:text-paper"
                        : "hit-44 font-sans text-detail font-semibold text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
                    }
                  >
                    <T k="saints.buyDirectFrom" /> {w.publisher}
                  </a>
                ) : null}
              </>
            }
          />
        ))}
      </ul>
    </section>
  );
}
