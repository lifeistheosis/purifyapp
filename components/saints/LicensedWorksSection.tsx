import type { LicensedWork } from "@/lib/saints/licensedWorks";
import { buildAmazonUrl, getAmazonCoverUrl, HAS_AMAZON_TAG } from "@/lib/affiliate/amazon";
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
 * own only where the site may show it, which is a build with an associate
 * tag (lib/affiliate/amazon.ts); everywhere else it is the plate, with the
 * author's icon where the app has one.
 */
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
                iconUrl={authorIcon(w.author)}
                imageUrl={w.coverImageUrl ?? getAmazonCoverUrl(w.amazonAsin)}
                size="sm"
              />
            }
            title={w.title}
            meta={
              <>
                <T k={w.authorRole ? ROLE_LABEL_KEY[w.authorRole] : "saints.workRoleBy"} replacements={{ author: w.author }} />
                {` · ${w.publisher}${w.year ? `, ${w.year}` : ""}`}
              </>
            }
            blurb={w.blurb}
            footer={
              <>
                <a
                  href={buildAmazonUrl(w.amazonAsin)}
                  target="_blank"
                  rel="noopener nofollow sponsored"
                  className="hit-44 font-sans text-detail font-semibold text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
                >
                  <T k="saints.buyOnAmazon" />
                </a>
                {w.directPublisherUrl ? (
                  <a
                    href={w.directPublisherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hit-44 font-sans text-detail text-paper/60 underline decoration-paper/20 underline-offset-4 hover:text-paper"
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
